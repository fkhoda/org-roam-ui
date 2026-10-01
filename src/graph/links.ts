import type { LinkObject, NodeObject } from 'react-force-graph-2d'
import type { LinksByNodeId, OrgRoamLink, OrgRoamNode } from '../api'

/** A node as force-graph holds it: the org-roam node plus its simulation state. */
export type GraphNode = NodeObject<OrgRoamNode>
/** A link as force-graph holds it: once the simulation starts, its ends are node objects. */
export type GraphLink = LinkObject<OrgRoamNode, { type: string }>
export type GraphData = { nodes: GraphNode[]; links: GraphLink[] }

const endId = (end: GraphLink['source']) => (typeof end === 'object' ? end.id : end) as string

/** The ids of a link's ends, whether force-graph has replaced them with node objects or not. */
export function linkEnds(link: OrgRoamLink | GraphLink): [source: string, target: string] {
  return [endId(link.source), endId(link.target)]
}

export function isLinkRelatedToNode(link: GraphLink, node: { id?: string | number } | null) {
  if (!node) return false
  const [source, target] = linkEnds(link)
  return source === node.id || target === node.id
}

/** Index links by both of their ends. */
export function indexLinks(links: (OrgRoamLink | GraphLink)[]): LinksByNodeId {
  const byNode: LinksByNodeId = {}
  for (const link of links) {
    for (const id of linkEnds(link)) {
      ;(byNode[id] ??= []).push(link as OrgRoamLink)
    }
  }
  return byNode
}

/** The ids within `n` links of `ids[0]`, not crossing excluded nodes. */
export function findNthNeighbors({
  ids,
  excludedIds,
  n,
  linksByNodeId,
}: {
  ids: string[]
  excludedIds: string[]
  n: number
  linksByNodeId: LinksByNodeId
}): string[] {
  const excluded = new Set(excludedIds)
  const found = new Set([ids[0]])
  let frontier = [ids[0]]
  for (let step = 0; step < n; step++) {
    const next: string[] = []
    for (const id of frontier) {
      for (const link of linksByNodeId[id] ?? []) {
        const ends = linkEnds(link)
        if (ends.some((end) => excluded.has(end))) continue
        for (const end of ends) {
          if (!found.has(end)) {
            found.add(end)
            next.push(end)
          }
        }
      }
    }
    frontier = next
  }
  return [...found]
}
