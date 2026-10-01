// packages without type declarations

declare module 'jlouvain.js' {
  interface Louvain {
    nodes(ids: string[]): Louvain
    edges(edges: { source: string; target: string; weight: number }[]): Louvain
    (): Record<string, number>
  }
  export default function jLouvain(): Louvain
}

declare module 'd3-force-3d' {
  // the forces org-roam-ui uses, typed as loosely as force-graph accepts them
  type Force = ((alpha: number) => void) & Record<string, (...args: never[]) => unknown>
  export function forceX(): Force & { strength(s: number): Force }
  export function forceY(): Force & { strength(s: number): Force }
  export function forceZ(): Force & { strength(s: number): Force }
  export function forceCenter(): Force & { strength(s: number): Force }
  export function forceCollide(): Force & { radius(r: number): Force }
}
