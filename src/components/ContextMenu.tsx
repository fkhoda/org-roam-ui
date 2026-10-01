import {
  Add,
  AddAlt,
  ChartNetwork,
  ColorPalette,
  Edit,
  Subtract,
  TrashCan,
  View,
  ViewOff,
} from '@carbon/icons-react'
import { Menu, MenuItem, MenuItemDivider, MenuItemGroup, Modal } from '@carbon/react'
import type { RefObject } from 'react'
import type { OrgRoamNode, Scope } from '../api'
import { colorList, type Filter, type TagColors } from '../config'
import { useEditorName } from '../context'
import { createNode, deleteNode, openNode, type EditorSocket } from '../editor'
import type { LocalCommand } from '../graph/Graph'
import type { Setter } from '../hooks/usePersistentState'
import type { ContextMenuTarget } from './Sidebar/PreviewContext'
import { Swatch } from './ui/ColorPicker'

export interface ContextMenuProps {
  target: ContextMenuTarget
  at: { x: number; y: number }
  onClose: () => void
  /** ask to delete a note */
  onDelete: (node: OrgRoamNode) => void
  scope: Scope
  onLocal: (node: OrgRoamNode, command: LocalCommand) => void
  setPreviewNode: (node: OrgRoamNode) => void
  /** read when an item is picked: the socket reconnects as a new object */
  socket: RefObject<EditorSocket | null>
  filter: Filter
  setFilter: Setter<Filter>
  tagColors: TagColors
  setTagColors: Setter<TagColors>
}

/** The right-click menu of a node or a tag. */
export function ContextMenu(props: ContextMenuProps) {
  const { target, at, onClose } = props
  return (
    <Menu
      open
      x={at.x}
      y={at.y}
      size="sm"
      label={typeof target === 'string' ? `Tag ${target}` : target.title}
      onClose={onClose}
    >
      {typeof target === 'string' ? (
        <TagItems tag={target} {...props} />
      ) : (
        <NodeItems node={target} {...props} />
      )}
    </Menu>
  )
}

/** Confirm deleting a note's file. Lives outside the menu, which closes as an item is picked. */
export function DeleteNoteDialog({
  node,
  onClose,
  socket,
}: {
  node: OrgRoamNode | null
  onClose: () => void
  socket: RefObject<EditorSocket | null>
}) {
  return (
    <Modal
      open={!!node}
      danger
      size="xs"
      modalHeading="Delete note?"
      primaryButtonText="Delete note"
      secondaryButtonText="Cancel"
      onRequestClose={onClose}
      onRequestSubmit={() => {
        if (node) deleteNode(socket.current, node)
        onClose()
      }}
    >
      <p>This permanently deletes the note's file:</p>
      <p>
        <strong>{node?.title}</strong>
      </p>
    </Modal>
  )
}

function NodeItems({
  node,
  onDelete,
  scope,
  onLocal,
  setPreviewNode,
  socket,
}: ContextMenuProps & { node: OrgRoamNode }) {
  const editor = useEditorName()
  const isLocal = scope.nodeIds.length > 0
  return (
    <>
      <MenuItemGroup label={node.title}>
        {isLocal && (
          <>
            <MenuItem
              label="Expand local graph at node"
              renderIcon={AddAlt}
              onClick={() => onLocal(node, 'add')}
            />
            <MenuItem
              label="Open local graph for this node"
              renderIcon={ChartNetwork}
              onClick={() => onLocal(node, 'replace')}
            />
            <MenuItem
              label="Exclude node from local graph"
              renderIcon={Subtract}
              onClick={() => onLocal(node, 'remove')}
            />
          </>
        )}
        {node.properties?.FILELESS ? (
          <MenuItem
            label="Create node"
            renderIcon={Add}
            onClick={() => createNode(socket.current, node)}
          />
        ) : (
          <MenuItem
            label={`Open in ${editor}`}
            renderIcon={Edit}
            onClick={() => openNode(socket.current, node)}
          />
        )}
        {!isLocal && (
          <MenuItem
            label="Open local graph"
            renderIcon={ChartNetwork}
            onClick={() => onLocal(node, 'replace')}
          />
        )}
        <MenuItem label="Preview" renderIcon={View} onClick={() => setPreviewNode(node)} />
      </MenuItemGroup>
      {node.level === 0 && (
        <>
          <MenuItemDivider />
          <MenuItem
            label="Permanently delete note"
            kind="danger"
            renderIcon={TrashCan}
            onClick={() => onDelete(node)}
          />
        </>
      )}
    </>
  )
}

/** A menu icon showing a color. */
const swatchIcon = (color: string) => {
  const Icon = () => <Swatch color={color} size={12} />
  return Icon
}

function TagItems({
  tag,
  filter,
  setFilter,
  tagColors,
  setTagColors,
}: ContextMenuProps & { tag: string }) {
  const blocked = filter.tagsBlacklist.includes(tag)
  const allowed = filter.tagsWhitelist.includes(tag)
  const toggle = (list: 'tagsBlacklist' | 'tagsWhitelist', on: boolean) =>
    setFilter((current) => ({
      ...current,
      [list]: on ? [...current[list], tag] : current[list].filter((t) => t !== tag),
    }))
  const setColor = (color: string) =>
    setTagColors((current) => {
      const rest = Object.fromEntries(Object.entries(current).filter(([t]) => t !== tag))
      return color ? { ...rest, [tag]: color } : rest
    })
  return (
    <MenuItemGroup label={tag}>
      <MenuItem label="Color" renderIcon={ColorPalette}>
        {['', ...colorList].map((color) => (
          <MenuItem
            key={color || 'none'}
            label={color || 'No color'}
            renderIcon={swatchIcon(color)}
            shortcut={tagColors[tag] === color ? '✓' : undefined}
            onClick={() => setColor(color)}
          />
        ))}
      </MenuItem>
      {!allowed && (
        <MenuItem
          label={blocked ? 'Remove from blocklist' : 'Add to blocklist'}
          renderIcon={blocked ? Subtract : ViewOff}
          onClick={() => toggle('tagsBlacklist', !blocked)}
        />
      )}
      {!blocked && (
        <MenuItem
          label={allowed ? 'Remove from allowlist' : 'Add to allowlist'}
          renderIcon={allowed ? Subtract : View}
          onClick={() => toggle('tagsWhitelist', !allowed)}
        />
      )}
    </MenuItemGroup>
  )
}
