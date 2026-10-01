import { interpolate } from 'd3-interpolate'
import type { LinksByNodeId, OrgRoamNode } from '../api'
import { colorList, type Coloring, type TagColors, type Visuals } from '../config'
import { resolveColor, type Palette } from '../theme/palette'

/** `mix[from][to](t)`: the color `t` of the way from one named color to another. */
export type ColorMixer = Record<string, Record<string, (t: number) => string>>

export function makeColorMixer(palette: Palette): ColorMixer {
  return Object.fromEntries(
    colorList.map((from) => [
      from,
      Object.fromEntries(
        colorList.map((to) => [
          to,
          interpolate(resolveColor(from, palette), resolveColor(to, palette)) as (
            t: number,
          ) => string,
        ]),
      ),
    ]),
  )
}

/** Mix two named colors, tolerating names missing from the color list (old settings). */
function mixed(mixer: ColorMixer, palette: Palette, from: string, to: string, t: number) {
  const fn = mixer[from]?.[to]
  return fn ? fn(t) : resolveColor(from, palette)
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

/** A node's color from its scheme: by number of links, or by community. */
export function nodeColorName({
  id,
  linksByNodeId,
  visuals,
  coloring,
  cluster,
}: {
  id: string
  linksByNodeId: LinksByNodeId
  visuals: Visuals
  coloring: Coloring
  cluster: Record<string, number>
}) {
  const scheme = visuals.nodeColorScheme
  const degree = linksByNodeId[id]?.length ?? 0
  if (coloring.method === 'degree') return scheme[clamp(degree, 0, scheme.length - 1)]
  return scheme[degree && cluster[id] % scheme.length]
}

interface ColorContext {
  palette: Palette
  mixer: ColorMixer
  visuals: Visuals
  coloring: Coloring
  cluster: Record<string, number>
  linksByNodeId: LinksByNodeId
  opacity: number
}

export function nodeColor({
  node,
  highlighted,
  emacsNodeId,
  tagColors,
  ...ctx
}: ColorContext & {
  node: OrgRoamNode
  highlighted: boolean
  emacsNodeId: string | null
  tagColors: TagColors
}) {
  const { palette, mixer, visuals, opacity } = ctx
  const faded = (name: string) =>
    mixed(mixer, palette, name, visuals.backgroundColor, visuals.highlightFade * opacity)

  if (visuals.emacsNodeColor && node.id === emacsNodeId) {
    return resolveColor(visuals.emacsNodeColor, palette)
  }
  const tag = node.tags?.find((tag) => tagColors[tag])
  if (tag) {
    const color = tagColors[tag]
    return highlighted
      ? mixed(mixer, palette, color, color, visuals.highlightFade * opacity)
      : faded(color)
  }
  if (visuals.citeNodeColor && node.properties?.ROAM_REFS && node.properties?.FILELESS) {
    return highlighted ? resolveColor(visuals.citeNodeColor, palette) : faded(visuals.citeNodeColor)
  }
  if (visuals.refNodeColor && node.properties?.ROAM_REFS) {
    return highlighted ? resolveColor(visuals.refNodeColor, palette) : faded(visuals.refNodeColor)
  }
  const own = nodeColorName({ id: node.id, ...ctx })
  if (!highlighted) return faded(own)
  if (!visuals.nodeHighlight) return resolveColor(own, palette)
  return mixed(mixer, palette, own, visuals.nodeHighlight, opacity)
}

export function linkColor({
  sourceId,
  targetId,
  highlighted,
  ...ctx
}: ColorContext & { sourceId: string; targetId: string; highlighted: boolean }) {
  const { palette, mixer, visuals, opacity, linksByNodeId } = ctx
  // a link takes the color of its better connected end
  const endColor = () => {
    const sourceDegree = linksByNodeId[sourceId]?.length ?? 0
    const targetDegree = linksByNodeId[targetId]?.length ?? 0
    return nodeColorName({ id: sourceDegree > targetDegree ? sourceId : targetId, ...ctx })
  }
  const scheme = visuals.linkColorScheme

  if (!highlighted) {
    if (!visuals.linkHighlight && !scheme) return resolveColor(endColor(), palette)
    const name = scheme || endColor()
    return mixed(mixer, palette, name, visuals.backgroundColor, visuals.highlightFade * opacity)
  }
  if (!visuals.linkHighlight) return resolveColor(scheme || endColor(), palette)
  return mixed(mixer, palette, scheme || endColor(), visuals.linkHighlight, opacity)
}

/** `#rrggbb` (or `#rgb`) as `rgba()` with the given opacity. */
export function hexToRGBA(hex: string, opacity: number) {
  let digits = hex.replace('#', '')
  if (digits.length === 3) digits = [...digits].map((d) => d + d).join('')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16))
  return `rgba(${r},${g},${b},${Number.isFinite(opacity) ? opacity : 1})`
}
