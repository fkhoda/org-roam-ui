import unified from 'unified'
//import createStream from 'unified-stream'
import uniorgParse from 'uniorg-parse'
import uniorg2rehype from 'uniorg-rehype'
import uniorgSlug from 'uniorg-slug'
import extractKeywords from 'uniorg-extract-keywords'
import attachments from 'uniorg-attach'
import visit from 'unist-util-visit'
import orgToString from 'orgast-util-to-string'
// rehypeHighlight does not have any types
// add error thing here
// import highlight from 'rehype-highlight'
import katex from 'rehype-katex'
import 'katex/dist/katex.css'
import rehype2react from 'rehype-react'

import remarkParse from 'remark-parse'
import remarkGFM from 'remark-gfm'
// remark wikilinks does not have any type declarations
//@ts-expect-error
import remarkWikiLinks from 'remark-wiki-link'
import remarkMath from 'remark-math'
import remarkFrontMatter from 'remark-frontmatter'
import remarkExtractFrontMatter from 'remark-extract-frontmatter'
// remark sectionize does not have any type declarations
//@ts-expect-error
import remarkSectionize from 'remark-sectionize'
import remarkRehype from 'remark-rehype'

import { PreviewLink } from '../components/Sidebar/Link'
import { LinksByNodeId, NodeByCite, NodeById } from '../pages'
import React, { createContext, ReactNode, useMemo } from 'react'
import { OrgImage } from '../components/Sidebar/OrgImage'
import { Section } from '../components/Sidebar/Section'
import { NoteContext } from './NoteContext'
import { OrgRoamLink, OrgRoamNode } from '../api'

// @ts-expect-error non-ESM unified means no types
import { toString } from 'hast-util-to-string'
import { Box, chakra } from '@chakra-ui/react'
import { normalizeLinkEnds } from './normalizeLinkEnds'

// uniorg-parse always turns `foo_bar` / `foo^bar` into subscript/superscript
// nodes, matching org's `^:t` export default. That mangles literal
// underscores in IDs, CONSTANT_NAMES, etc. Only treat it as sub/superscript
// when explicitly braced (`foo_{bar}`), matching org's `^:{}` export option.
// Bare markers are unwrapped back into plain literal text.
function unwrapBareSubSuperscript() {
  return (tree: any, file: any) => {
    const src = String(file)
    visit(tree, ['subscript', 'superscript'], (node: any, index: number | null, parent: any) => {
      if (!parent || index == null) return
      const braced = src[node.contentsBegin - 1] === '{'
      if (braced) return
      const marker = node.type === 'subscript' ? '_' : '^'
      parent.children[index] = { type: 'text', value: marker + orgToString(node) }
    })
  }
}

// org's explicit line break (`\\` at end of line, optionally followed by
// trailing spaces) is unimplemented in uniorg-parse/uniorg-rehype — it
// survives as literal backslash text instead of becoming a break. Convert
// it to a real <br> in the hast tree, mirroring ox-html's line-break export.
function orgLineBreaks() {
  return (tree: any) => {
    visit(tree, 'text', (node: any, index: number | null, parent: any) => {
      if (!parent || index == null || !/\\\\[ \t]*\n/.test(node.value)) return
      const parts = node.value.split(/(\\\\[ \t]*\n)/)
      const replacement = parts
        .filter((part: string) => part.length)
        .map((part: string) =>
          /^\\\\[ \t]*\n$/.test(part)
            ? { type: 'element', tagName: 'br', properties: {}, children: [] }
            : { type: 'text', value: part },
        )
      parent.children.splice(index, 1, ...replacement)
      return index + replacement.length
    })
  }
}

export interface ProcessedOrgProps {
  nodeById: NodeById
  previewNode: OrgRoamNode
  setPreviewNode: any
  previewText: any
  nodeByCite: NodeByCite
  setSidebarHighlightedNode: any
  openContextMenu: any
  outline: boolean
  collapse: boolean
  linksByNodeId: LinksByNodeId
  macros: { [key: string]: string } | {}
  attachDir: string
  useInheritance: boolean
}

export const ProcessedOrg = (props: ProcessedOrgProps) => {
  const {
    nodeById,
    setSidebarHighlightedNode,
    setPreviewNode,
    previewText,
    nodeByCite,
    previewNode,
    openContextMenu,
    outline,
    collapse,
    linksByNodeId,
    macros,
    attachDir,
    useInheritance,
  } = props

  if (!previewNode || !linksByNodeId) {
    return null
  }

  const orgProcessor = unified()
    .use(uniorgParse)
    .use(unwrapBareSubSuperscript)
    .use(extractKeywords)
    .use(attachments, {
      idDir: attachDir || undefined,
      useInheritance,
    })
    .use(uniorgSlug)
    .use(uniorg2rehype, { useSections: true })
    .use(orgLineBreaks)

  const nodesInNote =
    linksByNodeId[previewNode?.id!]?.reduce((acc: NodeById, link: OrgRoamLink) => {
      const links = normalizeLinkEnds(link)
      const relevantLink = links.filter((l) => l !== previewNode.id).join('')
      return {
        ...acc,
        [relevantLink]: nodeById[relevantLink],
      }
    }, {}) || {}

  const linkEntries = Object.entries(nodesInNote)
  const wikiLinkResolver = (wikiLink: string): string[] => {
    const entry = linkEntries.find((idNodeArray) => {
      return idNodeArray?.[1]?.title === wikiLink
    })
    const id = entry?.[0] ?? ''
    return [id]
  }

  const wikiLinkProcessor = (wikiLink: string): string => {
    return `id:${wikiLink}`
  }

  const mdProcessor = unified()
    .use(remarkParse)
    .use(remarkFrontMatter, ['yaml'])
    .use(remarkExtractFrontMatter)
    .use(remarkWikiLinks, {
      permaLinks: Object.keys(nodesInNote),
      pageResolver: wikiLinkResolver,
      hrefTemplate: wikiLinkProcessor,
    })
    .use(remarkSectionize)
    .use(remarkMath)
    .use(remarkGFM)
    .use(remarkRehype)
  //.data('settings', { fragment: true })
  // .use(highlight)

  const isMarkdown = previewNode?.file?.slice(-3) === '.md'
  const baseProcessor = isMarkdown ? mdProcessor : orgProcessor

  const processor = useMemo(
    () =>
      baseProcessor
        .use(katex, {
          trust: (context) => ['\\htmlId', '\\href'].includes(context.command),
          macros: {
            '\\eqref': '\\href{###1}{(\\text{#1})}',
            '\\ref': '\\href{###1}{\\text{#1}}',
            '\\label': '\\htmlId{#1}{}',
            // '\\weird': '\\textbf{#1}',
            ...macros,
          },
        })
        .use(rehype2react, {
          createElement: React.createElement,
          // eslint-disable-next-line react/display-name
          components: {
            a: ({ children, href }) => {
              return (
                <PreviewLink
                  nodeByCite={nodeByCite}
                  setSidebarHighlightedNode={setSidebarHighlightedNode}
                  href={`${href as string}`}
                  nodeById={nodeById}
                  linksByNodeId={linksByNodeId}
                  setPreviewNode={setPreviewNode}
                  openContextMenu={openContextMenu}
                  outline={outline}
                  previewNode={previewNode}
                  isWiki={isMarkdown}
                  macros={macros}
                  attachDir={attachDir}
                  useInheritance={useInheritance}
                >
                  {children}
                </PreviewLink>
              )
            },
            img: ({ src }) => {
              return <OrgImage src={src as string} file={previewNode?.file} />
            },
            section: ({ children, className }) => {
              if (className && (className as string).slice(-1) === `${previewNode.level}`) {
                return <Box>{(children as React.ReactElement[]).slice(1)}</Box>
              }
              return (
                <Section {...{ outline, collapse }} className={className as string}>
                  {children}
                </Section>
              )
            },
            blockquote: ({ children }) => (
              <chakra.blockquote
                color="gray.800"
                bgColor="gray.300"
                pt={4}
                pb={2}
                mb={4}
                mt={3}
                pl={4}
                borderLeftWidth={4}
                borderLeftColor="gray.700"
              >
                {children as React.ReactElement[]}
              </chakra.blockquote>
            ),
            p: ({ children }) => {
              return <p lang="en">{children as ReactNode}</p>
            },
          },
        }),
    [previewNode?.id],
  )

  const text = useMemo(() => processor.processSync(previewText).result, [previewText])
  return (
    <NoteContext.Provider value={{ collapse, outline }}>{text as ReactNode}</NoteContext.Provider>
  )
}
