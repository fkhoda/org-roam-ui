import { Box, Button, Dialog, Flex, Menu, Portal, Stack, Text } from '@chakra-ui/react'
import { useState, type RefObject } from 'react'
import { BiNetworkChart } from 'react-icons/bi'
import { LuEye, LuEyeOff, LuMinus, LuPencil, LuPlus, LuSquarePlus, LuTrash2 } from 'react-icons/lu'
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
  const [confirmDelete, setConfirmDelete] = useState(false)
  return (
    <>
      <Menu.Root
        open={!confirmDelete}
        positioning={{ getAnchorRect: () => ({ ...at, width: 0, height: 0 }) }}
        onOpenChange={({ open }) => !open && !confirmDelete && onClose()}
      >
        <Portal>
          <Menu.Positioner>
            <Menu.Content fontSize="xs" minW="56">
              {typeof target === 'string' ? (
                <TagItems tag={target} {...props} />
              ) : (
                <NodeItems node={target} onDelete={() => setConfirmDelete(true)} {...props} />
              )}
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
      {typeof target !== 'string' && (
        <Dialog.Root
          open={confirmDelete}
          onOpenChange={({ open }) => !open && onClose()}
          placement="center"
          role="alertdialog"
        >
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>Delete note?</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  <Stack gap={4}>
                    <Text>This permanently deletes the note's file:</Text>
                    <Text fontWeight="bold">{target.title}</Text>
                  </Stack>
                </Dialog.Body>
                <Dialog.Footer>
                  <Dialog.ActionTrigger asChild>
                    <Button variant="outline" colorPalette="gray">
                      Cancel
                    </Button>
                  </Dialog.ActionTrigger>
                  <Button
                    colorPalette="red"
                    onClick={() => {
                      deleteNode(props.socket.current, target)
                      onClose()
                    }}
                  >
                    Delete note
                  </Button>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      )}
    </>
  )
}

function NodeItems({
  node,
  onDelete,
  scope,
  onLocal,
  setPreviewNode,
  socket,
}: ContextMenuProps & { node: OrgRoamNode; onDelete: () => void }) {
  const editor = useEditorName()
  const isLocal = scope.nodeIds.length > 0
  return (
    <>
      <Menu.ItemGroup>
        <Menu.ItemGroupLabel truncate maxW="xs">
          {node.title}
        </Menu.ItemGroupLabel>
      </Menu.ItemGroup>
      <Menu.Separator />
      {isLocal && (
        <>
          <Menu.Item value="add" onSelect={() => onLocal(node, 'add')}>
            <LuSquarePlus /> Expand local graph at node
          </Menu.Item>
          <Menu.Item value="replace" onSelect={() => onLocal(node, 'replace')}>
            <BiNetworkChart /> Open local graph for this node
          </Menu.Item>
          <Menu.Item value="remove" onSelect={() => onLocal(node, 'remove')}>
            <LuMinus /> Exclude node from local graph
          </Menu.Item>
        </>
      )}
      {node.properties?.FILELESS ? (
        <Menu.Item value="create" onSelect={() => createNode(socket.current, node)}>
          <LuPlus /> Create node
        </Menu.Item>
      ) : (
        <Menu.Item value="open" onSelect={() => openNode(socket.current, node)}>
          <LuPencil /> Open in {editor}
        </Menu.Item>
      )}
      {!isLocal && (
        <Menu.Item value="local" onSelect={() => onLocal(node, 'replace')}>
          <BiNetworkChart /> Open local graph
        </Menu.Item>
      )}
      <Menu.Item value="preview" onSelect={() => setPreviewNode(node)}>
        <LuEye /> Preview
      </Menu.Item>
      {node.level === 0 && (
        <Menu.Item value="delete" color="red.500" closeOnSelect={false} onSelect={onDelete}>
          <LuTrash2 /> Permanently delete note
        </Menu.Item>
      )}
    </>
  )
}

function TagItems({ tag, filter, setFilter, setTagColors }: ContextMenuProps & { tag: string }) {
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
    <>
      <Menu.ItemGroup>
        <Menu.ItemGroupLabel>Color of {tag}</Menu.ItemGroupLabel>
        <Flex flexWrap="wrap" gap={1} px={2} pb={2} maxW="56">
          {['', ...colorList].map((color) => (
            <Box
              key={color || 'none'}
              as="button"
              aria-label={color || 'No color'}
              onClick={() => setColor(color)}
              cursor="pointer"
            >
              <Swatch color={color} height={4} width={4} />
            </Box>
          ))}
        </Flex>
      </Menu.ItemGroup>
      <Menu.Separator />
      {!allowed && (
        <Menu.Item value="block" onSelect={() => toggle('tagsBlacklist', !blocked)}>
          {blocked ? <LuMinus /> : <LuEyeOff />}{' '}
          {blocked ? 'Remove from blocklist' : 'Add to blocklist'}
        </Menu.Item>
      )}
      {!blocked && (
        <Menu.Item value="allow" onSelect={() => toggle('tagsWhitelist', !allowed)}>
          {allowed ? <LuMinus /> : <LuEye />}{' '}
          {allowed ? 'Remove from allowlist' : 'Add to allowlist'}
        </Menu.Item>
      )}
    </>
  )
}
