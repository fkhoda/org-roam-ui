import type { Element, ElementContent, Root as HastRoot, Text } from 'hast'
import { toString as orgToString } from 'orgast-util-to-string'
import type { OrgData } from 'uniorg'
import type { VFile } from 'vfile'
import { visit } from 'unist-util-visit'

/**
 * uniorg-parse always reads `foo_bar` / `foo^bar` as subscript and superscript (org's `^:t`),
 * which mangles underscores in ids and CONSTANT_NAMES. Keep only the braced forms (`foo_{bar}`,
 * org's `^:{}`) and turn bare ones back into text.
 */
export function unwrapBareSubSuperscript() {
  return (tree: OrgData, file: VFile) => {
    const source = String(file)
    visit(tree, ['subscript', 'superscript'], (node, index, parent) => {
      if (!parent || index === undefined) return
      const sub = node as unknown as { type: string; contentsBegin: number }
      if (source[sub.contentsBegin - 1] === '{') return
      const marker = sub.type === 'subscript' ? '_' : '^'
      ;(parent.children as unknown[])[index] = {
        type: 'text',
        value: marker + orgToString(node as never),
      }
    })
  }
}

const lineBreak = /(\\\\[ \t]*\n)/

/**
 * org's explicit line break (`\\` at the end of a line) survives uniorg as literal backslashes.
 * Make it a `<br>`, like ox-html.
 */
export function orgLineBreaks() {
  return (tree: HastRoot) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined || !lineBreak.test(node.value)) return
      const parts: ElementContent[] = node.value
        .split(lineBreak)
        .filter((part) => part.length)
        .map((part) =>
          lineBreak.test(part)
            ? ({ type: 'element', tagName: 'br', properties: {}, children: [] } satisfies Element)
            : ({ type: 'text', value: part } satisfies Text),
        )
      parent.children.splice(index, 1, ...parts)
      return index + parts.length
    })
  }
}

const blockStart = /^\s*#\+begin_/i
const blockEnd = /^\s*#\+end_/i
const inlineCode = /(=[^=\s][^=\n]*?=|~[^~\s][^~\n]*?~)/

/**
 * uniorg reads `$...$` as inline math, so prices ("$8.9M ... $283.2M") turn into italic LaTeX.
 * Like Pandoc, treat a `$` right before a digit as a dollar sign: write it as org's `\dollar{}`
 * entity, outside blocks, fixed-width lines and inline code.
 */
export function escapeCurrency(text: string) {
  let inBlock = false
  return text
    .split('\n')
    .map((line) => {
      if (blockStart.test(line)) inBlock = true
      if (inBlock) {
        if (blockEnd.test(line)) inBlock = false
        return line
      }
      if (/^\s*:/.test(line) || !line.includes('$')) return line
      return line
        .split(inlineCode)
        .map((part, i) => (i % 2 ? part : part.replace(/\$(?=\d)/g, '\\dollar{}')))
        .join('')
    })
    .join('\n')
}

/** org export's special strings: `---` em dash, `--` en dash, `...` ellipsis (not in code). */
export function orgSpecialStrings() {
  return (tree: OrgData) => {
    visit(tree, 'text', (node) => {
      const text = node as unknown as { value: string }
      text.value = text.value
        .replace(/---/g, '—')
        .replace(/--/g, '–')
        .replace(/\.\.\./g, '…')
    })
  }
}
