export type InstrumentId = 'soft-piano' | 'dream-pad' | 'soft-synth' | 'warm-bass' | 'bells'

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
  category: string
  mood: string
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

export interface MiniLabMapping {
  knobs: Record<number, 'tone' | 'reverb' | 'delay' | 'attack'>
  pads: Record<number, string>
}
