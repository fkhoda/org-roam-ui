import { ChartNetwork, SidePanelClose, SidePanelOpen } from '@carbon/icons-react'
import { IconButton } from '@carbon/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { EditorVariables, OrgRoamGraphResponse, OrgRoamNode, Scope } from './api'
import { ContextMenu, DeleteNoteDialog } from './components/ContextMenu'
import type { ContextMenuTarget } from './components/Sidebar/PreviewContext'
import { Sidebar } from './components/Sidebar/Sidebar'
import { Tweaks } from './components/Tweaks/Tweaks'
import {
  initialBehavior,
  initialColoring,
  initialFilter,
  initialLocal,
  initialMouse,
  initialPhysics,
  initialVisuals,
  type TagColors,
} from './config'
import { VariablesContext } from './context'
import { connectEditor, openNode, type EditorSocket } from './editor'
import { mergeGraph, processGraph, type ProcessedGraph } from './graph/buildGraph'
import { Graph, type GraphMethods, type LocalCommand } from './graph/Graph'
import type { GraphData } from './graph/links'
import { useHistory } from './hooks/useHistory'
import { usePersistentState } from './hooks/usePersistentState'
import { useWindowSize } from './hooks/useWindowSize'
import { useTheme } from './theme/ThemeProvider'

const emptyGraph: ProcessedGraph = {
  nodes: [],
  links: [],
  nodeById: {},
  linksByNodeId: {},
  nodeByCite: {},
  tags: [],
}

type EditorCommand = {
  commandName: string
  id: string
  speed?: number
  padding?: number
  manipulation?: string
}

export default function App() {
  const [threeDim, setThreeDim] = usePersistentState('3d', false)
  const [tagColors, setTagColors] = usePersistentState<TagColors>('tagCols', {})
  const [physics, setPhysics] = usePersistentState('physics', initialPhysics)
  const [filter, setFilter] = usePersistentState('filter', initialFilter)
  const [visuals, setVisuals] = usePersistentState('visuals', initialVisuals)
  const [behavior, setBehavior] = usePersistentState('behavior', initialBehavior)
  const [mouse, setMouse] = usePersistentState('mouse', initialMouse)
  const [coloring, setColoring] = usePersistentState('coloring', initialColoring)
  const [local, setLocal] = usePersistentState('local', initialLocal)
  const { setTheme } = useTheme()

  const [graph, setGraph] = useState<ProcessedGraph>(emptyGraph)
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [variables, setVariables] = useState<EditorVariables>({ subDirs: [] })
  const [emacsNodeId, setEmacsNodeId] = useState<string | null>(null)
  const [scope, setScope] = useState<Scope>({ nodeIds: [], excludedNodeIds: [] })
  const preview = useHistory<OrgRoamNode | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarHighlightedNode, setSidebarHighlightedNode] = useState<OrgRoamNode | null>(null)
  const [menu, setMenu] = useState<{
    target: ContextMenuTarget
    at: { x: number; y: number }
  } | null>(null)
  const [toDelete, setToDelete] = useState<OrgRoamNode | null>(null)
  const [width, height] = useWindowSize()

  const graphRef = useRef<GraphMethods | undefined>(undefined)
  const socketRef = useRef<EditorSocket | null>(null)

  const pushPreview = preview.set
  const setPreviewNode = useCallback(
    (node: OrgRoamNode) => {
      pushPreview(node)
      setSidebarOpen(true)
    },
    [pushPreview],
  )

  const handleLocal = (node: OrgRoamNode, command: LocalCommand | string) => {
    if (command === 'remove') {
      setScope((s) => ({
        nodeIds: s.nodeIds.filter((id) => id !== node.id),
        excludedNodeIds: [...s.excludedNodeIds, node.id],
      }))
    } else if (command === 'replace') {
      setScope({ nodeIds: [node.id], excludedNodeIds: [] })
    } else if (!scope.nodeIds.includes(node.id)) {
      setScope((s) => ({
        excludedNodeIds: s.excludedNodeIds.filter((id) => id !== node.id),
        nodeIds: [...s.nodeIds, node.id],
      }))
    }
  }

  // follow the node the editor is on: color it, zoom to it, or open its local graph
  const follow = (how: string, id: string, speed = 2000, padding = 200) => {
    const fg = graphRef.current
    if (how === 'color' || !fg) return
    const near = new Set([
      id,
      ...(graph.linksByNodeId[id] ?? []).flatMap((l) => [l.source, l.target]),
    ])
    if (how === 'zoom') {
      if (scope.nodeIds.length) setScope((s) => ({ ...s, nodeIds: [] }))
      setTimeout(() => fg.zoomToFit(speed, padding, (node) => near.has(node.id as string)), 50)
      return
    }
    // local: add the node to the local graph when it is next to it, else start a new one
    const extend =
      behavior.localSame === 'add' &&
      scope.nodeIds.includes(id) &&
      scope.nodeIds.some((scoped) => near.has(scoped))
    setScope((s) => ({ ...s, nodeIds: extend ? [...s.nodeIds, id] : [id] }))
    setTimeout(() => {
      fg.centerAt(0, 0, 10)
      fg.zoomToFit(1, padding)
    }, 50)
  }

  // the socket outlives renders: it calls the latest handler through a ref
  const onMessage = useRef<(message: { type: string; data: unknown }) => void>(() => undefined)
  useEffect(() => {
    onMessage.current = ({ type, data }) => {
      switch (type) {
        case 'graphdata': {
          const next = processGraph(data as OrgRoamGraphResponse)
          setGraph(next)
          setGraphData((current) => mergeGraph(current ?? { nodes: [], links: [] }, next))
          return
        }
        case 'variables':
          return setVariables(data as EditorVariables)
        case 'theme':
          return setTheme(['custom', data as Record<string, string>])
        case 'command': {
          const command = data as EditorCommand
          switch (command.commandName) {
            case 'local':
              follow('local', command.id, behavior.zoomSpeed, behavior.zoomPadding)
              break
            case 'zoom':
              follow(
                'zoom',
                command.id,
                command.speed || behavior.zoomSpeed,
                command.padding || behavior.zoomPadding,
              )
              break
            case 'follow':
              follow(behavior.follow, command.id, behavior.zoomSpeed, behavior.zoomPadding)
              break
            case 'change-local-graph': {
              const node = graph.nodeById[command.id]
              if (node) handleLocal(node, command.manipulation ?? 'add')
              return
            }
            default:
              return console.warn('org-roam-ui: unknown command', command.commandName)
          }
          return setEmacsNodeId(command.id)
        }
      }
    }
  })
  useEffect(() => {
    const socket = connectEditor((message) => onMessage.current(message))
    socketRef.current = socket
    return () => socket.close()
  }, [])

  // fit the view when entering, leaving or replacing the local graph
  useEffect(() => {
    const fg = graphRef.current
    if (!fg || scope.nodeIds.length > 1) return
    if (!scope.nodeIds.length && physics.gravityOn) {
      fg.zoomToFit()
      return
    }
    const timer = setTimeout(() => fg.zoomToFit(5, 200), 50)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the local graph's roots change
  }, [scope.nodeIds])

  const openContextMenu = useCallback(
    (target: ContextMenuTarget, event: React.MouseEvent | MouseEvent) =>
      setMenu({ target, at: { x: event.clientX, y: event.clientY } }),
    [],
  )

  return (
    <VariablesContext.Provider value={variables}>
      <div className="app">
        <Tweaks
          {...{
            physics,
            setPhysics,
            threeDim,
            setThreeDim,
            filter,
            setFilter,
            visuals,
            setVisuals,
            mouse,
            setMouse,
            behavior,
            setBehavior,
            tagColors,
            setTagColors,
            coloring,
            setColoring,
            local,
            setLocal,
          }}
          tags={graph.tags}
        />
        <div className="graph-layer">
          {graphData && (
            <Graph
              graphRef={graphRef}
              graphData={graphData}
              linksByNodeId={graph.linksByNodeId}
              {...{
                physics,
                filter,
                visuals,
                mouse,
                local,
                coloring,
                tagColors,
                threeDim,
                scope,
                emacsNodeId,
              }}
              sidebarHighlightedNode={sidebarHighlightedNode}
              dailyDir={variables.dailyDir}
              width={width}
              height={height}
              onPreview={setPreviewNode}
              onLocal={(node) => handleLocal(node, behavior.localSame)}
              onOpen={(node) => openNode(socketRef.current, node)}
              onContextMenu={openContextMenu}
              onBackgroundClick={() => setMenu(null)}
            />
          )}
        </div>
        <header className="header-bar">
          {scope.nodeIds.length > 0 && (
            <IconButton
              label="Return to the main graph"
              kind="ghost"
              align="bottom"
              onClick={() => setScope((s) => ({ ...s, nodeIds: [] }))}
            >
              <ChartNetwork />
            </IconButton>
          )}
          <IconButton
            label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            kind="ghost"
            align="bottom-end"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? <SidePanelClose /> : <SidePanelOpen />}
          </IconButton>
        </header>
        <div style={{ position: 'relative', zIndex: 4 }}>
          <Sidebar
            isOpen={sidebarOpen}
            previewNode={preview.value}
            history={preview}
            windowWidth={width}
            filter={filter}
            setFilter={setFilter}
            tagColors={tagColors}
            preview={{
              nodeById: graph.nodeById,
              linksByNodeId: graph.linksByNodeId,
              nodeByCite: graph.nodeByCite,
              setPreviewNode,
              setSidebarHighlightedNode,
              openContextMenu,
              macros: variables.katexMacros ?? {},
              attachDir: variables.attachDir ?? '',
              useInheritance: variables.useInheritance ?? false,
            }}
          />
        </div>
        {menu && (
          <ContextMenu
            target={menu.target}
            at={menu.at}
            onClose={() => setMenu(null)}
            onDelete={setToDelete}
            scope={scope}
            onLocal={handleLocal}
            setPreviewNode={setPreviewNode}
            socket={socketRef}
            {...{ filter, setFilter, tagColors, setTagColors }}
          />
        )}
        <DeleteNoteDialog node={toDelete} onClose={() => setToDelete(null)} socket={socketRef} />
      </div>
    </VariablesContext.Provider>
  )
}
