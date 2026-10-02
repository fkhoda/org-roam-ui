import jLouvain from 'jlouvain.js'
import type { LinksByNodeId, OrgRoamNode, Scope } from '../api'
import type { Filter } from '../config'
import { findNthNeighbors, indexLinks, linkEnds, type GraphData, type GraphNode } from './links'

const jitter = () => (Math.random() - 0.5) * 10

const structural = (type: string) => type === 'parent' || type === 'heading'

/** Whether the filter hides a node by itself (before looking at its links). */
function hiddenByFilter(node: OrgRoamNode, filter: Filter, dailyDir?: string) {
  const inDir = (dir: string) => node.file?.includes(dir)
  const hasTag = (tag: string) => node.tags?.includes(tag)
  return (
    (filter.dirsBlocklist.length > 0 && filter.dirsBlocklist.some(inDir)) ||
    (filter.dirsAllowlist.length > 0 && !filter.dirsAllowlist.some(inDir)) ||
    (filter.tagsBlacklist.length > 0 && filter.tagsBlacklist.some(hasTag)) ||
    (filter.tagsWhitelist.length > 0 && !filter.tagsWhitelist.some(hasTag)) ||
    (filter.filelessCites && !!node.properties?.FILELESS) ||
    (filter.bad && !!node.properties?.bad) ||
    (filter.dailies && !!dailyDir && inDir(dailyDir)) ||
    (filter.noter && !!node.properties?.NOTER_PAGE)
  )
}

export interface FilteredGraph extends GraphData {
  linksByNodeId: LinksByNodeId
  /** node id -> community, when coloring by community */
  clusters: Record<string, number>
}

export function filterGraph(
  graph: GraphData,
  linksByNodeId: LinksByNodeId,
  filter: Filter,
  { dailyDir, communities }: { dailyDir?: string; communities: boolean },
): FilteredGraph {
  const hidden = new Set<string>()
  const visible = graph.nodes.filter((node) => {
    const hide = hiddenByFilter(node as OrgRoamNode, filter, dailyDir)
    if (hide) hidden.add(node.id as string)
    return !hide
  })

  const nodes = !filter.orphans
    ? visible
    : visible.filter((node) => {
        const links = (linksByNodeId[node.id as string] ?? []).filter(
          (link) => !hidden.has(link.source) && !hidden.has(link.target),
        )
        // with "link children to" on, a heading node linked only to its file isn't an orphan
        return filter.parent ? links.length > 0 : links.some((link) => !structural(link.type))
      })

  const ids = new Set(nodes.map((node) => node.id as string))
  const links = graph.links.filter((link) => {
    if (!linkEnds(link).every((id) => ids.has(id))) return false
    if (!filter.parent) return !structural(link.type)
    // show either the links to the heading above or the ones to the file, not both
    return link.type !== (filter.parent === 'heading' ? 'parent' : 'heading')
  })

  let clusters: Record<string, number> = {}
  if (communities) {
    const edges = links.map((link) => {
      const [target, source] = linkEnds(link)
      return { source, target, weight: link.type === 'cite' ? 1 : 2 }
    })
    clusters = jLouvain()
      .nodes([...ids])
      .edges(edges)()
  }

  return { nodes, links, linksByNodeId: indexLinks(links), clusters }
}

/**
 * The local graph around `scope.nodeIds`. With several roots, the nodes already shown keep their
 * objects (and positions); newly added ones start at the center so the view doesn't jump.
 */
export function scopeGraph(
  previous: GraphData,
  scope: Scope,
  filtered: FilteredGraph,
  neighbors: number,
): GraphData {
  const excluded = new Set(scope.excludedNodeIds)
  const roots = new Set(scope.nodeIds)
  const kept =
    scope.nodeIds.length > 1
      ? previous.nodes.filter((node) => !excluded.has(node.id as string))
      : []
  const keptIds = new Set(kept.map((node) => node.id as string))

  const nearby = new Set(
    findNthNeighbors({
      ids: scope.nodeIds,
      excludedIds: scope.excludedNodeIds,
      n: neighbors,
      linksByNodeId: filtered.linksByNodeId,
    }),
  )
  const added: GraphNode[] = filtered.nodes
    .filter((node) => {
      const id = node.id as string
      if (!kept.length) return nearby.has(id)
      if (keptIds.has(id)) return false
      // growing the local graph: add the neighbors of its roots
      return (filtered.linksByNodeId[id] ?? []).some((link) => {
        const ends = linkEnds(link)
        return !ends.some((end) => excluded.has(end)) && ends.some((end) => roots.has(end))
      })
    })
    // start near the center, in a small random cloud: nodes stacked on one point or line (3D kept
    // their old z) feel no sideways force and never spread out
    .map((node) => ({
      ...node,
      x: jitter(),
      y: jitter(),
      z: jitter(),
      vx: 0,
      vy: 0,
      vz: 0,
      fx: undefined,
      fy: undefined,
      fz: undefined,
    }))

  const nodes = [...kept, ...added]
  const ids = new Set(nodes.map((node) => node.id as string))
  const links = filtered.links
    .filter((link) => linkEnds(link).every((id) => ids.has(id)))
    .map((link) => {
      const [source, target] = linkEnds(link)
      return { ...link, source, target }
    })
  return { nodes, links }
}
