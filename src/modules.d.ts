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
  // d3-force with a third dimension; typed as loosely as the layout worker uses it
  /* eslint-disable @typescript-eslint/no-explicit-any */
  type Chainable = ((alpha: number) => void) & { [method: string]: (...args: any[]) => any }
  export function forceSimulation(nodes?: object[], numDimensions?: number): Chainable
  export function forceLink(links?: object[]): Chainable
  export function forceManyBody(): Chainable
  export function forceCenter(): Chainable
  export function forceCollide(): Chainable
  export function forceX(): Chainable
  export function forceY(): Chainable
  export function forceZ(): Chainable
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
