import { describe, expect, it } from 'vitest'
import { chooseKeyboardStart, foldNoteToKeyboard, judgeInput, playableNotes } from './gameScoring'
import type { MidiNoteInput, SongTrack } from '../types'

const track: SongTrack = {
  id: 'melody',
  name: 'Melody',
  channel: 1,
  instrumentName: 'Piano',
  instrumentProgram: 0,
  isPercussion: false,
  notes: [
    { id: 'c4', note: 60, velocity: 100, startTime: 1, duration: 0.4, channel: 1 },
    { id: 'c5', note: 72, velocity: 80, startTime: 2, duration: 0.4, channel: 1 },
  ],
}

describe('game scoring helpers', () => {
  it('folds notes into the 25-key range by octave', () => {
    expect(foldNoteToKeyboard(36, 48)).toBe(48)
    expect(foldNoteToKeyboard(84, 48)).toBe(72)
    expect(foldNoteToKeyboard(60, 48)).toBe(60)
  })

  it('chooses a playable keyboard start around the track register', () => {
    const start = chooseKeyboardStart(track)
    expect(start).toBeGreaterThanOrEqual(0)
    expect(start + 24).toBeLessThanOrEqual(127)
  })

  it('scores pitch, timing and velocity while ignoring virtual velocity', () => {
    const targets = playableNotes(track, 48)
    const physical: MidiNoteInput = { note: 60, velocity: 100, channel: 1, receivedAt: 1000, source: 'midi' }
    const result = judgeInput(physical, targets, 1.02, 48, new Set())
    expect(result.noteId).toBe('c4')
    expect(result.label).toBe('Perfecto')
    expect(result.points).toBeGreaterThan(80)

    const virtual: MidiNoteInput = { note: 72, velocity: 1, channel: 1, receivedAt: 2000, source: 'virtual' }
    const virtualResult = judgeInput(virtual, targets, 2.01, 48, new Set(['c4']))
    expect(virtualResult.noteId).toBe('c5')
    expect(virtualResult.velocityError).toBe(0)
  })
})
