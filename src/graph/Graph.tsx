import { Box } from '@chakra-ui/react'
import { forceCenter, forceCollide, forceX, forceY, forceZ } from 'd3-force-3d'
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

  // forces: gravity pulls nodes to the center, collision keeps them apart
  useEffect(() => {
    const fg = graphRef.current
    if (!fg) return
    const gravity = physics.gravityOn && !(isLocal && !physics.gravityLocal)
    fg.d3Force('x', gravity ? forceX().strength(physics.gravity) : null)
    fg.d3Force('y', gravity ? forceY().strength(physics.gravity) : null)
    if (threeDim) fg.d3Force('z', gravity ? forceZ().strength(physics.gravity) : null)
    fg.d3Force(
      'center',
      physics.centering ? forceCenter().strength(physics.centeringStrength) : null,
    )
    const link = fg.d3Force('link')
    if (physics.linkStrength) link?.strength(physics.linkStrength)
    if (physics.linkIts) link?.iterations(physics.linkIts)
    if (physics.charge) fg.d3Force('charge')?.strength(physics.charge)
    fg.d3Force(
      'collide',
      physics.collision ? forceCollide().radius(physics.collisionStrength) : null,
    )
    // changing forces alone doesn't restart a settled simulation
    fg.d3ReheatSimulation()
  }, [graphRef, physics, threeDim, isLocal, scope.nodeIds.length, graphMounts])

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
  if (followed.emacs !== props.emacsNodeId) {
    setFollowed({ ...followed, emacs: props.emacsNodeId })
    if (props.emacsNodeId) hover(graphData.nodes.find((n) => n.id === props.emacsNodeId) ?? null)
  }
  if (followed.sidebar !== props.sidebarHighlightedNode) {
    setFollowed({ ...followed, sidebar: props.sidebarHighlightedNode })
    hover(props.sidebarHighlightedNode?.id ? props.sidebarHighlightedNode : null)
  }

  const [animatedOpacity, setOpacity] = useState(1)
  const opacity = visuals.highlightAnim ? animatedOpacity : hoverNode ? 1 : 0
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
    if (!visuals.highlightAnim) return
    if (hoverNode) return fadeIn()
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
    warmupTicks: scope.nodeIds.length === 1 ? 100 : scope.nodeIds.length > 1 ? 20 : 0,
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
      if (visuals.highlightLinkSize === 1) return visuals.linkWidth
      const lit = isLinkRelatedToNode(link, hoverNode) || isLinkRelatedToNode(link, lastHoverNode)
      return lit
        ? visuals.linkWidth * (1 + opacity * (visuals.highlightLinkSize - 1))
        : visuals.linkWidth
    },
    d3AlphaDecay: physics.alphaDecay,
    d3AlphaMin: physics.alphaMin,
    d3VelocityDecay: physics.velocityDecay,
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
      hover(node)
      setDragging(true)
    },
    onNodeDragEnd: () => {
      hover(null)
      setDragging(false)
    },
  }

  return (
    <Box overflow="hidden" onClick={props.onBackgroundClick}>
      {threeDim ? (
        <Suspense>
          <Graph3D
            {...(common as object)}
            graphRef={graphRef as never}
            onMount={() => setGraphMounts((n) => n + 1)}
            visuals={visuals}
            highlighted={(id) => highlighted.has(id)}
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
    </Box>
  )
}
