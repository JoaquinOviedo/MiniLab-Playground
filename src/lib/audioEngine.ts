import type { InstrumentDefinition } from '../types'

interface Voice {
  oscillator: OscillatorNode
  gain: GainNode
  filter: BiquadFilterNode
}

export class AudioEngine {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private voices = new Map<number, Voice>()
  private currentInstrument: InstrumentDefinition | null = null
  private tone = 0.58
  private attack = 0.18

  async start() {
    if (!this.context) {
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.master.gain.value = 0.25
      this.master.connect(this.context.destination)
    }
    if (this.context.state === 'suspended') await this.context.resume()
  }

  setInstrument(instrument: InstrumentDefinition) {
    this.currentInstrument = instrument
  }

  setTone(value: number) {
    this.tone = value
    this.voices.forEach((voice) => {
      voice.filter.frequency.setTargetAtTime(300 + value * 6800, this.context?.currentTime ?? 0, 0.04)
    })
  }

  setAttack(value: number) {
    this.attack = value
  }

  noteOn(note: number, velocity = 100) {
    if (!this.context || !this.master || !this.currentInstrument) return
    const now = this.context.currentTime
    this.noteOff(note, true)
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    const filter = this.context.createBiquadFilter()
    const frequency = 440 * Math.pow(2, (note - 69) / 12)
    const level = Math.max(0.02, Math.min(1, velocity / 127)) * 0.16
    oscillator.type = this.currentInstrument.waveform
    oscillator.frequency.setValueAtTime(frequency, now)
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(300 + this.tone * 6800, now)
    filter.Q.value = this.currentInstrument.id === 'soft-synth' ? 3.5 : 0.7
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(level, now + 0.015 + this.attack * 0.22)
    oscillator.connect(filter)
    filter.connect(gain)
    gain.connect(this.master)
    oscillator.start(now)
    this.voices.set(note, { oscillator, gain, filter })
  }

  noteOff(note: number, immediate = false) {
    const voice = this.voices.get(note)
    if (!voice || !this.context) return
    const now = this.context.currentTime
    voice.gain.gain.cancelScheduledValues(now)
    voice.gain.gain.setTargetAtTime(0.0001, now, immediate ? 0.006 : 0.06 + this.attack * 0.18)
    voice.oscillator.stop(now + (immediate ? 0.03 : 0.4))
    this.voices.delete(note)
  }

  stopAll() {
    Array.from(this.voices.keys()).forEach((note) => this.noteOff(note, true))
  }
}
