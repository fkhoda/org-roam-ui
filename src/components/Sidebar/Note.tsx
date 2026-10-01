import { View, ViewOff } from '@carbon/icons-react'
import { OperationalTag } from '@carbon/react'
import { lazy, Suspense } from 'react'
import type { OrgRoamNode } from '../../api'
import type { Filter, TagColors } from '../../config'
import { NoteContext } from '../../context'
import { linkEnds } from '../../graph/links'
import type { Setter } from '../../hooks/usePersistentState'
import { carbonTagType } from '../../theme/carbon'
import { PreviewLink } from './Link'
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
    <article className="note">
      <h1 className="note__title">{node.title}</h1>
      <TagBar node={node} filter={filter} setFilter={setFilter} tagColors={tagColors} />
      <div
        className={`org-note org-note--${outline ? 'outline' : 'viewer'}`}
        style={{ textAlign: textAlign as React.CSSProperties['textAlign'] }}
      >
        {text !== null && (
          <NoteContext.Provider value={{ outline, collapse }}>
            <Suspense>
              <OrgContent text={text} node={node} />
            </Suspense>
          </NoteContext.Provider>
        )}
      </div>
      <Backlinks node={node} />
    </article>
  )
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
    <div className="note__tags">
      {node.tags.map((tag) => {
        const hidden = filter.tagsBlacklist.includes(tag)
        const only = filter.tagsWhitelist.includes(tag)
        return (
          <span
            key={tag}
            onContextMenu={(event) => {
              event.preventDefault()
              openContextMenu(tag, event)
            }}
          >
            <OperationalTag
              size="sm"
              text={tag}
              type={(carbonTagType(tagColors[tag]) ?? 'teal') as 'teal'}
              renderIcon={hidden ? ViewOff : only ? View : undefined}
              onClick={() => cycle(tag)}
            />
          </span>
        )
      })}
    </div>
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
    <section className="backlinks">
      <h2>{`Linked references (${sources.length})`}</h2>
      <ul>
        {sources.map((id) => (
          <li key={id}>
            <PreviewLink href={`id:${id}`} noUnderline>
              {nodeById[id]?.title}
            </PreviewLink>
          </li>
        ))}
      </ul>
    </section>
  )
}
