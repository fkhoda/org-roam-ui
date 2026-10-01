/** The data Emacs (org-roam-ui.el) or Neovim sends over the websocket. */

export type OrgRoamNode = {
  id: string
  file: string
  title: string
  level: number
  pos: number
  olp: string[] | null
  properties: Record<string, string | number>
  tags: string[]
}

export type OrgRoamLink = {
  source: string
  target: string
  /** "id", "ref", "cite", ...; the UI adds "heading", "parent" and "bad" */
  type: string
}

export type OrgRoamGraphResponse = {
  nodes: OrgRoamNode[]
  links: OrgRoamLink[]
  tags: string[]
}

export interface EditorVariables {
  roamDir?: string
  dailyDir?: string
  katexMacros?: Record<string, string>
  attachDir?: string
  useInheritance?: boolean
  subDirs: string[]
  /** The editor's name for the UI ("Neovim"); Emacs doesn't send it. */
  editor?: string
}

export type NodeById = Record<string, OrgRoamNode | undefined>
export type LinksByNodeId = Record<string, OrgRoamLink[] | undefined>
export type NodeByCite = Record<string, OrgRoamNode | undefined>

/** The local graph: the nodes it starts from and the ones taken out of it. */
export type Scope = {
  nodeIds: string[]
  excludedNodeIds: string[]
}
