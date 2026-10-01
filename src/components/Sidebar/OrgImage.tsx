import { Box, Image } from '@chakra-ui/react'
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
    return <Image src={src} alt="" maxW="100%" my={4} />
  }
  const path = src.replace(/^file:/, '')
  const fullPath = isAbsolute(path) ? path : normalize(`${dirname(file)}/${path}`)
  return (
    <Box my={4}>
      <Image src={imageUrl(fullPath)} alt={path} maxW="100%" />
    </Box>
  )
}
