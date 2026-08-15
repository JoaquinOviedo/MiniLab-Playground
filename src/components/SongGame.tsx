import { Gauge, Layers3, Pause, Piano, Play, RotateCcw, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { GameTransportState, GameView, ImportedSong, SongTrack } from '../types'
import { foldNoteToKeyboard, playableNotes } from '../lib/gameScoring'

interface SongGameProps {
  song: ImportedSong
  targetTrack: SongTrack
  position: number
  state: GameTransportState
  view: GameView
  speed: number
  keyboardStart: number
  score: number
  combo: number
  accuracy: number
  judgment: string
  language: 'es' | 'en'
  onViewChange: (view: GameView) => void
  onPlayPause: () => void
  onRestart: () => void
  onClose: () => void
  onSpeedChange: (speed: number) => void
  onTrackChange: (trackId: string) => void
}

const leadTime = 3.2

function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

function noteColor(note: number) {
  return `hsl(${(note % 12) * 28 + 190} 68% 72%)`
}

export function SongGame({
  song,
  targetTrack,
  position,
  state,
  view,
  speed,
  keyboardStart,
  score,
  combo,
  accuracy,
  judgment,
  language,
  onViewChange,
  onPlayPause,
  onRestart,
  onClose,
  onSpeedChange,
  onTrackChange,
}: SongGameProps) {
  const notes = playableNotes(targetTrack, keyboardStart).filter((note) => note.startTime >= position - 0.2 && note.startTime <= position + leadTime)
  const copy = language === 'es' ? {
    songMode: 'MODO CANCIÓN',
    track: 'Pista objetivo',
    falling: 'Notas',
    roll: 'Carril',
    play: 'Reproducir',
    pause: 'Pausar',
    restart: 'Reiniciar',
    close: 'Salir',
    speed: 'Velocidad',
    score: 'Puntos',
    combo: 'Combo',
    accuracy: 'Precisión',
    target: 'Línea de acierto',
    range: 'Rango',
    accompaniment: 'acompañamiento activo',
  } : {
    songMode: 'SONG MODE',
    track: 'Target track',
    falling: 'Notes',
    roll: 'Roll',
    play: 'Play',
    pause: 'Pause',
    restart: 'Restart',
    close: 'Exit',
    speed: 'Speed',
    score: 'Score',
    combo: 'Combo',
    accuracy: 'Accuracy',
    target: 'Hit line',
    range: 'Range',
    accompaniment: 'accompaniment active',
  }
  const rangeLabel = `${String(foldNoteToKeyboard(keyboardStart, keyboardStart))}–${String(keyboardStart + 24)}`

  return <section className="song-game panel" data-testid="song-game">
    <div className="song-game-header">
      <div className="song-game-title"><span className="section-kicker"><span className="live-dot" /> {copy.songMode}</span><h2>{song.name}</h2><small>{targetTrack.notes.length} notas · {copy.accompaniment}</small></div>
      <button className="icon-button" aria-label={copy.close} title={copy.close} onClick={onClose}><X size={17} /></button>
    </div>
    <div className="song-game-controls">
      <label className="song-control"><span>{copy.track}</span><select value={targetTrack.id} onChange={(event) => onTrackChange(event.target.value)}>{song.tracks.map((track) => <option key={track.id} value={track.id}>{track.name} · {track.notes.length}</option>)}</select></label>
      <div className="song-view-toggle" role="group" aria-label="Game view"><button className={view === 'falling' ? 'selected' : ''} onClick={() => onViewChange('falling')}><Layers3 size={14} /> {copy.falling}</button><button className={view === 'piano-roll' ? 'selected' : ''} onClick={() => onViewChange('piano-roll')}><Piano size={14} /> {copy.roll}</button></div>
      <div className="song-transport-actions"><button className="song-round-button" aria-label={state === 'playing' ? copy.pause : copy.play} title={state === 'playing' ? copy.pause : copy.play} onClick={onPlayPause}>{state === 'playing' ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</button><button className="song-round-button" aria-label={copy.restart} title={copy.restart} onClick={onRestart}><RotateCcw size={14} /></button></div>
    </div>
    <div className="song-game-meta"><span><Gauge size={13} /> {copy.speed} {Math.round(speed * 100)}%</span><input aria-label={copy.speed} type="range" min="50" max="150" step="5" value={Math.round(speed * 100)} onChange={(event) => onSpeedChange(Number(event.target.value) / 100)} /><span>{formatTime(position)} / {formatTime(song.duration)}</span><span className="song-range">{copy.range} {rangeLabel}</span></div>
    <div className={`song-board ${view}`}>
      {view === 'falling' ? <div className="falling-board">
        <div className="falling-lanes">{Array.from({ length: 25 }, (_, index) => <span key={index} />)}</div>
        <div className="falling-notes">{notes.map((note) => {
          const delta = note.startTime - position
          const style = { left: `${((note.playableNote - keyboardStart) / 25) * 100}%`, top: `${Math.min(96, Math.max(2, ((delta + 0.12) / leadTime) * 100))}%`, width: `${Math.max(2.4, 100 / 25 - 0.35)}%`, background: noteColor(note.playableNote) } as CSSProperties
          return <div className="game-note falling-note" key={note.id} style={style} title={`${note.note} · ${Math.round(note.velocity)}`} />
        })}</div>
        <div className="hit-line"><span>{copy.target}</span></div>
        <div className="falling-key-labels">{Array.from({ length: 25 }, (_, index) => <span key={index}>{index % 12 === 0 ? 'C' : ''}</span>)}</div>
      </div> : <div className="roll-board">
        <div className="roll-grid">{Array.from({ length: 8 }, (_, index) => <span key={index} />)}</div>
        <div className="roll-notes">{notes.map((note) => {
          const delta = note.startTime - position
          const style = { left: `${34 + (delta / leadTime) * 62}%`, top: `${100 - ((note.playableNote - keyboardStart) / 24) * 88 - 5}%`, width: `${Math.max(1.7, (note.duration / leadTime) * 62)}%`, background: noteColor(note.playableNote) } as CSSProperties
          return <div className="game-note roll-note" key={note.id} style={style} title={`${note.note} · ${Math.round(note.velocity)}`} />
        })}</div>
        <div className="roll-hit-line"><span>{copy.target}</span></div>
      </div>}
      {state !== 'playing' && <div className="song-board-hint">{state === 'paused' ? copy.pause : copy.play}</div>}
    </div>
    <div className="song-scorebar"><span><strong>{score}</strong><small>{copy.score}</small></span><span><strong>{combo}×</strong><small>{copy.combo}</small></span><span><strong>{accuracy}%</strong><small>{copy.accuracy}</small></span><span className={`last-judgment ${judgment === 'Perfecto' ? 'perfect' : ''}`}>{judgment}</span></div>
  </section>
}
