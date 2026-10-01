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
