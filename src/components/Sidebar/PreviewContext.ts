import { createContext, useContext } from 'react'
import type { LinksByNodeId, NodeByCite, NodeById, OrgRoamNode } from '../../api'

export type ContextMenuTarget = OrgRoamNode | string

/** Where to put the context menu; the mouse position when omitted. */
export type MenuPosition = { left?: number; top?: number; right?: number; bottom?: number }

export interface PreviewState {
  nodeById: NodeById
  linksByNodeId: LinksByNodeId
  nodeByCite: NodeByCite
  setPreviewNode: (node: OrgRoamNode) => void
  setSidebarHighlightedNode: (node: OrgRoamNode | null) => void
  openContextMenu: (
    target: ContextMenuTarget,
    event: React.MouseEvent | MouseEvent,
    at?: MenuPosition,
  ) => void
  macros: Record<string, string>
  attachDir: string
  useInheritance: boolean
  outline: boolean
}

/** What every part of the note preview needs: the graph's indexes and the UI's callbacks. */
export const PreviewContext = createContext<PreviewState | null>(null)

export function usePreview() {
  const state = useContext(PreviewContext)
  if (!state) throw new Error('usePreview outside PreviewContext')
  return state
}
