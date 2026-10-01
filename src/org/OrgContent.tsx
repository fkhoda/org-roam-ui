import 'katex/dist/katex.css'
import type { Components } from 'hast-util-to-jsx-runtime'
import { useMemo, type ReactNode } from 'react'
import * as runtime from 'react/jsx-runtime'
import rehypeKatex from 'rehype-katex'
import rehypeReact from 'rehype-react'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import remarkSectionize from 'remark-sectionize'
import remarkWikiLink from 'remark-wiki-link'
import { unified } from 'unified'
import uniorgAttach from 'uniorg-attach'
import extractKeywords from 'uniorg-extract-keywords'
import uniorgParse from 'uniorg-parse'
import uniorg2rehype from 'uniorg-rehype'
import uniorgSlug from 'uniorg-slug'
import type { OrgRoamNode } from '../api'
import { linkEnds } from '../graph/links'
import { OrgImage } from '../components/Sidebar/OrgImage'
import { PreviewLink } from '../components/Sidebar/Link'
import { usePreview } from '../components/Sidebar/PreviewContext'
import { Section } from '../components/Sidebar/Section'
import { orgLineBreaks, unwrapBareSubSuperscript } from './plugins'

export interface OrgContentProps {
  /** the note's org (or markdown) text */
  text: string
  node: OrgRoamNode
}

/** A note's text rendered as React elements, with links that preview and navigate. */
export default function OrgContent({ text, node }: OrgContentProps) {
  const { linksByNodeId, nodeById, macros, attachDir, useInheritance } = usePreview()
  const isMarkdown = node.file?.endsWith('.md')

  const processor = useMemo(() => {
    let base
    if (isMarkdown) {
      // [[Title]] wiki links resolve against the notes this one links to
      const linked = (linksByNodeId[node.id] ?? []).flatMap((link) =>
        linkEnds(link).filter((id) => id !== node.id),
      )
      base = unified()
        .use(remarkParse)
        .use(remarkFrontmatter, ['yaml'])
        .use(remarkWikiLink, {
          permalinks: linked,
          pageResolver: (title: string) => [
            linked.find((id) => nodeById[id]?.title === title) ?? '',
          ],
          hrefTemplate: (id: string) => `id:${id}`,
        })
        .use(remarkSectionize)
        .use(remarkMath)
        .use(remarkGfm)
        .use(remarkRehype)
    } else {
      base = unified()
        .use(uniorgParse)
        .use(unwrapBareSubSuperscript)
        .use(extractKeywords)
        .use(uniorgAttach, { idDir: attachDir || undefined, useInheritance })
        .use(uniorgSlug)
        .use(uniorg2rehype, { useSections: true })
        .use(orgLineBreaks)
    }
    const components: Components = {
      a: ({ children, href }) => (
        <PreviewLink href={href ?? ''} isWiki={isMarkdown}>
          {children}
        </PreviewLink>
      ),
      img: ({ src }) => <OrgImage src={String(src ?? '')} file={node.file} />,
      section: ({ children, className }) => {
        // a heading node's own section: show its contents without repeating its heading
        const level = /section-level-(\d+)/.exec(className ?? '')?.[1]
        if (level && Number(level) === node.level) {
          return <div>{(children as ReactNode[]).slice(1)}</div>
        }
        return <Section className={className}>{children}</Section>
      },
      p: ({ children }) => <p lang="en">{children}</p>,
    }
    return base
      .use(rehypeKatex, {
        trust: (context: { command: string }) => ['\\htmlId', '\\href'].includes(context.command),
        macros: {
          '\\eqref': '\\href{###1}{(\\text{#1})}',
          '\\ref': '\\href{###1}{\\text{#1}}',
          '\\label': '\\htmlId{#1}{}',
          ...macros,
        },
      })
      .use(rehypeReact, {
        ...runtime,
        components,
      })
  }, [isMarkdown, node, linksByNodeId, nodeById, macros, attachDir, useInheritance])

  return useMemo(() => processor.processSync(text).result, [processor, text])
}
