import { imageUrl } from '../../editor'

const isAbsolute = (path: string) => path.startsWith('/') || path.startsWith('~')
const dirname = (path: string) => path.slice(0, path.lastIndexOf('/')) || '/'

/** Resolve `.` and `..` in a slash-separated path. */
function normalize(path: string) {
  const parts: string[] = []
  for (const part of path.split('/')) {
    if (part === '..') parts.pop()
    else if (part !== '.' && part !== '') parts.push(part)
  }
  return (path.startsWith('/') ? '/' : '') + parts.join('/')
}

/** An image from a note: a web URL, or a file the editor serves (relative to the note). */
export function OrgImage({ src, file }: { src: string; file: string }) {
  if (/^https?:/.test(src)) {
    return <img src={src} alt="" className="org-image" />
  }
  const path = src.replace(/^file:/, '')
  const fullPath = isAbsolute(path) ? path : normalize(`${dirname(file)}/${path}`)
  return <img src={imageUrl(fullPath)} alt={path} className="org-image" />
}
