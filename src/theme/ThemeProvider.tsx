import { createContext, useContext, useLayoutEffect, useMemo, type ReactNode } from 'react'
import { usePersistentState, type Setter } from '../hooks/usePersistentState'
import { cssVar, makePalette, type EditorTheme, type Palette } from './palette'
import { carbonTokens } from './carbon'
import { themes } from './themes'

/** The active theme: its name ("custom" when the editor sent it) and colors. */
export type NamedTheme = [name: string, colors: EditorTheme]

export interface ThemeState {
  theme: NamedTheme
  setTheme: Setter<NamedTheme>
  /** The accent color's name, e.g. `purple.500`. */
  highlightColor: string
  setHighlightColor: Setter<string>
  palette: Palette
}

const defaultTheme: NamedTheme = ['one-vibrant', themes['one-vibrant']]

const ThemeContext = createContext<ThemeState | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const state = useContext(ThemeContext)
  if (!state) throw new Error('useTheme outside ThemeProvider')
  return state
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = usePersistentState<NamedTheme>('colorTheme', defaultTheme)
  const [highlightColor, setHighlightColor] = usePersistentState('highlightColor', 'purple.500')
  const palette = useMemo(() => makePalette(theme[1]), [theme])

  useLayoutEffect(() => {
    const style = document.documentElement.style
    for (const [name, value] of Object.entries(palette)) {
      style.setProperty(cssVar(name), value)
    }
    const accent = palette[highlightColor] ?? palette['purple.500']
    style.setProperty(cssVar('accent'), accent)
    for (const [name, value] of Object.entries(carbonTokens(palette, accent))) {
      style.setProperty(name, value)
    }
  }, [palette, highlightColor])

  const state = useMemo(
    () => ({ theme, setTheme, highlightColor, setHighlightColor, palette }),
    [theme, setTheme, highlightColor, setHighlightColor, palette],
  )
  return <ThemeContext.Provider value={state}>{children}</ThemeContext.Provider>
}
