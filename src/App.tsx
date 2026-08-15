import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ChevronDown,
  Circle,
  CircleHelp,
  Headphones,
  KeyboardMusic,
  Lightbulb,
  Menu,
  Music2,
  Pause,
  Play,
  Plus,
  Power,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Volume2,
  Waves,
  X,
} from 'lucide-react'
import { AudioEngine } from './lib/audioEngine'
import { midiNoteName, MidiEngine, type MidiInputLike } from './lib/midiEngine'
import { readStoredBpm, storeBpm } from './lib/storage'
import type { InstrumentDefinition, MidiLogEvent } from './types'

const instruments: InstrumentDefinition[] = [
  { id: 'soft-piano', name: 'Soft Piano', category: 'Keys', mood: 'felt & intimate', icon: '◒', color: '#e9c78c', waveform: 'sine' },
  { id: 'dream-pad', name: 'Dream Pad', category: 'Ambient', mood: 'slow & weightless', icon: '✦', color: '#a99cf4', waveform: 'triangle' },
  { id: 'soft-synth', name: 'Soft Synth', category: 'Synth', mood: 'warm & glowing', icon: '◈', color: '#72c9c3', waveform: 'sawtooth' },
  { id: 'warm-bass', name: 'Warm Bass', category: 'Bass', mood: 'deep & rounded', icon: '●', color: '#ef9b78', waveform: 'triangle' },
  { id: 'bells', name: 'Bells', category: 'Other', mood: 'small sparks', icon: '✧', color: '#e6a8d6', waveform: 'sine' },
]

const keyboardNotes = Array.from({ length: 25 }, (_, index) => 48 + index)
const blackNotes = new Set([49, 51, 54, 56, 58, 61, 63, 66, 68, 70])
const computerKeyMap: Record<string, number> = {
  a: 48, w: 49, s: 50, e: 51, d: 52, f: 53, t: 54, g: 55, y: 56, h: 57, u: 58, j: 59,
  k: 60, o: 61, l: 62, p: 63, ';': 64,
}

function App() {
  const midi = useMemo(() => new MidiEngine(), [])
  const audio = useMemo(() => new AudioEngine(), [])
  const [selectedInstrument, setSelectedInstrument] = useState(instruments[1])
  const [midiState, setMidiState] = useState<'checking' | 'connected' | 'waiting' | 'unsupported'>('checking')
  const [devices, setDevices] = useState<MidiInputLike[]>([])
  const [activeDevice, setActiveDevice] = useState<MidiInputLike | null>(null)
  const [showMonitor, setShowMonitor] = useState(false)
  const [logs, setLogs] = useState<MidiLogEvent[]>([])
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set())
  const [activePads, setActivePads] = useState<Set<number>>(new Set())
  const [knobs, setKnobs] = useState({ tone: 58, reverb: 35, delay: 12, attack: 24 })
  const [bpm, setBpm] = useState(readStoredBpm)
  const [isAudioReady, setIsAudioReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [tip, setTip] = useState('Press any key on your MiniLab, or use A–P to play')
  const lastNoteRef = useRef<number | null>(null)

  const callbacks = useMemo(() => ({
    onNoteOn: (note: number, velocity: number) => {
      void audio.start().then(() => {
        audio.noteOn(note, velocity)
        setIsAudioReady(true)
      })
      setActiveNotes((previous) => new Set(previous).add(note))
      setTip(`${midiNoteName(note)} · velocity ${velocity}`)
    },
    onNoteOff: (note: number) => {
      audio.noteOff(note)
      setActiveNotes((previous) => {
        const next = new Set(previous)
        next.delete(note)
        return next
      })
    },
    onPad: (pad: number, pressed: boolean) => {
      setActivePads((previous) => {
        const next = new Set(previous)
        if (pressed) next.add(pad)
        else next.delete(pad)
        return next
      })
    },
    onKnob: (cc: number, value: number) => {
      const knobNames: Record<number, keyof typeof knobs> = { 74: 'tone', 71: 'reverb', 76: 'delay', 19: 'attack' }
      const name = knobNames[cc]
      if (name) {
        setKnobs((previous) => ({ ...previous, [name]: value }))
        if (name === 'tone') audio.setTone(value / 127)
        if (name === 'attack') audio.setAttack(value / 127)
      }
    },
    onLog: (event: MidiLogEvent) => setLogs((previous) => [event, ...previous].slice(0, 14)),
    onDevices: (inputs: MidiInputLike[]) => {
      setDevices(inputs)
      if (!inputs.length) {
        setMidiState('waiting')
        setActiveDevice(null)
      } else {
        setMidiState('connected')
        setActiveDevice((current) => current && inputs.some((input) => input.id === current.id) ? current : inputs[0])
      }
    },
  }), [audio])

  const connectMidi = useCallback(async () => {
    setMidiState('checking')
    try {
      await midi.connect(callbacks)
    } catch {
      setMidiState('unsupported')
    }
  }, [callbacks, midi])

  useEffect(() => {
    audio.setInstrument(selectedInstrument)
    audio.setTone(knobs.tone / 100)
  }, [audio, knobs.tone, selectedInstrument])

  useEffect(() => {
    void connectMidi()
    return () => {
      midi.disconnect()
      audio.stopAll()
    }
  }, [audio, connectMidi, midi])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      const note = computerKeyMap[event.key.toLowerCase()]
      if (note !== undefined) {
        event.preventDefault()
        pressNote(note, 88)
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      const note = computerKeyMap[event.key.toLowerCase()]
      if (note !== undefined) releaseNote(note)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  })

  const pressNote = (note: number, velocity = 96) => {
    void audio.start().then(() => {
      audio.noteOn(note, velocity)
      setIsAudioReady(true)
    })
    setActiveNotes((previous) => new Set(previous).add(note))
    setTip(`${midiNoteName(note)} · computer keyboard`)
    lastNoteRef.current = note
  }

  const releaseNote = (note: number) => {
    audio.noteOff(note)
    setActiveNotes((previous) => {
      const next = new Set(previous)
      next.delete(note)
      return next
    })
  }

  const updateBpm = (next: number) => {
    const value = Math.max(40, Math.min(220, next))
    setBpm(value)
    storeBpm(value)
  }

  const statusLabel = midiState === 'connected' ? 'MiniLab 3 connected' : midiState === 'unsupported' ? 'Web MIDI unavailable' : midiState === 'waiting' ? 'Waiting for a MIDI controller' : 'Looking for a controller'
  const statusDetail = activeDevice?.name || (midiState === 'unsupported' ? 'Try Chrome or Edge for MIDI access' : 'Plug in your MiniLab to start playing')

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><Waves size={18} strokeWidth={2.4} /></div>
          <div>
            <span className="eyebrow">A tiny place to</span>
            <h1>MiniLab Playground</h1>
          </div>
        </div>
        <div className="top-actions">
          <div className={`connection-pill ${midiState}`}>
            <span className="status-dot" />
            <span>{statusLabel}</span>
          </div>
          <button className="icon-button" aria-label="Settings" onClick={() => setShowSettings((value) => !value)}><Settings2 size={17} /></button>
          <button className="icon-button" aria-label="Menu"><Menu size={18} /></button>
        </div>
      </header>

      <main className="workspace">
        <section className="hero-row">
          <div>
            <p className="section-kicker"><span className="live-dot" /> FREE PLAY</p>
            <h2>Make a little <em>something.</em></h2>
            <p className="hero-copy">Connect your MiniLab, choose a mood, and follow the sound.</p>
          </div>
          <div className="tempo-card">
            <span className="tempo-label">TEMPO</span>
            <div className="tempo-value"><span>♩</span><strong>{bpm}</strong><small>BPM</small></div>
            <div className="tempo-controls">
              <button aria-label="Slower" onClick={() => updateBpm(bpm - 1)}>−</button>
              <button aria-label="Faster" onClick={() => updateBpm(bpm + 1)}>+</button>
            </div>
          </div>
        </section>

        <section className="instrument-section panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">CHOOSE A SOUND</span>
              <h3>{selectedInstrument.name} <span className="muted">/ {selectedInstrument.mood}</span></h3>
            </div>
            <button className="text-button" onClick={() => setShowSettings(true)}>sound settings <ChevronDown size={15} /></button>
          </div>
          <div className="instrument-grid">
            {instruments.map((instrument) => (
              <button
                className={`instrument-card ${selectedInstrument.id === instrument.id ? 'selected' : ''}`}
                key={instrument.id}
                onClick={() => setSelectedInstrument(instrument)}
                style={{ '--instrument-color': instrument.color } as React.CSSProperties}
              >
                <span className="instrument-icon">{instrument.icon}</span>
                <span className="instrument-name">{instrument.name}</span>
                <span className="instrument-category">{instrument.category}</span>
              </button>
            ))}
            <button className="instrument-card add-card" onClick={() => setTip('Instrument packs arrive in the next milestone')}>
              <span className="instrument-icon"><Plus size={20} /></span>
              <span className="instrument-name">New sound</span>
              <span className="instrument-category">soon</span>
            </button>
          </div>
        </section>

        <section className="playground-grid">
          <div className="keyboard-panel panel">
            <div className="panel-heading compact">
              <div className="controller-label"><KeyboardMusic size={17} /><span>MINILAB / VISUALIZER</span></div>
              <span className="hint-text">{tip}</span>
            </div>
            <div className="sound-orbit"><span style={{ background: selectedInstrument.color }} /><span /><span /></div>
            <div className="keyboard-wrap" aria-label="Visual keyboard">
              <div className="keyboard">
                {keyboardNotes.map((note) => {
                  const isBlack = blackNotes.has(note)
                  return (
                    <button
                      key={note}
                      className={`key ${isBlack ? 'black-key' : 'white-key'} ${activeNotes.has(note) ? 'active' : ''}`}
                      onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); pressNote(note, 96) }}
                      onPointerUp={() => releaseNote(note)}
                      onPointerCancel={() => releaseNote(note)}
                      onPointerLeave={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) releaseNote(note) }}
                    >
                      {!isBlack && note % 12 === 0 && <span>C{Math.floor(note / 12) - 1}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="controller-footnote"><span><span className="key-dot" /> hardware & screen move together</span><span>computer keys A–P work too</span></div>
          </div>

          <aside className="side-stack">
            <div className="midi-card panel">
              <div className="card-title-row"><span className="section-kicker">CONTROLLER</span><Activity size={17} /></div>
              <div className="device-name"><Headphones size={17} />{activeDevice?.name || 'No controller yet'}</div>
              <p>{statusDetail}</p>
              <button className="outline-button" onClick={connectMidi}><Power size={15} /> {midiState === 'connected' ? 'Rescan MIDI' : 'Connect MIDI'}</button>
              {devices.length > 1 && <select className="device-select" value={activeDevice?.id ?? ''} onChange={(event) => { const selected = devices.find((device) => device.id === event.target.value); if (selected) { midi.selectInput(selected, callbacks); setActiveDevice(selected) } }}><option value="">Select controller</option>{devices.map((device) => <option key={device.id} value={device.id}>{device.name || device.id}</option>)}</select>}
            </div>
            <div className="quick-card panel">
              <div className="card-title-row"><span className="section-kicker">QUICK TOOLS</span><Sparkles size={17} /></div>
              <button className="quick-action" onClick={() => { const next = instruments[Math.floor(Math.random() * instruments.length)]; setSelectedInstrument(next); updateBpm([72, 84, 92, 108][Math.floor(Math.random() * 4)]); setTip(`${next.name} · a small invitation to play`) }}><span className="quick-action-icon"><Lightbulb size={17} /></span><span><strong>Inspire me</strong><small>Find a new place to start</small></span><ChevronDown size={15} className="rotate-neg" /></button>
              <button className={`quick-action ${isPlaying ? 'playing' : ''}`} onClick={() => setIsPlaying((value) => !value)}><span className="quick-action-icon"><Play size={16} fill="currentColor" /></span><span><strong>{isPlaying ? 'Playing back' : 'Preview sound'}</strong><small>{isPlaying ? 'A gentle loop is coming later' : 'Hear the selected instrument'}</small></span><span className="preview-bars">▂▅▃▇</span></button>
            </div>
          </aside>
        </section>

        <section className="lower-row">
          <div className="controls-panel panel">
            <div className="panel-heading compact"><div className="controller-label"><SlidersHorizontal size={17} /><span>SHAPE THE FEELING</span></div><span className="mapping-note">knobs map automatically</span></div>
            <div className="knob-grid">
              {(['tone', 'reverb', 'delay', 'attack'] as const).map((name) => (
                <label className="knob-control" key={name}><span>{name}</span><input type="range" min="0" max="100" value={knobs[name]} onChange={(event) => { const value = Number(event.target.value); setKnobs((previous) => ({ ...previous, [name]: value })); if (name === 'tone') audio.setTone(value / 100); if (name === 'attack') audio.setAttack(value / 100) }} /><div className="knob-visual" style={{ '--knob-progress': `${knobs[name]}%` } as React.CSSProperties}><div className="knob-dot" /></div><small>{knobs[name]}%</small></label>
              ))}
            </div>
          </div>
          <div className="actions-panel panel">
            <div className="action-row"><button className="loop-button" onClick={() => setTip('Loop recording is the next step — your sound is ready for it')}><span className="record-symbol" /><span><strong>LOOP</strong><small>one press to begin</small></span></button><button className="record-button" onClick={() => setTip('Session recording is coming after the MIDI foundation')}><Circle size={15} fill="currentColor" /><span>RECORD SESSION</span></button></div>
            <div className="next-row"><span><span className="sparkle-mini">✦</span> Loops & layers are next</span><button className="monitor-link" onClick={() => setShowMonitor(true)}><Activity size={14} /> open MIDI monitor <span>{logs.length}</span></button></div>
          </div>
        </section>
      </main>

      <footer className="footer"><span><span className="footer-status" /> audio {isAudioReady ? 'ready' : 'waiting for first note'}</span><span>local-first · no account · made for getting lost in sound</span></footer>

      {showMonitor && <div className="modal-backdrop" onClick={() => setShowMonitor(false)}><div className="monitor-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="section-kicker">DEVELOPMENT TOOL</span><h3>MIDI monitor</h3></div><button className="icon-button" onClick={() => setShowMonitor(false)}><X size={17} /></button></div><div className="monitor-caption"><span>live messages from {activeDevice?.name || 'your controller'}</span><span>{logs.length} events</span></div><div className="event-list">{logs.length ? logs.map((event) => <div className="event-row" key={event.id}><span className={`event-type ${event.type === 'NOTE ON' ? 'note' : event.type === 'CC' ? 'cc' : ''}`}>{event.type}</span><strong>{event.label}</strong><span>{event.detail}</span><time>{event.time}</time></div>) : <div className="empty-events"><Activity size={24} /><span>Play a key or move a knob to see it here.</span></div>}</div><div className="modal-footer"><span><span className="status-dot connected" /> listener active</span><button className="text-button" onClick={() => setLogs([])}><RotateCcw size={14} /> clear</button></div></div></div>}
      {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><div className="settings-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="section-kicker">PLAYGROUND SETTINGS</span><h3>Keep it simple.</h3></div><button className="icon-button" onClick={() => setShowSettings(false)}><X size={17} /></button></div><div className="settings-list"><div><span>Scale assist</span><small>Stay in key will arrive with the loop engine.</small></div><div><span>Audio output</span><small>Browser default · low latency preferred.</small></div><div><span>Instrument packs</span><small>Sample-based sounds are planned after the core play loop.</small></div></div><button className="outline-button full" onClick={() => { setShowSettings(false); setShowMonitor(true) }}><Activity size={15} /> Open MIDI monitor</button></div></div>}
    </div>
  )
}

export default App
