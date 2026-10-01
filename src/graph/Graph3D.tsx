import { useEffect, type Ref } from 'react'
import type { ForceGraphMethods, ForceGraphProps } from 'react-force-graph-3d'
import ForceGraph3D from 'react-force-graph-3d'
import SpriteText from 'three-spritetext'
import type { OrgRoamNode } from '../api'
import type { Visuals } from '../config'

// three.js is big: this module loads only when the 3D view is turned on

export interface Graph3DProps extends ForceGraphProps<OrgRoamNode, { type: string }> {
  graphRef: Ref<ForceGraphMethods<OrgRoamNode, { type: string }> | undefined>
  onMount: () => void
  visuals: Visuals
  highlighted: (id: string) => boolean
  labelTextColor: string
  labelBackgroundColor: string
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
  return (
    <ForceGraph3D
      ref={graphRef as never}
      {...props}
      nodeThreeObjectExtend
      nodeOpacity={visuals.nodeOpacity}
      nodeResolution={visuals.nodeResolution}
      linkOpacity={visuals.linkOpacity}
      nodeThreeObject={(node) => {
        // labels: 3 is "always, even in 3D", 1 and 2 only on highlight
        if (!visuals.labels || (visuals.labels < 3 && !highlighted(node.id as string))) {
          return undefined as never
        }
        const sprite = new SpriteText(node.title.substring(0, 40))
        sprite.color = labelTextColor
        sprite.backgroundColor = labelBackgroundColor
        sprite.fontFace = 'IBM Plex Sans'
        sprite.padding = 2
        sprite.textHeight = 8
        return sprite
      }}
    />
  )
}
