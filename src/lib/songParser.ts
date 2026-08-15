import { Midi } from '@tonejs/midi'
import type { ImportedSong, SongTrack } from '../types'

function cleanSongName(fileName: string) {
  return fileName.replace(/\.(midi?)$/i, '').replace(/[_-]+/g, ' ').trim() || 'Canción MIDI'
}

export async function parseMidiFile(file: File): Promise<ImportedSong> {
  const midi = new Midi(await file.arrayBuffer())
  const tracks: SongTrack[] = midi.tracks.map((track, trackIndex) => {
    const notes = track.notes.map((note, noteIndex) => ({
      id: `${trackIndex}-${noteIndex}-${note.midi}-${Math.round(note.time * 1000)}`,
      note: note.midi,
      velocity: Math.max(1, Math.min(127, Math.round(note.velocity * 127))),
      startTime: note.time,
      duration: Math.max(0.04, note.duration),
      channel: track.channel,
    }))

    return {
      id: `track-${trackIndex}`,
      name: track.name.trim() || `Pista ${trackIndex + 1}`,
      channel: track.channel,
      instrumentName: track.instrument.name || 'Piano',
      instrumentProgram: track.instrument.number,
      isPercussion: track.instrument.percussion || track.channel === 9,
      notes,
    }
  }).filter((track) => track.notes.length > 0)

  const maxNoteEnd = tracks.reduce((max, track) => track.notes.reduce((trackMax, note) => Math.max(trackMax, note.startTime + note.duration), max), 0)
  const tempos = (midi.header.tempos.length ? midi.header.tempos : [{ bpm: 120, ticks: 0 }]).map((tempo) => ({
    bpm: tempo.bpm,
    time: tempo.time ?? midi.header.ticksToSeconds(tempo.ticks),
  }))
  const rawSignature = midi.header.timeSignatures[0]?.timeSignature ?? [4, 4]
  const timeSignature: [number, number] = [rawSignature[0] ?? 4, rawSignature[1] ?? 4]

  return {
    id: `midi-${file.name}-${file.size}-${file.lastModified}`,
    name: midi.name?.trim() || cleanSongName(file.name),
    fileName: file.name,
    source: 'midi',
    duration: Math.max(0.1, midi.duration, maxNoteEnd),
    tempos,
    timeSignature,
    tracks,
    importedAt: Date.now(),
  }
}

export function pickTargetTrack(song: ImportedSong) {
  return [...song.tracks].sort((left, right) => trackScore(right) - trackScore(left))[0] ?? null
}

function trackScore(track: SongTrack) {
  if (track.isPercussion || track.notes.length === 0) return -1
  const uniquePitches = new Set(track.notes.map((note) => note.note)).size
  const shortNotes = track.notes.filter((note) => note.duration < 1.2).length
  const averagePitch = track.notes.reduce((sum, note) => sum + note.note, 0) / track.notes.length
  const registerBonus = averagePitch >= 48 && averagePitch <= 96 ? 18 : 0
  return track.notes.length * 2 + uniquePitches * 3 + shortNotes + registerBonus
}
