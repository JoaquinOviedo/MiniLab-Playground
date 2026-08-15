import { Midi } from '@tonejs/midi'
import { describe, expect, it } from 'vitest'
import { parseMidiFile, pickTargetTrack } from './songParser'

describe('MIDI song parser', () => {
  it('normalizes tracks, tempos and notes for local play mode', async () => {
    const midi = new Midi()
    midi.header.setTempo(96)
    const melody = midi.addTrack()
    melody.name = 'Melodia'
    melody.channel = 0
    melody.addNote({ midi: 60, time: 0, duration: 0.4, velocity: 0.8 })
    melody.addNote({ midi: 64, time: 0.5, duration: 0.4, velocity: 0.7 })
    const bass = midi.addTrack()
    bass.name = 'Bajo'
    bass.channel = 1
    bass.addNote({ midi: 36, time: 0, duration: 0.8, velocity: 0.5 })
    const bytes = midi.toArray()
    const file = {
      name: 'prueba.mid',
      size: bytes.byteLength,
      lastModified: 1,
      arrayBuffer: async () => bytes.slice().buffer,
    } as unknown as File

    const song = await parseMidiFile(file)
    expect(song.source).toBe('midi')
    expect(song.tempos[0]?.bpm).toBe(96)
    expect(song.tracks).toHaveLength(2)
    expect(song.tracks[0]?.notes[0]?.note).toBe(60)
    expect(pickTargetTrack(song)?.name).toBe('Melodia')
  })
})
