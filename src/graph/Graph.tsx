import { lazy, Suspense, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import ForceGraph2D, { type ForceGraphMethods, type ForceGraphProps } from 'react-force-graph-2d'
import type { LinksByNodeId, OrgRoamNode, Scope } from '../api'
import {
  algos,
  type Coloring,
  type Filter,
  type Local,
  type Mouse,
  type Physics,
  type TagColors,
  type Visuals,
} from '../config'
import { useAnimation } from '../hooks/useAnimation'
import { resolveColor } from '../theme/palette'
import { useTheme } from '../theme/ThemeProvider'
import { linkColor, makeColorMixer, nodeColor } from './colors'
import { drawLabel, nodeSize } from './drawLabels'
import { filterGraph, scopeGraph } from './filterGraph'
import { isLinkRelatedToNode, linkEnds, type GraphData, type GraphNode } from './links'
import { useLayoutWorker } from './useLayoutWorker'

const Graph3D = lazy(() => import('./Graph3D'))

export type GraphMethods = ForceGraphMethods<OrgRoamNode, { type: string }>
type Props2D = ForceGraphProps<OrgRoamNode, { type: string }>

export type LocalCommand = 'add' | 'replace' | 'remove'

export interface GraphProps {
  graphRef: RefObject<GraphMethods | undefined>
  graphData: GraphData
  linksByNodeId: LinksByNodeId
  physics: Physics
  filter: Filter
  visuals: Visuals
  mouse: Mouse
  local: Local
  coloring: Coloring
  tagColors: TagColors
  threeDim: boolean
  scope: Scope
  emacsNodeId: string | null
  /** a node hovered in the sidebar, highlighted in the graph too */
  sidebarHighlightedNode: OrgRoamNode | null
  dailyDir?: string
  width: number
  height: number
  onPreview: (node: OrgRoamNode) => void
  onLocal: (node: OrgRoamNode) => void
  onOpen: (node: OrgRoamNode) => void
  onContextMenu: (node: OrgRoamNode, event: MouseEvent) => void
  onBackgroundClick: () => void
}

const DOUBLE_CLICK_MS = 200
const FIT_MS = 400
// fitting a local graph of one or two nodes would zoom in all the way
const MAX_FIT_ZOOM = 3 // 2D scale
const MIN_FIT_DISTANCE = 250 // 3D camera distance

interface Point {
  x: number
  y: number
  z: number
}
/** The parts of the 3D graph's methods a fit uses. */
interface Graph3DMethods {
  camera: () => { position: Point; fov: number }
  controls: () => { target: Point }
  cameraPosition: (position: Point, lookAt: Point, ms: number) => void
}

/** Fit the graph in view, without zooming in further than a few nodes need. */
// the pending zoom limit of the last 2D fit: a newer fit or zoom replaces it
let clampTimer: ReturnType<typeof setTimeout> | undefined

function fitView(fg: GraphMethods | undefined, threeDim: boolean, nodes: GraphNode[]) {
  clearTimeout(clampTimer)
  if (!fg) return
  if (!threeDim) {
    fg.zoomToFit(FIT_MS, 80)
    clampTimer = setTimeout(() => {
      if (fg.zoom() > MAX_FIT_ZOOM) fg.zoom(MAX_FIT_ZOOM, FIT_MS)
    }, FIT_MS + 50)
    return
  }
  // 3D: one move to the box's center, from the current viewing angle, far enough to see it all
  const fg3 = fg as unknown as Graph3DMethods
  // from the nodes' positions: force-graph's getGraphBbox reads its 3D objects, which lag the
  // positions while its engine sleeps
  if (!nodes.length) return
  const axes = (['x', 'y', 'z'] as const).map((axis) => {
    const values = nodes.map((node) => node[axis] ?? 0)
    return [Math.min(...values), Math.max(...values)]
  })
  const [x, y, z] = axes.map(([low, high]) => (low + high) / 2)
  const center = { x, y, z }
  const radius = Math.hypot(...axes.map(([low, high]) => high - low)) / 2 + 40
  const { position, fov } = fg3.camera()
  const distance = Math.max(MIN_FIT_DISTANCE, radius / Math.sin((fov * Math.PI) / 360))
  const target = fg3.controls().target
  const direction = {
    x: position.x - target.x,
    y: position.y - target.y,
    z: position.z - target.z,
  }
  const length = Math.hypot(direction.x, direction.y, direction.z) || 1
  fg3.cameraPosition(
    {
      x: center.x + (direction.x / length) * distance,
      y: center.y + (direction.y / length) * distance,
      z: center.z + (direction.z / length) * distance,
    },
    center,
    FIT_MS,
  )
}

export function Graph(props: GraphProps) {
  const { graphRef, graphData, physics, filter, visuals, mouse, scope, threeDim } = props
  const { palette } = useTheme()

  const filtered = useMemo(
    () =>
      filterGraph(graphData, props.linksByNodeId, filter, {
        dailyDir: props.dailyDir,
        communities: props.coloring.method === 'community',
      }),
    [graphData, props.linksByNodeId, filter, props.dailyDir, props.coloring.method],
  )

  // the local graph keeps the node objects it already shows between updates: rebuild it from the
  // previous one when its inputs change (during render, so it never lags a frame behind)
  const neighbors = props.local.neighbors
  const [scoped, setScoped] = useState({
    scope,
    filtered,
    neighbors,
    data: { nodes: [], links: [] } as GraphData,
  })
  if (
    scope.nodeIds.length &&
    (scoped.scope !== scope || scoped.filtered !== filtered || scoped.neighbors !== neighbors)
  ) {
    setScoped({
      scope,
      filtered,
      neighbors,
      data: scopeGraph(scoped.data, scope, filtered, neighbors),
    })
  }

  const isLocal = scope.nodeIds.length > 0
  // the 3D graph loads lazily: count its mounts so the effects below run once it's there
  const [graphMounts, setGraphMounts] = useState(0)

  // the layout runs in a worker; the view fits to a new layout once it mostly settles, after the
  // first load, a change of local graph or a switch to 3D (not after drags or settings changes)
  const fitPending = useRef(true)
  const [fitTriggers, setFitTriggers] = useState({ roots: scope.nodeIds, threeDim })
  if (fitTriggers.roots !== scope.nodeIds || fitTriggers.threeDim !== threeDim) {
    setFitTriggers({ roots: scope.nodeIds, threeDim })
  }
  useEffect(() => {
    fitPending.current = true
  }, [fitTriggers])
  const layout = useLayoutWorker({
    graphRef,
    data: isLocal ? scoped.data : filtered,
    physics,
    isLocal,
    threeDim,
    warmupTicks: scope.nodeIds.length === 1 ? 100 : scope.nodeIds.length > 1 ? 20 : 0,
    mounts: graphMounts,
    onSettled: () => {
      // no graph yet (the 3D one loads lazily): keep the fit for its own layout
      if (!fitPending.current || !graphRef.current) return
      fitPending.current = false
      fitView(graphRef.current, threeDim, (isLocal ? scoped.data : filtered).nodes)
    },
  })

  // highlighting: the hovered node and its neighbors, fading in and out
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null)
  // the node that was highlighted last, still drawn while the highlight fades out
  const [lastHoverNode, setLastHoverNode] = useState<GraphNode | null>(null)
  const hover = (node: GraphNode | null) => {
    setHoverNode(node)
    if (node) setLastHoverNode(node)
  }
  const [dragging, setDragging] = useState(false)

  // the editor's current node and links hovered in the sidebar highlight too
  const [followed, setFollowed] = useState({
    emacs: props.emacsNodeId,
    sidebar: props.sidebarHighlightedNode,
  })
  if (followed.emacs !== props.emacsNodeId || followed.sidebar !== props.sidebarHighlightedNode) {
    // one update for both: two from the same `followed` would undo each other
    setFollowed({ emacs: props.emacsNodeId, sidebar: props.sidebarHighlightedNode })
    if (followed.emacs !== props.emacsNodeId && props.emacsNodeId) {
      hover(graphData.nodes.find((n) => n.id === props.emacsNodeId) ?? null)
    }
    if (followed.sidebar !== props.sidebarHighlightedNode) {
      hover(props.sidebarHighlightedNode?.id ? props.sidebarHighlightedNode : null)
    }
  }

  const [animatedOpacity, setOpacity] = useState(1)
  // in 3D every animation frame would recolor every node: highlight without the fade
  const animate = visuals.highlightAnim && !threeDim
  const opacity = animate ? animatedOpacity : hoverNode ? 1 : 0
  const easing = algos[visuals.algorithmName] ?? algos.Linear
  const [fadeIn, cancelFadeIn] = useAnimation(setOpacity, {
    duration: visuals.animationSpeed,
    easing,
  })
  const fadeOutFrom = useRef(1)
  const [fadeOut, cancelFadeOut] = useAnimation(
    (t) => setOpacity(Math.min(fadeOutFrom.current, 1 - t)),
    {
      duration: visuals.animationSpeed,
      easing,
    },
  )
  const [clear] = useAnimation(() => setOpacity(0), { duration: 0, easing })
  const latestOpacity = useRef(animatedOpacity)
  useEffect(() => {
    latestOpacity.current = animatedOpacity
  })
  useEffect(() => {
    if (!animate) return
    if (hoverNode) {
      cancelFadeOut()
      return fadeIn()
    }
    // don't start the fade out at 1 when moving quickly off a node that was fading in
    cancelFadeIn()
    fadeOutFrom.current = latestOpacity.current
    if (latestOpacity.current > 0.5) fadeOut()
    else clear()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animates hover changes only
  }, [hoverNode])

  const neighborhood = (node: GraphNode | null) => {
    if (!node) return new Set<string>()
    const links = filtered.linksByNodeId[node.id as string] ?? []
    return new Set([node.id as string, ...links.flatMap((link) => linkEnds(link))])
  }
  const highlighted = useMemo(() => neighborhood(hoverNode), [hoverNode, filtered]) // eslint-disable-line react-hooks/exhaustive-deps
  const wasHighlighted = useMemo(() => neighborhood(lastHoverNode), [lastHoverNode, filtered]) // eslint-disable-line react-hooks/exhaustive-deps
  const isHighlighted = (id: string) => highlighted.has(id) || wasHighlighted.has(id)

  const mixer = useMemo(() => makeColorMixer(palette), [palette])
  const colorContext = {
    palette,
    mixer,
    visuals,
    coloring: props.coloring,
    cluster: filtered.clusters,
    linksByNodeId: filtered.linksByNodeId,
    opacity,
  }
  const labelTextColor = resolveColor(visuals.labelTextColor, palette)
  const labelBackgroundColor = resolveColor(visuals.labelBackgroundColor, palette)

  const handleClick = (click: string, node: OrgRoamNode, event: MouseEvent) => {
    if (click === mouse.preview) props.onPreview(node)
    else if (click === mouse.local) props.onLocal(node)
    else if (click === mouse.follow) props.onOpen(node)
    else if (click === mouse.context) props.onContextMenu(node, event)
  }
  const lastClick = useRef(0)
  const scale = useRef(1)

  const common: Props2D = {
    graphData: isLocal ? scoped.data : filtered,
    width: props.width,
    height: props.height,
    backgroundColor: resolveColor(visuals.backgroundColor, palette),
    onZoom: ({ k }) => (scale.current = k),
    nodeColor: (node) =>
      nodeColor({
        ...colorContext,
        node: node as OrgRoamNode,
        highlighted: isHighlighted(node.id as string),
        emacsNodeId: props.emacsNodeId,
        tagColors: props.tagColors,
      }),
    nodeRelSize: visuals.nodeRel,
    nodeVal: (node) =>
      nodeSize({
        node,
        linksByNodeId: filtered.linksByNodeId,
        visuals,
        highlighted: isHighlighted(node.id as string),
        opacity,
      }) / Math.pow(scale.current, visuals.nodeZoomSize),
    nodeCanvasObject: (node, ctx, globalScale) =>
      drawLabel({
        node,
        ctx,
        globalScale,
        visuals,
        opacity,
        linksByNodeId: filtered.linksByNodeId,
        highlighted: isHighlighted(node.id as string),
        hovered: node.id === hoverNode?.id || node.id === lastHoverNode?.id,
        labelTextColor,
        labelBackgroundColor,
      }),
    nodeCanvasObjectMode: () => 'after',
    linkDirectionalParticles: visuals.particles ? visuals.particlesNumber : undefined,
    linkDirectionalParticleWidth: visuals.particlesWidth,
    linkDirectionalArrowLength: visuals.arrows ? visuals.arrowsLength : undefined,
    linkDirectionalArrowRelPos: visuals.arrowsPos,
    linkDirectionalArrowColor: visuals.arrowsColor
      ? () => resolveColor(visuals.arrowsColor, palette)
      : undefined,
    linkColor: (link) => {
      const [sourceId, targetId] = linkEnds(link)
      const lit = isLinkRelatedToNode(link, hoverNode) || isLinkRelatedToNode(link, lastHoverNode)
      // references and citations have their own colors when set
      const special =
        link.type === 'ref'
          ? [visuals.refLinkColor, visuals.refLinkHighlightColor]
          : link.type?.includes('cite')
            ? [visuals.citeLinkColor, visuals.citeLinkHighlightColor]
            : null
      if (special?.[0]) {
        const [color, highlight] = special
        const target = highlight || visuals.linkHighlight
        const mix = mixer[color]
        if (mix) {
          return lit && target
            ? mix[target](opacity)
            : mix[visuals.backgroundColor](visuals.highlightFade * opacity)
        }
      }
      return linkColor({ ...colorContext, sourceId, targetId, highlighted: lit })
    },
    linkWidth: (link) => {
      const lit = isLinkRelatedToNode(link, hoverNode) || isLinkRelatedToNode(link, lastHoverNode)
      // 3D draws links of width 0 as lines and others as cylinders, which are much slower:
      // only highlighted links get a width there
      if (threeDim && !lit) return 0
      if (visuals.highlightLinkSize === 1) return visuals.linkWidth
      return lit
        ? visuals.linkWidth * (1 + opacity * (visuals.highlightLinkSize - 1))
        : visuals.linkWidth
    },
    d3AlphaDecay: physics.alphaDecay,
    d3AlphaMin: physics.alphaMin,
    d3VelocityDecay: physics.velocityDecay,
    onEngineStop: () => layout.engineStopped(),
    onNodeClick: (node, event) => {
      // a second click within DOUBLE_CLICK_MS is a double click, else wait to see
      const isDouble = event.timeStamp - lastClick.current < DOUBLE_CLICK_MS
      lastClick.current = event.timeStamp
      if (isDouble) return handleClick('double', node as OrgRoamNode, event)
      const clickTime = lastClick.current
      setTimeout(() => {
        if (lastClick.current === clickTime) handleClick('click', node as OrgRoamNode, event)
      }, DOUBLE_CLICK_MS)
    },
    onNodeRightClick: (node, event) => handleClick('right', node as OrgRoamNode, event),
    onNodeHover: (node) => {
      if (!visuals.highlight || dragging) return
      if (!hoverNode) {
        cancelFadeOut()
        setOpacity(0)
      }
      hover(node)
    },
    onNodeDrag: (node) => {
      layout.drag(node)
      hover(node)
      setDragging(true)
    },
    onNodeDragEnd: (node) => {
      layout.release(node)
      hover(null)
      setDragging(false)
    },
  }

  return (
    <div style={{ overflow: 'hidden' }} onClick={props.onBackgroundClick}>
      {threeDim ? (
        <Suspense>
          <Graph3D
            {...(common as object)}
            graphRef={graphRef as never}
            onMount={() => setGraphMounts((n) => n + 1)}
            visuals={visuals}
            highlighted={highlighted}
            labelTextColor={labelTextColor}
            labelBackgroundColor={labelBackgroundColor}
          />
        </Suspense>
      ) : (
        <ForceGraph2D
          ref={graphRef}
          {...common}
          linkLineDash={(link) => {
            if (visuals.citeDashes && link.type?.includes('cite')) {
              return [visuals.citeDashLength, visuals.citeGapLength]
            }
            if (visuals.refDashes && link.type === 'ref') {
              return [visuals.refDashLength, visuals.refGapLength]
            }
            return null
          }}
        />
      )}
    </div>
  )
}
