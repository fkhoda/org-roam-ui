/// <reference lib="webworker" />
// The force simulation, off the main thread: the page renders and handles input while this
// computes positions. It posts every node's position after each tick, as a flat array of
// x, y(, z) in the order of the nodes it was given.
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  forceZ,
} from 'd3-force-3d'
import type { LayoutConfig, LayoutRequest } from './layoutProtocol'

type SimNode = {
  id: string
  x?: number
  y?: number
  z?: number
  fx?: number | null
  fy?: number | null
  fz?: number | null
}

// force-graph stops its engine after 15s; keep that cap, the d3 settings rarely end sooner
const COOLDOWN_MS = 15000
const TICK_MS = 16

let simulation: ReturnType<typeof forceSimulation> | null = null
let nodes: SimNode[] = []
let version = 0
let dims = 2
let config: LayoutConfig | null = null
let started = 0
let timer: ReturnType<typeof setTimeout> | undefined
let dragging = false
// whether this graph's layout has come mostly to rest yet (told once: the view fits to it)
let settled = false

function applyConfig() {
  if (!simulation || !config) return
  const p = config.physics
  const gravity = p.gravityOn && !(config.isLocal && !p.gravityLocal)
  simulation
    .alphaDecay(p.alphaDecay)
    .alphaMin(p.alphaMin)
    .velocityDecay(p.velocityDecay)
    .force('x', gravity ? forceX().strength(p.gravity) : null)
    .force('y', gravity ? forceY().strength(p.gravity) : null)
    .force('z', gravity && dims === 3 ? forceZ().strength(p.gravity) : null)
    .force('center', p.centering ? forceCenter().strength(p.centeringStrength) : null)
    .force('collide', p.collision ? forceCollide().radius(p.collisionStrength) : null)
  const link = simulation.force('link')
  if (p.linkStrength) link.strength(p.linkStrength)
  if (p.linkIts) link.iterations(p.linkIts)
  const charge = simulation.force('charge')
  if (p.charge) charge.strength(p.charge)
}

function post() {
  const positions = new Float64Array(nodes.length * dims)
  nodes.forEach((node, i) => {
    positions[i * dims] = node.x ?? 0
    positions[i * dims + 1] = node.y ?? 0
    if (dims === 3) positions[i * dims + 2] = node.z ?? 0
  })
  postMessage({ type: 'positions', version, dims, positions }, [positions.buffer])
}

function run() {
  clearTimeout(timer)
  const loop = () => {
    if (!simulation) return
    const before = nodes.map((node) => [node.x ?? 0, node.y ?? 0, node.z ?? 0])
    simulation.tick()
    post()
    // settled: cooled down and no node moving much (the centering force isn't damped by the
    // cooling, so a graph can keep sliding toward the center after alpha is low)
    const moved = nodes.reduce(
      (most, node, i) =>
        Math.max(
          most,
          Math.hypot(
            (node.x ?? 0) - before[i][0],
            (node.y ?? 0) - before[i][1],
            (node.z ?? 0) - before[i][2],
          ),
        ),
      0,
    )
    if (!settled && simulation.alpha() < 0.05 && moved < 0.5) {
      settled = true
      postMessage({ type: 'settled', version })
    }
    const cooled =
      simulation.alpha() < simulation.alphaMin() || performance.now() - started > COOLDOWN_MS
    if (cooled && !dragging) return postMessage({ type: 'end', version })
    timer = setTimeout(loop, TICK_MS)
  }
  loop()
}

function reheat(alpha = 1) {
  if (!simulation) return
  simulation.alpha(alpha)
  started = performance.now()
  run()
}

onmessage = ({ data }: MessageEvent<LayoutRequest>) => {
  switch (data.type) {
    case 'graph': {
      version = data.version
      dims = data.dims
      nodes = data.nodes
      simulation?.stop()
      const sim = forceSimulation(nodes, dims)
        .stop()
        .force(
          'link',
          forceLink(data.links).id((node: SimNode) => node.id),
        )
        .force('charge', forceManyBody())
      simulation = sim
      config = data.config
      settled = false
      applyConfig()
      // the local graph starts from the center: settle it before the first frame
      for (let i = 0; i < data.warmupTicks; i++) sim.tick()
      started = performance.now()
      run()
      return
    }
    case 'config':
      // a new graph brings its config along: the same config right after it changes nothing
      if (JSON.stringify(data.config) === JSON.stringify(config)) return
      config = data.config
      applyConfig()
      return reheat()
    case 'drag': {
      const node = nodes.find((n) => n.id === data.id)
      if (!node) return
      node.fx = data.x
      node.fy = data.y
      if (dims === 3) node.fz = data.z
      if (!dragging) {
        dragging = true
        simulation?.alphaTarget(0.3)
        reheat(Math.max(simulation?.alpha() ?? 0, 0.3))
      }
      return
    }
    case 'release': {
      const node = nodes.find((n) => n.id === data.id)
      if (node) node.fx = node.fy = node.fz = null
      dragging = false
      simulation?.alphaTarget(0)
      return
    }
    case 'reheat':
      return reheat()
  }
}
