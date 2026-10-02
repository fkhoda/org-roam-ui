import type { Physics } from '../config'

/** What the layout worker needs to know about the physics settings. */
export interface LayoutConfig {
  physics: Physics
  /** the local graph has its own gravity setting */
  isLocal: boolean
}

export type LayoutRequest =
  | {
      type: 'graph'
      version: number
      dims: 2 | 3
      /** starting positions, so a changed graph continues from where it was */
      nodes: { id: string; x?: number; y?: number; z?: number }[]
      links: { source: string; target: string }[]
      config: LayoutConfig
      warmupTicks: number
    }
  | { type: 'config'; config: LayoutConfig }
  | { type: 'drag'; id: string; x: number; y: number; z?: number }
  | { type: 'release'; id: string }
  | { type: 'reheat' }

export type LayoutResponse =
  | { type: 'positions'; version: number; dims: number; positions: Float64Array }
  | { type: 'end'; version: number }
  /** the layout of a new graph came mostly to rest */
  | { type: 'settled'; version: number }
