import { Box, Flex, IconButton } from '@chakra-ui/react'
import { Resizable } from 're-resizable'
import { useState } from 'react'
import {
  BiAlignJustify,
  BiAlignLeft,
  BiAlignMiddle,
  BiAlignRight,
  BiDotsVerticalRounded,
} from 'react-icons/bi'
import { IoIosListBox, IoMdListBox } from 'react-icons/io'
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'
import { MdOutlineCompress, MdOutlineExpand } from 'react-icons/md'
import type { OrgRoamNode } from '../../api'
import type { Filter, TagColors } from '../../config'
import { usePersistentState, type Setter } from '../../hooks/usePersistentState'
import { Tooltip } from '../ui/Tooltip'
import { Note } from './Note'
import { PreviewContext, type PreviewState } from './PreviewContext'

const alignments = ['justify', 'start', 'end', 'center']
const alignmentIcons = [<BiAlignJustify />, <BiAlignLeft />, <BiAlignRight />, <BiAlignMiddle />]

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
export function Sidebar({
  isOpen,
  previewNode,
  history,
  preview,
  windowWidth,
  ...note
}: SidebarProps) {
  const [width, setWidth] = usePersistentState('sidebarWidth', 400)
  const [justification, setJustification] = usePersistentState('justification', 1)
  const [outline, setOutline] = usePersistentState('outline', false)
  const [collapse, setCollapse] = useState(false)

  if (!isOpen || !previewNode) return null

  const button = (
    label: string,
    icon: React.ReactNode,
    onClick: (event: React.MouseEvent) => void,
    disabled = false,
  ) => (
    <Tooltip content={label}>
      <IconButton aria-label={label} variant="subtle" onClick={onClick} disabled={disabled}>
        {icon}
      </IconButton>
    </Tooltip>
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
        <Flex flexDir="column" h="100vh" pl={2} color="black" bg="alt.100">
          <Flex px={2} pt={1} pb={3} alignItems="center">
            {button('Go back', <LuChevronLeft />, history.back, !history.canBack)}
            {button('Go forward', <LuChevronRight />, history.forward, !history.canForward)}
            <Box w={4} />
            {button('Justify content', alignmentIcons[justification], () =>
              setJustification((j) => (j + 1) % alignments.length),
            )}
            {button('Toggle outline view', outline ? <IoIosListBox /> : <IoMdListBox />, () =>
              setOutline((on) => !on),
            )}
            {button(
              collapse ? 'Expand headings' : 'Collapse headings',
              collapse ? <MdOutlineExpand /> : <MdOutlineCompress />,
              () => setCollapse((on) => !on),
            )}
            <Box ml="auto">
              {button('Options', <BiDotsVerticalRounded />, (event) =>
                preview.openContextMenu(previewNode, event),
              )}
            </Box>
          </Flex>
          <Box flex={1} overflowY="auto" className="thin-scrollbar">
            <Note
              node={previewNode}
              textAlign={alignments[justification]}
              collapse={collapse}
              {...note}
            />
          </Box>
        </Flex>
      </PreviewContext.Provider>
    </Resizable>
  )
}
