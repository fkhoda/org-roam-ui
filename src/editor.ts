import ReconnectingWebSocket from 'partysocket/ws'
import type { OrgRoamNode } from './api'

// The editor serves this page and the note text on its HTTP port (35901) and talks over a websocket
// on 35903. `?ws=ws://host:port` points the page at another websocket, e.g. for development.
const wsUrl =
  new URLSearchParams(location.search).get('ws') ?? `ws://${location.hostname || 'localhost'}:35903`

// Emacs's server decodes the path twice (simple-httpd, then org-link-decode): encode twice.
const encode = (s: string) => encodeURIComponent(encodeURIComponent(s))

/** Where the org text of a node is served (relative: same server as the page). */
export const noteUrl = (id: string) => `/node/${encode(id)}`
/** Where an image linked from a note is served. */
export const imageUrl = (path: string) => `/img/${encode(path)}`

export type EditorSocket = ReconnectingWebSocket

export function connectEditor(onMessage: (message: { type: string; data: unknown }) => void) {
  const socket = new ReconnectingWebSocket(wsUrl)
  socket.addEventListener('message', (event) => {
    let message
    try {
      message = JSON.parse(event.data as string)
    } catch (error) {
      return console.error('bad message from the editor', error)
    }
    onMessage(message)
  })
  return socket
}

const send = (socket: EditorSocket | null, command: string, data: object) =>
  socket?.send(JSON.stringify({ command, data }))

export const openNode = (socket: EditorSocket | null, node: OrgRoamNode) =>
  send(socket, 'open', { id: node.id })

export const createNode = (socket: EditorSocket | null, node: OrgRoamNode) =>
  send(socket, 'create', { id: node.id, title: node.title, ref: node.properties.ROAM_REFS })

/** Delete a note's file; only file nodes can be deleted. */
export const deleteNode = (socket: EditorSocket | null, node: OrgRoamNode) =>
  node.level === 0 && send(socket, 'delete', { id: node.id, file: node.file })
