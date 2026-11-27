export type VideoSource =
  | { kind: 'embed'; src: string; thumbnail: string | null }
  | { kind: 'file'; src: string; thumbnail: null }
  | { kind: 'link'; src: string; thumbnail: null }

/**
 * How a machine's video link plays: YouTube (without tracking cookies) and Vimeo embedded, a direct file in a
 * <video>, anything else as a link. YouTube also gives a still for the gallery thumbnail.
 */
export function videoSource(url: string): VideoSource {
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/)
  if (youtube) {
    return {
      kind: 'embed',
      src: `https://www.youtube-nocookie.com/embed/${youtube[1]}?rel=0`,
      thumbnail: `https://i.ytimg.com/vi/${youtube[1]}/hqdefault.jpg`,
    }
  }
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeo) return { kind: 'embed', src: `https://player.vimeo.com/video/${vimeo[1]}`, thumbnail: null }
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return { kind: 'file', src: url, thumbnail: null }
  return { kind: 'link', src: url, thumbnail: null }
}
