import { describe, expect, it } from 'vitest'
import { createYouTubeSongSource, linkMidiToYouTube, parseYouTubeVideoId } from './youtube'
import type { ImportedSong } from '../types'

describe('YouTube song helpers', () => {
  it('accepts YouTube Music, watch, short and bare video IDs', () => {
    expect(parseYouTubeVideoId('https://music.youtube.com/watch?v=dQw4w9WgXcQ&si=test')).toBe('dQw4w9WgXcQ')
    expect(parseYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(parseYouTubeVideoId('youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(parseYouTubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('rejects unrelated URLs and clamps the synchronization offset', () => {
    expect(parseYouTubeVideoId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(parseYouTubeVideoId('not-a-url')).toBeNull()
    expect(createYouTubeSongSource('dQw4w9WgXcQ', -4)?.offset).toBe(0)
    expect(createYouTubeSongSource('dQw4w9WgXcQ', 900)?.offset).toBe(600)
  })

  it('keeps the MIDI chart and adds a persistent YouTube playback source', () => {
    const song: ImportedSong = { id: 'midi-chart', name: 'Chart', fileName: 'chart.mid', source: 'midi', duration: 10, tempos: [{ bpm: 120, time: 0 }], timeSignature: [4, 4], tracks: [], importedAt: 1 }
    const youtube = createYouTubeSongSource('dQw4w9WgXcQ', 1.5)!
    const linked = linkMidiToYouTube(song, youtube)
    expect(linked.source).toBe('youtube-midi')
    expect(linked.youtube).toEqual(youtube)
    expect(linked.id).toContain('dQw4w9WgXcQ')
  })
})
