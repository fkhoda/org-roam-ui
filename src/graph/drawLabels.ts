import wrap from 'word-wrap'
import type { LinksByNodeId } from '../api'
import type { Visuals } from '../config'
import { hexToRGBA } from './colors'
import type { GraphNode } from './links'

/** A node's size before zoom scaling: grows with its links (links to its file don't count). */
export function nodeSize({
  node,
  linksByNodeId,
  visuals,
  highlighted,
  opacity,
}: {
  node: GraphNode
  linksByNodeId: LinksByNodeId
  visuals: Visuals
  highlighted: boolean
  opacity: number
}) {
  const links = linksByNodeId[node.id as string] ?? []
  const parents = links.filter((link) => link.type === 'parent').length
  const base = 3 + links.length * visuals.nodeSizeLinks - parents
  if (visuals.highlightNodeSize === 1 || !highlighted) return base
  return base * (1 + opacity * (visuals.highlightNodeSize - 1))
}

export interface DrawLabelOptions {
  node: GraphNode
  ctx: CanvasRenderingContext2D
  globalScale: number
  visuals: Visuals
  opacity: number
  linksByNodeId: LinksByNodeId
  /** the node or one of its neighbors is (or was just) hovered */
  highlighted: boolean
  /** the node itself is (or was just) hovered */
  hovered: boolean
  labelTextColor: string
  labelBackgroundColor: string
}

/** Draw a node's title under it, fading in with zoom (sooner for well-linked nodes). */
export function drawLabel(o: DrawLabelOptions) {
  const { node, ctx, globalScale, visuals, opacity, highlighted } = o
  if (!visuals.labels) return

  const links = o.linksByNodeId[node.id as string] ?? []
  const fadeFactor = Math.min(
    5 * (globalScale - visuals.labelScale) +
      2 *
        Math.pow(Math.min(links.length, visuals.labelDynamicDegree), visuals.labelDynamicStrength),
    1,
  )
  if (fadeFactor < 0.01 && !highlighted) return

  const title: string = node.title ?? ''
  const label = title.substring(0, visuals.labelLength)
  const size = Math.cbrt(
    (visuals.nodeRel * nodeSize({ ...o, linksByNodeId: o.linksByNodeId })) /
      Math.pow(globalScale, visuals.nodeZoomSize),
  )
  const fontSize = visuals.labelFontSize / Math.cbrt(Math.pow(globalScale, visuals.nodeZoomSize))
  const textOpacity = highlighted
    ? Math.max(fadeFactor, opacity)
    : fadeFactor * (1 - visuals.highlightFade * opacity)

  const x = node.x ?? 0
  const y = node.y ?? 0
  // set the font before measuring: measureText uses the current one
  ctx.font = `${fontSize}px 'IBM Plex Sans', sans-serif`
  const lines = wrap(label, { width: visuals.labelWordWrap }).split('\n')
  if (title.length > visuals.labelLength) lines[lines.length - 1] += '...'
  const offset = o.hovered ? 1 + 0.3 * opacity : 1
  const top = y + offset * size * 8
  if (visuals.labelBackgroundColor && visuals.labelBackgroundOpacity) {
    // around every wrapped line
    const widest = Math.max(...lines.map((line) => ctx.measureText(line).width))
    const width = widest * 1.1 + fontSize * 0.5
    const height = fontSize * 1.5 + visuals.labelLineSpace * fontSize * (lines.length - 1)
    ctx.fillStyle = hexToRGBA(o.labelBackgroundColor, textOpacity * visuals.labelBackgroundOpacity)
    ctx.fillRect(x - width / 2, top - fontSize * 0.75, width, height)
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = hexToRGBA(o.labelTextColor, textOpacity)
  lines.forEach((line, i) => {
    ctx.fillText(line, x, top + visuals.labelLineSpace * fontSize * i)
  })
}
