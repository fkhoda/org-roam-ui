import { Box, Flex, Heading, Stack, StackSeparator, Tag, Text } from '@chakra-ui/react'
import { lazy, Suspense } from 'react'
import { LuEye, LuEyeOff } from 'react-icons/lu'
import type { OrgRoamNode } from '../../api'
import type { Filter, TagColors } from '../../config'
import { NoteContext } from '../../context'
import { linkEnds } from '../../graph/links'
import { accentNames } from '../../theme/palette'
import type { Setter } from '../../hooks/usePersistentState'
import { PreviewLink } from './Link'
import { defaultNoteStyle, outlineNoteStyle, viewerNoteStyle } from './noteStyle'
import { usePreview } from './PreviewContext'
import { useNoteText } from './useNoteText'

// the org pipeline (unified, uniorg, KaTeX) loads with the first preview
const OrgContent = lazy(() => import('../../org/OrgContent'))

export interface NoteProps {
  node: OrgRoamNode
  textAlign: string
  collapse: boolean
  filter: Filter
  setFilter: Setter<Filter>
  tagColors: TagColors
}

/** The previewed note: title, tags, text and backlinks. */
export function Note({ node, textAlign, collapse, filter, setFilter, tagColors }: NoteProps) {
  const { outline } = usePreview()
  const text = useNoteText(node.id)
  return (
    <Stack gap={2} pl={4} pr={8} pb={10}>
      <Heading size="lg" lineHeight={1.2} fontWeight={600} pt={4} maxW="90%">
        {node.title}
      </Heading>
      <TagBar node={node} filter={filter} setFilter={setFilter} tagColors={tagColors} />
      <Box
        className="org"
        css={{ ...defaultNoteStyle, ...(outline ? outlineNoteStyle : viewerNoteStyle), textAlign }}
      >
        {text !== null && (
          <NoteContext.Provider value={{ outline, collapse }}>
            <Suspense>
              <OrgContent text={text} node={node} />
            </Suspense>
          </NoteContext.Provider>
        )}
      </Box>
      <Backlinks node={node} />
    </Stack>
  )
}

// tag colors are names like `red.500`; only the accent hues and gray have a Chakra palette
const tagPalette = (color?: string) => {
  const hue = color?.split('.')[0]
  return hue && (accentNames as readonly string[]).includes(hue)
    ? hue
    : hue === 'gray'
      ? 'gray'
      : 'accent'
}

/** The note's tags; clicking one cycles it through hidden, the only shown, and neither. */
function TagBar({
  node,
  filter,
  setFilter,
  tagColors,
}: {
  node: OrgRoamNode
  filter: Filter
  setFilter: Setter<Filter>
  tagColors: TagColors
}) {
  const { openContextMenu } = usePreview()
  if (!node.tags?.length || node.tags[0] === null) return null
  const cycle = (tag: string) =>
    setFilter((current) => {
      if (current.tagsBlacklist.includes(tag)) {
        return {
          ...current,
          tagsBlacklist: current.tagsBlacklist.filter((t) => t !== tag),
          tagsWhitelist: [...current.tagsWhitelist, tag],
        }
      }
      if (current.tagsWhitelist.includes(tag)) {
        return { ...current, tagsWhitelist: current.tagsWhitelist.filter((t) => t !== tag) }
      }
      return { ...current, tagsBlacklist: [...current.tagsBlacklist, tag] }
    })
  return (
    <Flex flexWrap="wrap" gap={2}>
      {node.tags.map((tag) => {
        const hidden = filter.tagsBlacklist.includes(tag)
        const only = filter.tagsWhitelist.includes(tag)
        return (
          <Tag.Root
            key={tag}
            asChild
            size="sm"
            variant="outline"
            colorPalette={tagPalette(tagColors[tag])}
          >
            <button
              onClick={() => cycle(tag)}
              onContextMenu={(event) => {
                event.preventDefault()
                openContextMenu(tag, event)
              }}
            >
              <Tag.Label>{tag}</Tag.Label>
              {(hidden || only) && (
                <Tag.EndElement>{hidden ? <LuEyeOff /> : <LuEye />}</Tag.EndElement>
              )}
            </button>
          </Tag.Root>
        )
      })}
    </Flex>
  )
}

/** The notes that link here. */
function Backlinks({ node }: { node: OrgRoamNode }) {
  const { linksByNodeId, nodeById } = usePreview()
  const sources = [
    ...new Set(
      (linksByNodeId[node.id] ?? [])
        .map((link) => linkEnds(link))
        .filter(([source]) => source !== node.id)
        .map(([source]) => source),
    ),
  ]
  return (
    <Box className="backlinks" borderRadius="sm" mt={6} p={4} bg="white">
      <Text fontSize="md" fontWeight={600}>{`Linked references (${sources.length})`}</Text>
      <Stack py={2} gap={3} separator={<StackSeparator borderColor="gray.500" />} color="gray.800">
        {sources.map((id) => (
          <Box key={id} py={1} overflow="hidden">
            <PreviewLink href={`id:${id}`} noUnderline>
              {nodeById[id]?.title}
            </PreviewLink>
          </Box>
        ))}
      </Stack>
    </Box>
  )
}
