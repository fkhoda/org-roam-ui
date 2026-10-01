import { Box, Flex, IconButton } from '@chakra-ui/react'
import { Children, useContext, useState, type ReactNode } from 'react'
import { LuChevronDown, LuChevronUp } from 'react-icons/lu'
import { VscCircle, VscCircleFilled } from 'react-icons/vsc'
import { NoteContext } from '../../context'

/**
 * A heading and its contents, collapsible. Both a chevron (viewer style) and a bullet (outline
 * style) are rendered; the note style shows one of them.
 */
export function Section({ children, className }: { children: ReactNode; className?: string }) {
  const { collapse } = useContext(NoteContext)
  // the toolbar's "collapse all" resets every section
  const [state, setState] = useState({ open: !collapse, collapse })
  if (state.collapse !== collapse) setState({ open: !collapse, collapse })
  const open = state.open
  const toggle = () => setState((s) => ({ ...s, open: !s.open }))

  const [heading, ...content] = Children.toArray(children)
  const label = open ? 'Collapse heading' : 'Expand heading'
  return (
    <Box className={`sec ${className ?? ''}`}>
      <Flex className="headingFlex" alignItems="baseline">
        <IconButton
          className="viewerHeadingButton"
          aria-label={label}
          size="2xs"
          variant="subtle"
          onClick={toggle}
        >
          {open ? <LuChevronUp /> : <LuChevronDown />}
        </IconButton>
        <IconButton
          className="outlineHeadingButton"
          aria-label={label}
          size="2xs"
          variant="subtle"
          onClick={toggle}
        >
          {open ? <VscCircle /> : <VscCircleFilled />}
        </IconButton>
        {heading}
      </Flex>
      {open && <Box className="sectionContent">{content}</Box>}
    </Box>
  )
}
