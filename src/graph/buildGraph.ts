import type {
  LinksByNodeId,
  NodeByCite,
  NodeById,
  OrgRoamGraphResponse,
  OrgRoamLink,
  OrgRoamNode,
} from '../api'
import { indexLinks, linkEnds, type GraphData, type GraphNode } from './links'

export interface ProcessedGraph {
  nodes: OrgRoamNode[]
  links: OrgRoamLink[]
  nodeById: NodeById
  linksByNodeId: LinksByNodeId
  nodeByCite: NodeByCite
  tags: string[]
}

// a node a link points to that doesn't exist (a deleted note, a typo'd id)
const missingNode = (id: string): OrgRoamNode => ({
  id,
  tags: ['bad'],
  properties: { FILELESS: 'yes', bad: 'yes' },
  file: '',
  title: id,
  level: 0,
  pos: 0,
  olp: null,
})

const stripCookies = (title: string) => title.replace(/ *\[\d*\/\d*\] */g, '')

/**
 * Turn the editor's graph into the UI's: add links from heading nodes to the heading above them
 * ("heading") and to their file ("parent"), which org-roam doesn't store, and stand-in nodes for
 * link targets that don't exist.
 */
export function processGraph(response: OrgRoamGraphResponse): ProcessedGraph {
  const importNodes = response.nodes ?? []
  const nodesByFile = Map.groupBy(importNodes, (node) => node.file)

  const structureLinks: OrgRoamLink[] = []
  for (const nodesInFile of nodesByFile.values()) {
    const fileNode = nodesInFile.find((node) => node.level === 0)
    if (!fileNode) continue
    for (const heading of nodesInFile.filter((node) => node.level !== 0)) {
      // the nearest heading node above this one in its outline path, else the file
      const parent = nodesInFile
        .filter(
          (node) =>
            node.level < heading.level &&
            node.pos < heading.pos &&
            heading.olp?.includes(stripCookies(node.title)),
        )
        .reduce((best, node) => (node.level > best.level ? node : best), fileNode)
      structureLinks.push({ source: heading.id, target: parent.id, type: 'heading' })
      structureLinks.push({ source: heading.id, target: fileNode.id, type: 'parent' })
    }
  }

  const nodeById: NodeById = Object.fromEntries(importNodes.map((node) => [node.id, node]))
  const missing = new Map<string, OrgRoamNode>()
  const links = [...(response.links ?? []), ...structureLinks].map((link) => {
    const absent = linkEnds(link).find((id) => !nodeById[id])
    if (absent === undefined) return link
    if (!missing.has(absent)) missing.set(absent, missingNode(absent))
    return { ...link, type: 'bad' }
  })
  for (const node of missing.values()) nodeById[node.id] = node

  const nodes = [...importNodes, ...missing.values()]
  const nodeByCite: NodeByCite = {}
  for (const node of nodes) {
    const ref = node.properties?.ROAM_REFS
    if (typeof ref !== 'string' || !ref.includes('cite')) continue
    const key = ref.replace(/cite:(.*)/g, '$1')
    if (key) nodeByCite[key] = node
  }

  return {
    nodes,
    links,
    nodeById,
    linksByNodeId: indexLinks(links),
    nodeByCite,
    tags: response.tags ?? [],
  }
}

/**
 * The graph data for force-graph after an update. Nodes that are still there keep their
 * simulation state (position, velocity), so the graph doesn't jump; new ones are appended.
 */
export function mergeGraph(current: GraphData, next: ProcessedGraph): GraphData {
  if (current.nodes.length === 0) {
    // force-graph mutates what it's given: hand it copies, not the objects in nodeById
    return structuredClone({ nodes: next.nodes, links: next.links })
  }
  const kept = new Set<string>()
  const nodes: GraphNode[] = []
  for (const node of current.nodes) {
    const updated = next.nodeById[node.id as string]
    if (!updated) continue
    kept.add(updated.id)
    nodes.push({ ...node, ...updated })
  }
  for (const node of next.nodes) {
    if (!kept.has(node.id)) nodes.push(structuredClone(node))
  }
  const byId = new Map(nodes.map((node) => [node.id as string, node]))
  const links = next.links.map((link) => {
    const [source, target] = linkEnds(link)
    return { ...link, source: byId.get(source), target: byId.get(target) }
  })
  return { nodes, links }
}
