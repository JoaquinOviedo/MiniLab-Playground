import type { ImportedSong, YouTubeSongSource } from '../types'

const videoIdPattern = /^[A-Za-z0-9_-]{11}$/

export function parseYouTubeVideoId(value: string) {
  const input = value.trim()
  if (videoIdPattern.test(input)) return input

  try {
    const url = new URL(input.includes('://') ? input : `https://${input}`)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    let candidate: string | null = null

    if (host === 'youtu.be') {
      candidate = url.pathname.split('/').filter(Boolean)[0] ?? null
    } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      candidate = url.searchParams.get('v')
      if (!candidate) {
        const segments = url.pathname.split('/').filter(Boolean)
        if (['embed', 'shorts', 'live'].includes(segments[0] ?? '')) candidate = segments[1] ?? null
      }
    }

    return candidate && videoIdPattern.test(candidate) ? candidate : null
  } catch {
    return null
  }
}

export function createYouTubeSongSource(value: string, offset = 0): YouTubeSongSource | null {
  const videoId = parseYouTubeVideoId(value)
  if (!videoId) return null
  return {
    videoId,
    url: `https://music.youtube.com/watch?v=${videoId}`,
    offset: Math.max(0, Math.min(600, Number.isFinite(offset) ? offset : 0)),
  }
}

export function linkMidiToYouTube(song: ImportedSong, youtube: YouTubeSongSource): ImportedSong {
  return {
    ...song,
    id: `${song.id}-youtube-${youtube.videoId}`,
    source: 'youtube-midi',
    youtube,
  }
}
