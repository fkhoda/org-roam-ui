import {
  ChevronLeft,
  ChevronRight,
  CollapseAll,
  Document,
  ExpandAll,
  ListBulleted,
  OverflowMenuVertical,
  TextAlignCenter,
  TextAlignJustify,
  TextAlignLeft,
  TextAlignRight,
} from '@carbon/icons-react'
import { IconButton } from '@carbon/react'
import { Resizable } from 're-resizable'
import { useState, type ComponentType, type MouseEvent } from 'react'
import type { OrgRoamNode } from '../../api'
import type { Filter, TagColors } from '../../config'
import { usePersistentState, type Setter } from '../../hooks/usePersistentState'
import { Note } from './Note'
import { PreviewContext, type PreviewState } from './PreviewContext'

const alignments = ['justify', 'start', 'end', 'center']
const alignmentIcons = [TextAlignJustify, TextAlignLeft, TextAlignRight, TextAlignCenter]

export interface SidebarProps {
  isOpen: boolean
  previewNode: OrgRoamNode | null
  history: { back: () => void; forward: () => void; canBack: boolean; canForward: boolean }
  preview: Omit<PreviewState, 'outline'>
  windowWidth: number
  filter: Filter
  setFilter: Setter<Filter>
  tagColors: TagColors
}

/** The note preview on the right, resizable from its left edge. */
export function Sidebar(props: SidebarProps) {
  const { isOpen, previewNode, history, preview, windowWidth, ...note } = props
  const [width, setWidth] = usePersistentState('sidebarWidth', 400)
  const [storedJustification, setJustification] = usePersistentState('justification', 1)
  // a stored value from another version may be out of range
  const justification = alignments[storedJustification] ? storedJustification : 1
  const [outline, setOutline] = usePersistentState('outline', false)
  const [collapse, setCollapse] = useState(false)

  if (!isOpen || !previewNode) return null

  const button = (
    label: string,
    Icon: ComponentType,
    onClick: (event: MouseEvent) => void,
    disabled = false,
  ) => (
    <IconButton
      autoAlign
      label={label}
      kind="ghost"
      size="sm"
      align="bottom"
      onClick={onClick}
      disabled={disabled}
    >
      <Icon />
    </IconButton>
  )

  return (
    <Resizable
      size={{ width, height: '100vh' }}
      onResizeStop={(_event, _direction, _ref, delta) => setWidth((w) => w + delta.width)}
      enable={{ left: true }}
      minWidth={220}
      maxWidth={Math.max(windowWidth - 200, 220)}
    >
      <PreviewContext.Provider value={{ ...preview, outline }}>
        <aside className="sidebar" aria-label="Note preview">
          <div className="sidebar__toolbar">
            {button('Go back', ChevronLeft, history.back, !history.canBack)}
            {button('Go forward', ChevronRight, history.forward, !history.canForward)}
            <span style={{ width: 16 }} />
            {button('Justify content', alignmentIcons[justification], () =>
              setJustification((j) => (j + 1) % alignments.length),
            )}
            {button(
              outline ? 'Show as document' : 'Show as outline',
              outline ? Document : ListBulleted,
              () => setOutline((on) => !on),
            )}
            {button(
              collapse ? 'Expand headings' : 'Collapse headings',
              collapse ? ExpandAll : CollapseAll,
              () => setCollapse((on) => !on),
            )}
            <span style={{ marginLeft: 'auto' }}>
              {button('Options', OverflowMenuVertical, (event) =>
                preview.openContextMenu(previewNode, event),
              )}
            </span>
          </div>
          <div className="sidebar__content thin-scrollbar">
            <Note
              key={previewNode.id}
              node={previewNode}
              textAlign={alignments[justification]}
              collapse={collapse}
              {...note}
            />
          </div>
        </aside>
      </PreviewContext.Provider>
    </Resizable>
  )
}
