import { Easing } from '@tweenjs/tween.js'

type EasingFunction = (amount: number) => number

// the easings by name ("QuadraticIn", "CircularOut", ...), for the highlight animation

const algorithms: Record<string, EasingFunction> = {}
for (const [type, modes] of Object.entries(Easing)) {
  if (typeof modes !== 'object') continue
  for (const [mode, fn] of Object.entries(modes as Record<string, EasingFunction>)) {
    const name = type === 'Linear' && mode === 'None' ? 'Linear' : type + mode

    algorithms[name] = fn
  }
}

export const algos = algorithms

export const initialPhysics = {
  enabled: true,
  charge: -700,
  collision: true,
  collisionStrength: 20,
  centering: true,
  centeringStrength: 0.2,
  linkStrength: 0.3,
  linkIts: 1,
  alphaDecay: 0.05,
  alphaTarget: 0,
  alphaMin: 0,
  velocityDecay: 0.25,
  gravity: 0.3,
  gravityOn: true,
  gravityLocal: false,
}

export const initialFilter = {
  orphans: false,
  dailies: false,
  parent: 'heading',
  filelessCites: false,
  tagsBlacklist: [] as string[],
  tagsWhitelist: [] as string[],
  dirsBlocklist: [] as string[],
  dirsAllowlist: [] as string[],
  bad: true,
  noter: true,
}
export const initialColoring = {
  method: 'degree',
}

export const initialVisuals = {
  particles: false,
  particlesNumber: 0,
  particlesWidth: 4,
  arrows: false,
  arrowsLength: 1,
  arrowsPos: 0.5,
  arrowsColor: '',
  linkOpacity: 0.8,
  linkWidth: 1,
  nodeRel: 3,
  nodeOpacity: 1,
  nodeResolution: 12,
  labels: 2,
  labelScale: 1.5,
  labelFontSize: 10,
  labelLength: 40,
  labelWordWrap: 25,
  labelLineSpace: 1,
  labelDynamicDegree: 8,
  labelDynamicStrength: 0.5,
  highlight: true,
  highlightNodeSize: 1.1,
  highlightLinkSize: 0.7,
  highlightFade: 0.8,
  highlightAnim: true,
  animationSpeed: 360,
  algorithmName: 'CircularOut',
  linkColorScheme: 'gray.500',
  nodeColorScheme: [
    'red.500',
    'gray.600',
    'yellow.500',
    'green.500',
    'cyan.500',
    'blue.500',
    'pink.500',
    'purple.500',
    'orange.500',
  ],
  nodeHighlight: 'purple.500',
  linkHighlight: 'purple.500',
  backgroundColor: 'white',
  emacsNodeColor: 'gray.800',
  labelTextColor: 'black',
  labelBackgroundColor: '',
  labelBackgroundOpacity: 0.7,
  citeDashes: true,
  citeDashLength: 35,
  citeGapLength: 15,
  citeLinkColor: 'gray.700',
  citeLinkHighlightColor: '',
  citeNodeColor: 'black',
  refDashes: true,
  refDashLength: 35,
  refGapLength: 15,
  refLinkColor: 'gray.700',
  refLinkHighlightColor: '',
  refNodeColor: 'black',
  nodeSizeLinks: 0.5,
  nodeZoomSize: 1.2,
}

export type TagColors = Record<string, string>

export const initialBehavior = {
  follow: 'zoom',
  localSame: 'add',
  zoomPadding: 200,
  zoomSpeed: 2000,
}

export const initialMouse = {
  highlight: 'hover',
  local: 'double',
  follow: 'never',
  context: 'right',
  preview: 'click',
  backgroundExitsLocal: false,
}

export const initialLocal = {
  neighbors: 1,
}

export const colorList = [
  'red.500',
  'orange.500',
  'yellow.500',
  'green.500',
  'cyan.500',
  'blue.500',
  'pink.500',
  'purple.500',
  'white',
  'gray.100',
  'gray.200',
  'gray.300',
  'gray.400',
  'gray.500',
  'gray.600',
  'gray.700',
  'gray.800',
  'gray.900',
  'black',
]

export type Physics = typeof initialPhysics
export type Filter = typeof initialFilter
export type Visuals = typeof initialVisuals
export type Coloring = typeof initialColoring
export type Behavior = typeof initialBehavior
export type Mouse = typeof initialMouse
export type Local = typeof initialLocal
