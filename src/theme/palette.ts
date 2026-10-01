import { interpolate } from 'd3-interpolate'

/** A doom-themes style color set, as sent by Emacs or Neovim (`bg`, `fg`, `base0`..`base8`, ...). */
export type EditorTheme = Record<string, string>

/**
 * The color names the UI stores in settings (`gray.500`, `purple.500`, `white`, ...), resolved
 * against the editor theme. `white` and `black` are the theme's background and foreground, and
 * `gray.100`..`gray.900` its base ramp, so the names keep working on light and dark themes.
 */
export type Palette = Record<string, string>

export const accentNames = [
  'red',
  'orange',
  'yellow',
  'green',
  'cyan',
  'blue',
  'pink',
  'purple',
] as const

export function makePalette(theme: EditorTheme): Palette {
  const missing = interpolate(theme.base1, theme.base2)(0.2)
  return {
    white: theme.bg,
    black: theme.fg,
    'gray.100': theme.base1,
    'gray.200': missing,
    'gray.300': theme.base2,
    'gray.400': theme.base3,
    'gray.500': theme.base4,
    'gray.600': theme.base5,
    'gray.700': theme.base6,
    'gray.800': theme.base7,
    'gray.900': theme.base8,
    'red.500': theme.red,
    'orange.500': theme.orange,
    'yellow.500': theme.yellow,
    'green.500': theme.green,
    'cyan.500': theme.cyan,
    'blue.500': theme.blue,
    'teal.500': theme.blue,
    'pink.500': theme.magenta,
    'purple.500': theme.violet,
    'alt.100': theme['bg-alt'],
    'alt.900': theme['fg-alt'],
  }
}

/** The hex value of a color name, or the name itself when it is already a CSS color. */
export function resolveColor(name: string, palette: Palette): string {
  return palette[name] ?? name
}

/** CSS variable for a palette color name: `gray.500` -> `--orui-gray-500`. */
export const cssVar = (name: string) => `--orui-${name.replace('.', '-')}`

/** A palette color name as CSS: `gray.500` -> `var(--orui-gray-500)`; '' for none. */
export const cssColor = (name: string) => (name ? `var(${cssVar(name)})` : 'transparent')
