import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Emacs (org-roam-ui.el) and Neovim serve the build from out/ on port 35901, next to the
// note text (/node/:id) and images (/img/:path). In development, proxy those to the editor.
const editor = 'http://localhost:35901'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'out',
    emptyOutDir: true,
    // three.js and the org pipeline load on demand; the main chunk stays above the default
    chunkSizeWarningLimit: 1500,
  },
  server: {
    proxy: { '/node': editor, '/img': editor },
  },
})
