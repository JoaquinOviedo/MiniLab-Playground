import { getControlName, isLikelyPad } from './minilabMapping'
import type { MidiEventType, MidiLogEvent } from '../types'

export interface MidiInputLike {
  id: string
  name?: string | null
  manufacturer?: string | null
  onmidimessage: ((event: MidiMessageEventLike) => void) | null
}

export interface MidiMessageEventLike {
  data?: Uint8Array
}

export interface MidiInputMapLike {
  values: () => IterableIterator<MidiInputLike>
}

export interface MidiAccessLike {
  inputs: MidiInputMapLike
  onstatechange: (() => void) | null
}

type MidiCallbacks = {
  onNoteOn: (note: number, velocity: number, channel: number) => void
  onNoteOff: (note: number, channel: number) => void
  onPad: (pad: number, pressed: boolean) => void
  onKnob: (cc: number, value: number) => void
  onLog: (event: MidiLogEvent) => void
  onDevices: (inputs: MidiInputLike[]) => void
}

export class MidiEngine {
  private access: MidiAccessLike | null = null
  private activeInput: MidiInputLike | null = null
  private logId = 0

  async connect(callbacks: MidiCallbacks) {
    if (!('requestMIDIAccess' in navigator)) {
      throw new Error('Web MIDI is not supported in this browser.')
    }
    const request = (navigator as Navigator & { requestMIDIAccess: () => Promise<unknown> }).requestMIDIAccess
    this.access = await request() as MidiAccessLike
    this.access.onstatechange = () => this.refreshInputs(callbacks)
    this.refreshInputs(callbacks)
  }

  disconnect() {
    if (this.activeInput) this.activeInput.onmidimessage = null
    if (this.access) this.access.onstatechange = null
    this.activeInput = null
  }

  selectInput(input: MidiInputLike, callbacks: MidiCallbacks) {
    if (this.activeInput) this.activeInput.onmidimessage = null
    this.activeInput = input
    localStorage.setItem('minilab-last-device', input.id)
    input.onmidimessage = (event) => this.handleMessage(event, callbacks)
  }

  private refreshInputs(callbacks: MidiCallbacks) {
    if (!this.access) return
    const inputs = Array.from(this.access.inputs.values())
    callbacks.onDevices(inputs)
    if (!inputs.length) {
      this.activeInput = null
      return
    }
    const remembered = localStorage.getItem('minilab-last-device')
    const preferred = inputs.find((input) => input.id === remembered) ??
      inputs.find((input) => /minilab|arturia/i.test(`${input.name} ${input.manufacturer}`)) ?? inputs[0]
    if (preferred !== this.activeInput) this.selectInput(preferred, callbacks)
  }

  private handleMessage(event: MidiMessageEventLike, callbacks: MidiCallbacks) {
    const data = event.data
    if (!data || data.length < 2) return
    const status = data[0] & 0xf0
    const channel = (data[0] & 0x0f) + 1
    const first = data[1]
    const value = data[2] ?? 0
    const emit = (type: MidiEventType, label: string, detail: string, extra: Partial<MidiLogEvent> = {}) => {
      callbacks.onLog({ id: ++this.logId, type, label, detail, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), channel, ...extra })
    }
    if (status === 0x90 && value > 0) {
      if (isLikelyPad(first)) callbacks.onPad(first - 35, true)
      else callbacks.onNoteOn(first, value, channel)
      emit('NOTE ON', midiNoteName(first), `Velocity ${value}`, { note: first, velocity: value })
    } else if (status === 0x80 || (status === 0x90 && value === 0)) {
      if (isLikelyPad(first)) callbacks.onPad(first - 35, false)
      else callbacks.onNoteOff(first, channel)
      emit('NOTE OFF', midiNoteName(first), `Channel ${channel}`, { note: first })
    } else if (status === 0xb0) {
      callbacks.onKnob(first, value)
      emit('CC', getControlName(first), `Value ${value}`, { velocity: value })
    } else if (status === 0xe0) {
      const bend = (value << 7) | first
      emit('PITCH BEND', `${bend}`, `Channel ${channel}`)
    } else if (status === 0xd0) {
      emit('AFTERTOUCH', `${first}`, `Channel ${channel}`)
    }
  }
}

export function midiNoteName(note: number) {
  const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
  return `${names[note % 12]}${Math.floor(note / 12) - 1}`
}
