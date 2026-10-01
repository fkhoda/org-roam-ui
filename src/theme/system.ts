import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'
import { accentNames, cssVar } from './palette'

// Every color token points at a CSS variable that ThemeProvider sets from the editor theme, so
// switching themes or the accent color never rebuilds the system.
const color = (name: string) => ({ value: `var(${cssVar(name)})` })
const mix = (name: string, percent: number, base = 'white') => ({
  value: `color-mix(in srgb, var(${cssVar(name)}) ${percent}%, var(${cssVar(base)}))`,
})

/** The semantic tokens Chakra components read from `colorPalette`. */
const semanticPalette = (name: string) => ({
  solid: color(name),
  contrast: color('white'),
  fg: color(name),
  muted: mix(name, 30),
  subtle: mix(name, 15),
  emphasized: mix(name, 45),
  focusRing: mix(name, 65),
})

const grays = Object.fromEntries(
  [100, 200, 300, 400, 500, 600, 700, 800, 900].map((n) => [n, color(`gray.${n}`)]),
)

const config = defineConfig({
  globalCss: {
    html: { colorPalette: 'accent' },
    body: { bg: 'bg', color: 'fg', overflow: 'hidden' },
  },
  theme: {
    tokens: {
      colors: {
        white: color('white'),
        black: color('black'),
        gray: grays,
        alt: { 100: color('alt.100'), 900: color('alt.900') },
        ...Object.fromEntries(accentNames.map((name) => [name, { 500: color(`${name}.500`) }])),
        teal: { 500: color('blue.500') },
      },
      fonts: {
        body: {
          value:
            '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif',
        },
        heading: { value: '{fonts.body}' },
      },
    },
    semanticTokens: {
      colors: {
        bg: {
          DEFAULT: color('white'),
          subtle: color('alt.100'),
          muted: color('gray.200'),
          emphasized: color('gray.300'),
          panel: color('white'),
        },
        fg: {
          DEFAULT: color('black'),
          muted: color('gray.800'),
          subtle: color('gray.700'),
        },
        border: {
          DEFAULT: color('gray.400'),
          muted: color('gray.300'),
          subtle: color('gray.200'),
          emphasized: color('gray.500'),
        },
        accent: {
          ...semanticPalette('accent'),
          // the accent with transparency, for focus rings and hover backgrounds
          focusRing: color('accent-border'),
        },
        gray: semanticPalette('gray.700'),
        ...Object.fromEntries(accentNames.map((name) => [name, semanticPalette(`${name}.500`)])),
      },
    },
    recipes: {
      button: {
        variants: {
          variant: {
            // icon buttons in toolbars: quiet until hovered
            subtle: {
              bg: 'transparent',
              color: 'fg.muted',
              _hover: { bg: 'transparent', color: 'colorPalette.fg' },
              _expanded: { bg: 'transparent', color: 'colorPalette.fg' },
            },
            ghost: {
              color: 'colorPalette.fg',
              _hover: { bg: 'colorPalette.subtle' },
              _expanded: { bg: 'colorPalette.subtle' },
            },
          },
        },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)
