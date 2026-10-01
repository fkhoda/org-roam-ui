import { Launch } from '@carbon/icons-react'
import { Popover, PopoverContent } from '@carbon/react'
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { NoteContext } from '../../context'
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

  if (!type) return <span className="dead-link">{children}</span>
  if (/^https?$/.test(type)) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {children} <Launch size={12} />
      </a>
    )
  }

  let id = ''
  if (type === 'id') id = path
  else if (type.includes('cite')) {
    const node = nodeByCite[path]
    if (node && !node.properties.FILELESS) id = node.id
  }
  if (!id) return <span className="dead-link">{children}</span>
  return (
    <NodeLink id={id} isWiki={isWiki} noUnderline={noUnderline}>
      {children}
    </NodeLink>
  )
}

/** Open after hovering `openDelay` ms; stay open while the pointer is on the trigger or popover. */
function useHoverOpen(openDelay = 300, closeDelay = 150) {
  const [open, setOpen] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const schedule = (next: boolean, delay: number) => {
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOpen(next), delay)
  }
  return {
    open,
    hoverProps: {
      onMouseEnter: () => schedule(true, openDelay),
      onMouseLeave: () => schedule(false, closeDelay),
    },
    close: () => schedule(false, 0),
  }
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
  const { open, hoverProps, close } = useHoverOpen()
  const text = useNoteText(id, open)

  return (
    <Popover open={open} onRequestClose={close} align="top-start" autoAlign dropShadow caret>
      <a
        tabIndex={0}
        role="link"
        className={`node-link${noUnderline ? ' node-link--plain' : ''}`}
        onMouseEnter={() => {
          hoverProps.onMouseEnter()
          if (node) setSidebarHighlightedNode(node)
        }}
        onMouseLeave={() => {
          hoverProps.onMouseLeave()
          setSidebarHighlightedNode(null)
        }}
        onClick={() => {
          close()
          if (node) setPreviewNode(node)
        }}
        onKeyDown={(event) => event.key === 'Enter' && node && setPreviewNode(node)}
        onContextMenu={(event) => {
          event.preventDefault()
          close()
          if (node) openContextMenu(node, event)
        }}
      >
        {isWiki ? <>[[{children}]]</> : children}
      </a>
      <PopoverContent {...hoverProps}>
        <div
          className={`link-preview thin-scrollbar org-note org-note--${outline ? 'outline' : 'viewer'}`}
        >
          {node && text !== null ? (
            <NoteContext.Provider value={{ outline, collapse: false }}>
              <Suspense>
                <OrgContent text={text} node={node} />
              </Suspense>
            </NoteContext.Provider>
          ) : (
            <p className="loading-text">Loading…</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
