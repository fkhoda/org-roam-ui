import type { Palette } from './palette'

/**
 * Carbon's color tokens (`--cds-*`) from the editor theme. Carbon's g100 theme fills in the
 * rest (shadows, overlay, syntax); these cover what the UI shows. Hover and active states
 * mix toward the foreground, so they work on light and dark themes alike.
 */
export function carbonTokens(palette: Palette, accent: string): Record<string, string> {
  const bg = palette.white
  const fg = palette.black
  const bgAlt = palette['alt.100']
  const mix = (color: string, base: string, percent: number) =>
    `color-mix(in srgb, ${color} ${percent}%, ${base})`
  const toward = (base: string, percent: number) => mix(fg, base, percent)

  // the layers sit in steps from the sidebar's background toward the foreground
  const layer = (n: number) => toward(bgAlt, 6 * (n - 1))
  const layers: Record<string, string> = {}
  for (const n of [1, 2, 3]) {
    const base = layer(n)
    Object.assign(layers, {
      [`layer0${n}`]: base,
      [`layerHover0${n}`]: toward(base, 6),
      [`layerActive0${n}`]: toward(base, 14),
      [`layerSelected0${n}`]: toward(base, 10),
      [`layerSelectedHover0${n}`]: toward(base, 14),
      [`layerAccent0${n}`]: toward(base, 16),
      [`layerAccentHover0${n}`]: toward(base, 20),
      [`layerAccentActive0${n}`]: toward(base, 26),
      [`field0${n}`]: toward(base, 7),
      [`fieldHover0${n}`]: toward(base, 12),
      [`borderSubtle0${n}`]: palette['gray.400'],
      [`borderSubtleSelected0${n}`]: palette['gray.500'],
      [`borderStrong0${n}`]: palette['gray.600'],
      [`borderTile0${n}`]: palette['gray.500'],
    })
  }

  // Carbon tag colors: its hues, with two of its grays standing in for orange and yellow, and
  // teal for the accent (tags without a color of their own)
  const tagHues: Record<string, string> = {
    red: palette['red.500'],
    magenta: palette['pink.500'],
    purple: palette['purple.500'],
    blue: palette['blue.500'],
    cyan: palette['cyan.500'],
    teal: accent,
    green: palette['green.500'],
    gray: palette['gray.700'],
    warmGray: palette['orange.500'],
    coolGray: palette['yellow.500'],
  }
  const tags: Record<string, string> = {}
  for (const [hue, color] of Object.entries(tagHues)) {
    const name = hue[0].toUpperCase() + hue.slice(1)
    Object.assign(tags, {
      [`tagBackground${name}`]: mix(color, bg, 18),
      [`tagColor${name}`]: color,
      [`tagHover${name}`]: mix(color, bg, 30),
      [`tagBorder${name}`]: color,
    })
  }

  const tokens: Record<string, string> = {
    background: bg,
    backgroundHover: toward(bg, 8),
    backgroundActive: toward(bg, 16),
    backgroundSelected: toward(bg, 12),
    backgroundSelectedHover: toward(bg, 16),
    backgroundInverse: fg,
    backgroundInverseHover: toward(fg, 0),
    backgroundBrand: accent,
    layerBackground01: bgAlt,
    layerBackground02: layer(2),
    layerBackground03: layer(3),
    ...layers,
    borderSubtle00: palette['gray.400'],
    borderInteractive: accent,
    borderDisabled: palette['gray.300'],
    borderInverse: fg,
    textPrimary: fg,
    textSecondary: mix(fg, bg, 78),
    textPlaceholder: palette['gray.600'],
    textHelper: palette['gray.700'],
    textOnColor: bg,
    textOnColorDisabled: palette['gray.600'],
    textInverse: bg,
    textDisabled: palette['gray.500'],
    textError: palette['red.500'],
    linkPrimary: accent,
    linkPrimaryHover: mix(accent, fg, 75),
    linkSecondary: mix(accent, fg, 75),
    linkVisited: palette['purple.500'],
    linkInverse: accent,
    iconPrimary: fg,
    iconSecondary: palette['gray.800'],
    iconOnColor: bg,
    iconInverse: bg,
    iconInteractive: accent,
    iconDisabled: palette['gray.500'],
    interactive: accent,
    focus: accent,
    focusInset: bg,
    focusInverse: bg,
    highlight: mix(accent, bg, 25),
    supportError: palette['red.500'],
    supportSuccess: palette['green.500'],
    supportWarning: palette['yellow.500'],
    supportInfo: palette['blue.500'],
    supportCautionMajor: palette['orange.500'],
    supportCautionMinor: palette['yellow.500'],
    toggleOff: palette['gray.600'],
    skeletonBackground: palette['gray.200'],
    skeletonElement: palette['gray.400'],
    buttonPrimary: accent,
    buttonPrimaryHover: mix(accent, fg, 85),
    buttonPrimaryActive: mix(accent, fg, 70),
    buttonSecondary: palette['gray.600'],
    buttonSecondaryHover: palette['gray.700'],
    buttonSecondaryActive: palette['gray.800'],
    buttonTertiary: accent,
    buttonTertiaryHover: mix(accent, fg, 85),
    buttonTertiaryActive: mix(accent, fg, 70),
    buttonDangerPrimary: palette['red.500'],
    buttonDangerSecondary: palette['red.500'],
    buttonDangerHover: mix(palette['red.500'], fg, 85),
    buttonDangerActive: mix(palette['red.500'], fg, 70),
    buttonSeparator: palette['gray.400'],
    buttonDisabled: palette['gray.400'],
    ...tags,
  }
  return Object.fromEntries(
    Object.entries(tokens).map(([name, value]) => [`--cds-${kebab(name)}`, value]),
  )
}

/** `layerHover01` -> `layer-hover-01`, `tagBackgroundCoolGray` -> `tag-background-cool-gray` */
const kebab = (name: string) => name.replace(/([a-z])([A-Z]|\d+)/g, '$1-$2').toLowerCase()

/** The Carbon tag type showing a palette color (`red.500`), see the tag hues above. */
export function carbonTagType(color: string | undefined) {
  const hue = color?.split('.')[0]
  const types: Record<string, string> = {
    red: 'red',
    orange: 'warm-gray',
    yellow: 'cool-gray',
    green: 'green',
    cyan: 'cyan',
    blue: 'blue',
    pink: 'magenta',
    purple: 'purple',
    gray: 'gray',
  }
  return (hue && types[hue]) || undefined
}
