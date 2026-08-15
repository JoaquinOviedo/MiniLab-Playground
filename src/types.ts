export type InstrumentId = 'soft-piano' | 'electric-piano' | 'dream-pad' | 'warm-pad' | 'soft-synth' | 'retro-synth' | 'pluck' | 'warm-bass' | 'bells' | 'strings'

export type MidiEventType = 'NOTE ON' | 'NOTE OFF' | 'CC' | 'PITCH BEND' | 'AFTERTOUCH'

export interface MidiLogEvent {
  id: number
  type: MidiEventType
  label: string
  detail: string
  time: string
  note?: number
  velocity?: number
  channel?: number
}

export interface InstrumentDefinition {
  id: InstrumentId
  name: string
  nameEs: string
  category: string
  categoryEs: string
  mood: string
  moodEs: string
  icon: string
  color: string
  waveform: OscillatorType
}

export interface NoteEvent {
  note: number
  velocity: number
  startTime: number
  duration: number
  channel: number
}

export type SongSource = 'midi' | 'youtube-midi'

export interface YouTubeSongSource {
  videoId: string
  url: string
  offset: number
}

export interface TempoPoint {
  bpm: number
  time: number
}

export interface SongNote {
  id: string
  note: number
  velocity: number
  startTime: number
  duration: number
  channel: number
}

export interface SongTrack {
  id: string
  name: string
  channel: number
  instrumentName: string
  instrumentProgram: number
  isPercussion: boolean
  notes: SongNote[]
}

export interface ImportedSong {
  id: string
  name: string
  fileName: string
  source: SongSource
  duration: number
  tempos: TempoPoint[]
  timeSignature: [number, number]
  tracks: SongTrack[]
  importedAt: number
  youtube?: YouTubeSongSource
}

export type GameView = 'falling' | 'piano-roll'
export type GameTransportState = 'stopped' | 'playing' | 'paused'

export interface MidiNoteInput {
  note: number
  velocity: number
  channel: number
  receivedAt: number
  source: 'midi' | 'virtual'
}

export interface GameSession {
  songId: string
  targetTrackId: string
  view: GameView
  speed: number
  state: GameTransportState
  position: number
  score: number
  combo: number
  accuracy: number
  octaveShift: number
}

export interface MiniLabMapping {
  knobs: Record<number, 'tone' | 'reverb' | 'delay' | 'attack'>
  pads: Record<number, string>
}
