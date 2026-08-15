import type { InstrumentDefinition } from '../types'

interface Voice {
  oscillator: OscillatorNode
  gain: GainNode
  filter: BiquadFilterNode
  startAt: number
}

export class AudioEngine {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private recordingDestination: MediaStreamAudioDestinationNode | null = null
  private voices = new Map<number, Voice>()
  private scheduledVoices = new Map<string, Voice>()
  private scheduledId = 0
  private currentInstrument: InstrumentDefinition | null = null
  private tone = 0.58
  private attack = 0.18

  async start() {
    if (!this.context) {
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.master.gain.value = 0.25
      this.master.connect(this.context.destination)
      this.recordingDestination = this.context.createMediaStreamDestination()
      this.master.connect(this.recordingDestination)
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

  getRecordingStream() {
    return this.recordingDestination?.stream ?? null
  }

  getCurrentTime() {
    return this.context?.currentTime ?? 0
  }

  triggerClick(accent = false) {
    if (!this.context || !this.master) return
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    const now = this.context.currentTime
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(accent ? 1240 : 880, now)
    gain.gain.setValueAtTime(accent ? 0.08 : 0.045, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055)
    oscillator.connect(gain)
    gain.connect(this.master)
    oscillator.start(now)
    oscillator.stop(now + 0.06)
  }

  noteOn(note: number, velocity = 100) {
    if (!this.context || !this.master || !this.currentInstrument) return
    this.noteOff(note, true)
    const voice = this.createVoice(note, velocity, this.currentInstrument, this.context.currentTime)
    if (voice) this.voices.set(note, voice)
  }

  scheduleNote(note: number, velocity: number, instrument: InstrumentDefinition, startAt: number, duration: number) {
    if (!this.context || !this.master) return null
    const id = `scheduled-${++this.scheduledId}`
    const start = Math.max(this.context.currentTime + 0.01, startAt)
    const voice = this.createVoice(note, velocity, instrument, start, duration)
    if (!voice) return null
    this.scheduledVoices.set(id, voice)
    voice.oscillator.addEventListener('ended', () => this.scheduledVoices.delete(id), { once: true })
    return id
  }

  private createVoice(note: number, velocity: number, instrument: InstrumentDefinition, startAt: number, duration?: number) {
    if (!this.context || !this.master) return null
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    const filter = this.context.createBiquadFilter()
    const frequency = 440 * Math.pow(2, (note - 69) / 12)
    const level = Math.max(0.02, Math.min(1, velocity / 127)) * 0.16
    oscillator.type = instrument.waveform
    oscillator.frequency.setValueAtTime(frequency, startAt)
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(300 + this.tone * 6800, startAt)
    filter.Q.value = instrument.id === 'soft-synth' ? 3.5 : 0.7
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(level, startAt + 0.015 + this.attack * 0.22)
    oscillator.connect(filter)
    filter.connect(gain)
    gain.connect(this.master)
    oscillator.start(startAt)
    if (duration !== undefined) {
      const releaseAt = Math.max(startAt + 0.03, startAt + duration)
      gain.gain.setTargetAtTime(0.0001, releaseAt, 0.06 + this.attack * 0.18)
      oscillator.stop(releaseAt + 0.42)
    }
    return { oscillator, gain, filter, startAt }
  }

  noteOff(note: number, immediate = false) {
    const voice = this.voices.get(note)
    if (!voice || !this.context) return
    this.stopVoice(voice, immediate)
    this.voices.delete(note)
  }

  private stopVoice(voice: Voice, immediate: boolean) {
    if (!this.context) return
    const now = this.context.currentTime
    voice.gain.gain.cancelScheduledValues(now)
    voice.gain.gain.setTargetAtTime(0.0001, now, immediate ? 0.006 : 0.06 + this.attack * 0.18)
    voice.oscillator.stop(Math.max(now + (immediate ? 0.03 : 0.4), voice.startAt + 0.03))
  }

  stopScheduled() {
    Array.from(this.scheduledVoices.values()).forEach((voice) => this.stopVoice(voice, true))
    this.scheduledVoices.clear()
  }

  stopAll() {
    Array.from(this.voices.keys()).forEach((note) => this.noteOff(note, true))
    this.stopScheduled()
  }
}
