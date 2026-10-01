import { useEffect, useState } from 'react'
import { noteUrl } from '../../editor'

/**
 * The org text of a node, fetched from the editor. `null` while loading; `enabled: false` waits
 * (link previews fetch on first hover).
 */
export function useNoteText(id: string | undefined, enabled = true) {
  const [text, setText] = useState<{ id: string; text: string } | null>(null)
  useEffect(() => {
    if (!id || !enabled || text?.id === id) return
    const controller = new AbortController()
    fetch(noteUrl(id), { signal: controller.signal })
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((body) => setText({ id, text: body || '(empty node)' }))
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setText({ id, text: '(could not load the note)' })
      })
    return () => controller.abort()
  }, [id, enabled, text?.id])
  return text && text.id === id ? text.text : null
}
