import type { InstrumentDefinition, ImportedSong, GameTransportState, SongTrack } from '../types'
import { AudioEngine } from './audioEngine'

export interface TransportSnapshot {
  state: GameTransportState
  position: number
  duration: number
  speed: number
}

interface TransportCallbacks {
  onUpdate: (snapshot: TransportSnapshot) => void
  onBeat: (beat: number, accent: boolean) => void
}

export class SongTransport {
  private readonly audio: AudioEngine
  private readonly callbacks: TransportCallbacks
  private song: ImportedSong | null = null
  private targetTrackId = ''
  private instrumentForTrack: (track: SongTrack) => InstrumentDefinition | null = () => null
  private state: GameTransportState = 'stopped'
  private position = 0
  private speed = 1
  private anchorAudioTime = 0
  private anchorPosition = 0
  private timer: number | null = null
  private cursors = new Map<string, number>()
  private lastBeat = -1

  constructor(audio: AudioEngine, callbacks: TransportCallbacks) {
    this.audio = audio
    this.callbacks = callbacks
  }

  load(song: ImportedSong, targetTrackId: string) {
    this.stop()
    this.song = song
    this.targetTrackId = targetTrackId
    this.position = 0
    this.resetCursors(0)
    this.emit()
  }

  setTargetTrack(trackId: string) {
    if (!this.song) return
    const wasPlaying = this.state === 'playing'
    this.reanchor()
    this.targetTrackId = trackId
    this.resetCursors(this.position)
    if (wasPlaying) this.scheduleAhead()
    this.emit()
  }

  setInstrumentResolver(resolver: (track: SongTrack) => InstrumentDefinition | null) {
    this.instrumentForTrack = resolver
  }

  async play() {
    if (!this.song || this.state === 'playing') return
    await this.audio.start()
    if (this.position >= this.song.duration - 0.02) this.position = 0
    this.anchorAudioTime = this.audio.getCurrentTime()
    this.anchorPosition = this.position
    this.state = 'playing'
    this.lastBeat = Math.floor(this.beatsAt(this.position)) - 1
    this.startTimer()
    this.tick()
    this.emit()
  }

  pause() {
    if (this.state !== 'playing') return
    this.reanchor()
    this.state = 'paused'
    this.stopTimer()
    this.audio.stopScheduled()
    this.resetCursors(this.position)
    this.emit()
  }

  stop() {
    this.stopTimer()
    this.audio.stopScheduled()
    this.state = 'stopped'
    this.position = 0
    this.anchorPosition = 0
    this.lastBeat = -1
    this.resetCursors(0)
    this.emit()
  }

  restart() {
    this.stop()
    void this.play()
  }

  setSpeed(next: number) {
    const speed = Math.max(0.5, Math.min(1.5, next))
    if (speed === this.speed) return
    if (this.state === 'playing') {
      this.reanchor()
      this.audio.stopScheduled()
      this.speed = speed
      this.resetCursors(this.position)
      this.lastBeat = Math.floor(this.beatsAt(this.position)) - 1
      this.scheduleAhead()
    } else {
      this.speed = speed
    }
    this.emit()
  }

  getSnapshot(): TransportSnapshot {
    return { state: this.state, position: this.getPosition(), duration: this.song?.duration ?? 0, speed: this.speed }
  }

  getPosition() {
    if (this.state !== 'playing' || !this.song) return this.position
    return Math.min(this.song.duration, this.anchorPosition + (this.audio.getCurrentTime() - this.anchorAudioTime) * this.speed)
  }

  dispose() {
    this.stopTimer()
    this.audio.stopScheduled()
  }

  private reanchor() {
    this.position = this.getPosition()
    this.anchorPosition = this.position
    this.anchorAudioTime = this.audio.getCurrentTime()
  }

  private startTimer() {
    this.stopTimer()
    this.timer = window.setInterval(() => this.tick(), 25)
  }

  private stopTimer() {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
  }

  private tick() {
    if (!this.song || this.state !== 'playing') return
    this.position = this.getPosition()
    this.scheduleAhead()
    const currentBeat = Math.floor(this.beatsAt(this.position))
    while (this.lastBeat < currentBeat) {
      this.lastBeat += 1
      this.callbacks.onBeat(this.lastBeat, this.lastBeat % 4 === 0)
    }
    this.emit()
    if (this.position >= this.song.duration - 0.01) {
      this.position = this.song.duration
      this.state = 'stopped'
      this.stopTimer()
      this.audio.stopScheduled()
      this.emit()
    }
  }

  private scheduleAhead() {
    if (!this.song || this.state !== 'playing') return
    const now = this.position
    const horizon = now + 0.16 * this.speed + 0.08
    this.song.tracks.filter((track) => track.id !== this.targetTrackId).forEach((track) => {
      const instrument = this.instrumentForTrack(track)
      if (!instrument) return
      let cursor = this.cursors.get(track.id) ?? 0
      while (cursor < track.notes.length && track.notes[cursor].startTime <= horizon) {
        const note = track.notes[cursor]
        if (note.startTime >= now - 0.025) {
          const audioStart = this.anchorAudioTime + (note.startTime - this.anchorPosition) / this.speed
          this.audio.scheduleNote(note.note, note.velocity, instrument, audioStart, note.duration / this.speed)
        }
        cursor += 1
      }
      this.cursors.set(track.id, cursor)
    })
  }

  private resetCursors(position: number) {
    this.cursors.clear()
    this.song?.tracks.forEach((track) => {
      let cursor = 0
      while (cursor < track.notes.length && track.notes[cursor].startTime < position - 0.025) cursor += 1
      this.cursors.set(track.id, cursor)
    })
  }

  private beatsAt(seconds: number) {
    if (!this.song) return 0
    const tempos = [...this.song.tempos].sort((a, b) => a.time - b.time)
    let beats = 0
    let cursor = 0
    let bpm = tempos[0]?.bpm ?? 120
    for (const tempo of tempos) {
      if (tempo.time <= cursor) {
        bpm = tempo.bpm
        continue
      }
      const end = Math.min(seconds, tempo.time)
      if (end > cursor) beats += (end - cursor) * bpm / 60
      if (seconds <= tempo.time) return beats
      cursor = tempo.time
      bpm = tempo.bpm
    }
    if (seconds > cursor) beats += (seconds - cursor) * bpm / 60
    return beats
  }

  private emit() {
    this.callbacks.onUpdate(this.getSnapshot())
  }
}
