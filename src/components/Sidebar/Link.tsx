import { Box, HoverCard, Link, Portal, Text } from '@chakra-ui/react'
import { lazy, Suspense, useState, type ReactNode } from 'react'
import { LuExternalLink } from 'react-icons/lu'
import type { OrgRoamNode } from '../../api'
import { NoteContext } from '../../context'
import { defaultNoteStyle, outlineNoteStyle, viewerNoteStyle } from './noteStyle'
import { usePreview } from './PreviewContext'
import { useNoteText } from './useNoteText'

const OrgContent = lazy(() => import('../../org/OrgContent'))

/** `type:path` -> [type, path]; a link without a type is all type. */
function splitHref(href: string): [type: string, path: string] {
  const colon = href.indexOf(':')
  return colon < 0 ? [href, href] : [href.slice(0, colon), href.slice(colon + 1)]
}

export interface PreviewLinkProps {
  href: string
  children: ReactNode
  /** markdown wiki links show their brackets */
  isWiki?: boolean
  noUnderline?: boolean
}

/** A link in a note: to another node (previewed on hover), to the web, or dead. */
export function PreviewLink({ href, children, isWiki, noUnderline }: PreviewLinkProps) {
  const { nodeByCite } = usePreview()
  const [type, path] = splitHref(href)

  if (!type)
    return (
      <Text as="span" color="gray.700">
        {children}
      </Text>
    )
  if (/^https?$/.test(type)) {
    return (
      <Link href={href} target="_blank" rel="noreferrer" color="accent.fg">
        {children}
        <LuExternalLink size="0.8em" />
      </Link>
    )
  }

  let id = ''
  if (type === 'id') id = path
  else if (type.includes('cite')) {
    const node = nodeByCite[path]
    if (node && !node.properties.FILELESS) id = node.id
  }
  if (!id) {
    return (
      <Text as="span" color="gray.700" cursor="not-allowed">
        {children}
      </Text>
    )
  }
  return (
    <NodeLink id={id} isWiki={isWiki} noUnderline={noUnderline}>
      {children}
    </NodeLink>
  )
}

function NodeLink({
  id,
  children,
  isWiki,
  noUnderline,
}: { id: string } & Omit<PreviewLinkProps, 'href'>) {
  const { nodeById, setPreviewNode, setSidebarHighlightedNode, openContextMenu, outline } =
    usePreview()
  const node = nodeById[id]
  const [hovered, setHovered] = useState(false)
  const text = useNoteText(id, hovered)

  return (
    <HoverCard.Root
      lazyMount
      openDelay={300}
      closeDelay={150}
      positioning={{ placement: 'top-start', gutter: 12 }}
      onOpenChange={({ open }) => open && setHovered(true)}
    >
      <HoverCard.Trigger asChild>
        <Text
          as="a"
          tabIndex={0}
          display="inline"
          fontWeight={500}
          color="accent.fg"
          textDecoration={noUnderline ? undefined : 'underline'}
          cursor="pointer"
          _hover={{ textDecoration: 'none', bg: 'accent.subtle' }}
          onMouseEnter={() => node && setSidebarHighlightedNode(node)}
          onMouseLeave={() => setSidebarHighlightedNode(null)}
          onClick={() => node && setPreviewNode(node)}
          onKeyDown={(event) => event.key === 'Enter' && node && setPreviewNode(node)}
          onContextMenu={(event) => {
            event.preventDefault()
            if (node) openContextMenu(node, event)
          }}
        >
          {isWiki ? <>[[{children}]]</> : children}
        </Text>
      </HoverCard.Trigger>
      <Portal>
        <HoverCard.Positioner>
          <HoverCard.Content
            maxW="sm"
            p={0}
            onMouseEnter={() => node && setSidebarHighlightedNode(node)}
            onMouseLeave={() => setSidebarHighlightedNode(null)}
          >
            <HoverCard.Arrow>
              <HoverCard.ArrowTip />
            </HoverCard.Arrow>
            <Box
              maxH="300px"
              overflowY="auto"
              className="thin-scrollbar"
              px={4}
              py={3}
              fontSize="xs"
              color="black"
              css={{ ...defaultNoteStyle, ...(outline ? outlineNoteStyle : viewerNoteStyle) }}
            >
              {node && text !== null ? (
                <NoteContext.Provider value={{ outline, collapse: false }}>
                  <Suspense>
                    <OrgContent text={text} node={node as OrgRoamNode} />
                  </Suspense>
                </NoteContext.Provider>
              ) : (
                <Text color="fg.subtle">Loading…</Text>
              )}
            </Box>
          </HoverCard.Content>
        </HoverCard.Positioner>
      </Portal>
    </HoverCard.Root>
  )
}
