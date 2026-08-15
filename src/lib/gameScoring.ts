import type { ImportedSong, MidiNoteInput, SongNote, SongTrack } from '../types'

export interface PlayableSongNote extends SongNote {
  playableNote: number
}

export type JudgmentLabel = 'Perfecto' | 'Bien' | 'Acierto' | 'Fallo'

export interface Judgment {
  label: JudgmentLabel
  noteId: string | null
  points: number
  timingError: number
  velocityError: number
}

export function chooseKeyboardStart(track: SongTrack) {
  if (!track.notes.length) return 48
  const sorted = track.notes.map((note) => note.note).sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)] ?? 60
  return Math.max(0, Math.min(103, Math.floor(median / 12) * 12 - 12))
}

export function foldNoteToKeyboard(note: number, keyboardStart: number) {
  let folded = note
  while (folded < keyboardStart) folded += 12
  while (folded > keyboardStart + 24) folded -= 12
  return Math.max(keyboardStart, Math.min(keyboardStart + 24, folded))
}

export function playableNotes(track: SongTrack, keyboardStart: number): PlayableSongNote[] {
  return track.notes.map((note) => ({ ...note, playableNote: foldNoteToKeyboard(note.note, keyboardStart) }))
}

export function noteAtPosition(song: ImportedSong, track: SongTrack, position: number, keyboardStart: number) {
  return playableNotes(track, keyboardStart).filter((note) => note.startTime >= position - 0.28 && note.startTime <= position + 1.8)
}

export function judgeInput(
  input: MidiNoteInput,
  targets: PlayableSongNote[],
  position: number,
  keyboardStart: number,
  judgedIds: Set<string>,
): Judgment {
  const playableInput = foldNoteToKeyboard(input.note, keyboardStart)
  const candidate = targets
    .filter((target) => !judgedIds.has(target.id) && target.playableNote === playableInput)
    .map((target) => ({ target, distance: Math.abs(target.startTime - position) }))
    .filter(({ distance }) => distance <= 0.15)
    .sort((left, right) => left.distance - right.distance)[0]

  if (!candidate) return { label: 'Fallo', noteId: null, points: 0, timingError: 0.15, velocityError: 1 }

  const timingError = candidate.distance
  const velocityError = input.source === 'virtual' ? 0 : Math.abs(input.velocity - candidate.target.velocity) / 127
  const timingScore = Math.max(0, 1 - timingError / 0.15)
  const velocityScore = input.source === 'virtual' ? 1 : Math.max(0, 1 - velocityError)
  const normalized = timingScore * 0.7 + velocityScore * 0.3
  const label: JudgmentLabel = timingError <= 0.05 && velocityError <= 0.1 ? 'Perfecto' : timingError <= 0.1 && velocityError <= 0.25 ? 'Bien' : 'Acierto'
  return { label, noteId: candidate.target.id, points: Math.round(normalized * 100), timingError, velocityError }
}

export function accuracyFor(hits: number, attempts: number) {
  return attempts ? Math.round((hits / attempts) * 100) : 100
}
