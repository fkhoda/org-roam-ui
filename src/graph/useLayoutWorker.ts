import { useEffect, useRef, type RefObject } from 'react'
import type { Physics } from '../config'
import type { GraphMethods } from './Graph'
import type { LayoutRequest, LayoutResponse } from './layoutProtocol'
import { linkEnds, type GraphData, type GraphNode } from './links'

interface Options {
  graphRef: RefObject<GraphMethods | undefined>
  /** the graph shown; a new object means a new layout */
  data: GraphData
  physics: Physics
  isLocal: boolean
  threeDim: boolean
  warmupTicks: number
  /** bumps when the graph component (re)mounts */
  mounts: number
  /** a new layout came mostly to rest */
  onSettled: () => void
}

/**
 * Run the force simulation in a worker. force-graph keeps rendering and handling input, with its
 * own forces off: each node is pinned (fx/fy/fz) where the worker puts it.
 */
export function useLayoutWorker(options: Options) {
  const { graphRef, data, physics, isLocal, threeDim, warmupTicks, mounts } = options
  const worker = useRef<Worker | null>(null)
  const version = useRef(0)
  const nodes = useRef<GraphNode[]>([])
  const dragged = useRef<string | null>(null)
  const engineStopped = useRef(false)
  const onSettled = useRef(options.onSettled)
  useEffect(() => {
    onSettled.current = options.onSettled
  })

  useEffect(() => {
    const w = new Worker(new URL('./layout.worker.ts', import.meta.url), { type: 'module' })
    w.onmessage = ({ data: message }: MessageEvent<LayoutResponse>) => {
      if (message.version !== version.current) return
      if (message.type === 'settled') return onSettled.current()
      if (message.type !== 'positions') return
      const { positions, dims } = message
      nodes.current.forEach((node, i) => {
        if (node.id === dragged.current) return
        // x too, not only the pin: a fit right after this (on "settled") reads x before
        // force-graph's next tick would copy fx over
        node.x = node.fx = positions[i * dims]
        node.y = node.fy = positions[i * dims + 1]
        if (dims === 3) node.z = node.fz = positions[i * dims + 2]
      })
      // force-graph only redraws while its engine runs: wake it to show the new positions
      if (engineStopped.current) {
        engineStopped.current = false
        graphRef.current?.d3ReheatSimulation()
      }
    }
    worker.current = w
    return () => w.terminate()
  }, [graphRef])

  const send = (request: LayoutRequest) => worker.current?.postMessage(request)
  const config = { physics, isLocal }

  // a new graph: start its layout from where its nodes are
  useEffect(() => {
    const fg = graphRef.current
    if (!fg) return
    // force-graph's own forces off; its link force stays to resolve link ends, at no strength
    for (const force of ['charge', 'center', 'x', 'y', 'z', 'collide']) fg.d3Force(force, null)
    fg.d3Force('link')?.strength(0)
    version.current += 1
    nodes.current = data.nodes
    send({
      type: 'graph',
      version: version.current,
      dims: threeDim ? 3 : 2,
      nodes: data.nodes.map(({ id, x, y, z }) => ({ id: id as string, x, y, z })),
      links: data.links.map((link) => {
        const [source, target] = linkEnds(link)
        return { source, target }
      }),
      config,
      warmupTicks,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- config goes along; changes below
  }, [data, threeDim, mounts])

  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    send({ type: 'config', config })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [physics, isLocal])

  return {
    drag(node: GraphNode) {
      dragged.current = node.id as string
      send({
        type: 'drag',
        id: node.id as string,
        x: node.fx ?? node.x ?? 0,
        y: node.fy ?? node.y ?? 0,
        z: node.fz ?? node.z,
      })
    },
    release(node: GraphNode) {
      dragged.current = null
      send({ type: 'release', id: node.id as string })
    },
    /** force-graph's engine stopped; the next positions wake it */
    engineStopped() {
      engineStopped.current = true
    },
  }
}
