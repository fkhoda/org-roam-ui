import { useCallback, useEffect, useRef, type Ref } from 'react'
import type { ForceGraphMethods, ForceGraphProps, NodeObject } from 'react-force-graph-3d'
import ForceGraph3D from 'react-force-graph-3d'
import SpriteText from 'three-spritetext'
import type { OrgRoamNode } from '../api'
import type { Visuals } from '../config'

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
function showLabels(sprites: Map<string, SpriteText>, labels: number, highlighted: Set<string>) {
  for (const [id, sprite] of sprites) sprite.visible = labels >= 3 || highlighted.has(id)
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
    () => showLabels(sprites.current, labels, highlighted),
    [highlighted, labels, nodeThreeObject],
  )

  return (
    <ForceGraph3D
      ref={graphRef as never}
      {...props}
      nodeThreeObjectExtend
      nodeOpacity={visuals.nodeOpacity}
      nodeResolution={visuals.nodeResolution}
      linkOpacity={visuals.linkOpacity}
      nodeThreeObject={nodeThreeObject}
      rendererConfig={{ antialias: true, powerPreference: 'high-performance' }}
    />
  )
}
