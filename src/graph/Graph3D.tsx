import { useCallback, useEffect, useRef, type Ref, type RefObject } from 'react'
import type { ForceGraphMethods, ForceGraphProps, NodeObject } from 'react-force-graph-3d'
import ForceGraph3D from 'react-force-graph-3d'
import { Vector3 } from 'three'
import SpriteText from 'three-spritetext'
import type { OrgRoamNode } from '../api'
import { algos, type Visuals } from '../config'
import { rotateAroundPointer } from './pivotRotation'

// three.js is big: this module loads only when the 3D view is turned on

export interface Graph3DProps extends ForceGraphProps<OrgRoamNode, { type: string }> {
  graphRef: Ref<ForceGraphMethods<OrgRoamNode, { type: string }> | undefined>
  onMount: () => void
  visuals: Visuals
  /** ids of the nodes highlighted now */
  highlighted: Set<string>
  labelTextColor: string
  labelBackgroundColor: string
}

/** Show labels per the setting: all of them (3), or only highlighted nodes' (1, 2). */
interface Fade {
  duration: number
  easing: (t: number) => number
}

/**
 * Show labels per the setting: all of them (3), or only highlighted nodes' (1, 2), fading them in
 * and out by their material's opacity: only the changing labels animate, without React renders.
 * Returns a function cancelling the animation.
 */
function showLabels(
  sprites: Map<string, SpriteText>,
  labels: number,
  highlighted: Set<string>,
  fade: Fade | null,
) {
  const changing: { sprite: SpriteText; from: number; to: number }[] = []
  for (const [id, sprite] of sprites) {
    const to = labels >= 3 || highlighted.has(id) ? 1 : 0
    const from = sprite.visible ? sprite.material.opacity : 0
    if (from === to) continue
    if (!fade) {
      sprite.visible = to === 1
      sprite.material.opacity = 1
      continue
    }
    sprite.visible = true
    changing.push({ sprite, from, to })
  }
  if (!changing.length) return () => {}
  const begin = performance.now()
  let frame = requestAnimationFrame(function step(now) {
    // a frame's timestamp can precede `begin` slightly
    const t = Math.max(0, Math.min((now - begin) / fade!.duration, 1))
    const eased = fade!.easing(t)
    for (const { sprite, from, to } of changing) {
      sprite.material.opacity = from + (to - from) * eased
      if (t === 1 && to === 0) sprite.visible = false
    }
    if (t < 1) frame = requestAnimationFrame(step)
  })
  return () => cancelAnimationFrame(frame)
}

export default function Graph3D({
  graphRef,
  onMount,
  visuals,
  highlighted,
  labelTextColor,
  labelBackgroundColor,
  ...props
}: Graph3DProps) {
  // once: the parent passes a new callback on every render
  useEffect(() => onMount(), []) // eslint-disable-line react-hooks/exhaustive-deps

  // rotate around the point under the cursor
  const nodes = useRef(props.graphData?.nodes ?? [])
  useEffect(() => {
    nodes.current = props.graphData?.nodes ?? []
  })
  useEffect(() => {
    const fg = (graphRef as RefObject<ForceGraphMethods<OrgRoamNode> | undefined>).current
    if (!fg) return
    return rotateAroundPointer({
      camera: fg.camera(),
      controls: fg.controls() as Parameters<typeof rotateAroundPointer>[0]['controls'],
      element: fg.renderer().domElement,
      positions: () => nodes.current.map((n) => new Vector3(n.x ?? 0, n.y ?? 0, n.z ?? 0)),
    })
  }, [graphRef])

  // Labels are textures: drawing one is slow, and force-graph rebuilds every node's object when
  // nodeThreeObject changes. Build each label once per look, then only show or hide it on hover.
  const sprites = useRef(new Map<string, SpriteText>())
  const labels = visuals.labels
  const nodeVal = props.nodeVal
  const nodeRelSize = props.nodeRelSize ?? 4
  const nodeVals = useRef(nodeVal)
  const highlightedNow = useRef(highlighted)
  useEffect(() => {
    nodeVals.current = nodeVal
    highlightedNow.current = highlighted
  })
  const nodeThreeObject = useCallback(
    (node: NodeObject<OrgRoamNode>) => {
      if (!labels) return undefined as never
      const sprite = new SpriteText(node.title.substring(0, 40))
      sprite.color = labelTextColor
      sprite.backgroundColor = labelBackgroundColor
      sprite.fontFace = 'IBM Plex Sans'
      sprite.padding = 2
      sprite.textHeight = 8
      // below the node, like the 2D labels: radius = cbrt(size) * relative size
      const value = nodeVals.current
      const size = typeof value === 'function' ? value(node) : 1
      sprite.position.y = -(Math.cbrt(size) * nodeRelSize + sprite.textHeight)
      // drawn after every node and link, so nothing hides part of a label
      sprite.material.depthTest = false
      sprite.renderOrder = 999
      // hover detection raycasts every object on each mouse move, hidden ones included:
      // labels aren't hoverable
      sprite.raycast = () => {}
      sprite.visible = labels >= 3 || highlightedNow.current.has(node.id as string)
      sprites.current.set(node.id as string, sprite)
      return sprite
    },
    [labels, labelTextColor, labelBackgroundColor, nodeRelSize],
  )

  // 3 is "always, even in 3D"; 1 and 2 show labels on highlight only
  useEffect(
    () =>
      showLabels(
        sprites.current,
        labels,
        highlighted,
        visuals.highlightAnim
          ? {
              duration: visuals.animationSpeed,
              easing: algos[visuals.algorithmName] ?? algos.Linear,
            }
          : null,
      ),
    [
      highlighted,
      labels,
      nodeThreeObject,
      visuals.highlightAnim,
      visuals.animationSpeed,
      visuals.algorithmName,
    ],
  )

  return (
    <ForceGraph3D
      ref={graphRef as never}
      {...props}
      // orbit controls pan and zoom; rotation goes around the cursor (pivotRotation)
      controlType="orbit"
      nodeThreeObjectExtend
      nodeOpacity={visuals.nodeOpacity}
      nodeResolution={visuals.nodeResolution}
      linkOpacity={visuals.linkOpacity}
      nodeThreeObject={nodeThreeObject}
      rendererConfig={{ antialias: true, powerPreference: 'high-performance' }}
    />
  )
}
