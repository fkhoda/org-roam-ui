import { useContext, useEffect, useState } from 'react'
import { GraphRevisionContext } from '../../context'
import { noteUrl } from '../../editor'

/**
 * The org text of a node, fetched from the editor. `null` while loading; `enabled: false` waits
 * (link previews fetch on first hover).
 */
export function useNoteText(id: string | undefined, enabled = true) {
  // refetch after the editor saves a note (a graph update), keeping the old text meanwhile
  const revision = useContext(GraphRevisionContext)
  const [text, setText] = useState<{ id: string; text: string; revision: number } | null>(null)
  const current = text?.id === id && text?.revision === revision
  useEffect(() => {
    if (!id || !enabled || current) return
    const controller = new AbortController()
    fetch(noteUrl(id), { signal: controller.signal })
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((body) => setText({ id, text: body || '(empty node)', revision }))
      .catch((error: Error) => {
        if (error.name !== 'AbortError') {
          setText({ id, text: '(could not load the note)', revision })
        }
      })
    return () => controller.abort()
  }, [id, enabled, current, revision])
  return text && text.id === id ? text.text : null
}
