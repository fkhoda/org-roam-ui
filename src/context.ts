import { createContext, useContext } from 'react'
import type { EditorVariables } from './api'

/** Settings the editor sends (`variables` message): directories, KaTeX macros, its name. */
export const VariablesContext = createContext<EditorVariables>({ subDirs: [] })

/** The editor's name for labels: "Open in Neovim", "Follow Emacs by...". */
export const useEditorName = () => useContext(VariablesContext).editor || 'Emacs'

/** How the note preview shows headings: as an outline, and all collapsed. */
export const NoteContext = createContext({ outline: false, collapse: false })
