import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  Activity,
  ChevronDown,
  Circle,
  Download,
  FileAudio,
  Headphones,
  KeyboardMusic,
  Languages,
  Lightbulb,
  Menu,
  Pause,
  Play,
  Plus,
  Power,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Square,
  Waves,
  X,
} from 'lucide-react'
import { AudioEngine } from './lib/audioEngine'
import { midiNoteName, MidiEngine, type MidiInputLike } from './lib/midiEngine'
import { readStoredBpm, storeBpm } from './lib/storage'
import type { InstrumentDefinition, MidiLogEvent } from './types'

type Language = 'es' | 'en'

const instruments: InstrumentDefinition[] = [
  { id: 'soft-piano', name: 'Soft Piano', nameEs: 'Piano suave', category: 'Keys', categoryEs: 'Teclas', mood: 'felt & intimate', moodEs: 'íntimo y cercano', icon: '◒', color: '#e9c78c', waveform: 'sine' },
  { id: 'electric-piano', name: 'Electric Piano', nameEs: 'Piano eléctrico', category: 'Keys', categoryEs: 'Teclas', mood: 'warm & bright', moodEs: 'cálido y brillante', icon: '◓', color: '#f1b875', waveform: 'triangle' },
  { id: 'dream-pad', name: 'Dream Pad', nameEs: 'Pad de ensueño', category: 'Ambient', categoryEs: 'Ambient', mood: 'slow & weightless', moodEs: 'lento y ligero', icon: '✦', color: '#a99cf4', waveform: 'triangle' },
  { id: 'warm-pad', name: 'Warm Pad', nameEs: 'Pad cálido', category: 'Ambient', categoryEs: 'Ambient', mood: 'silky & wide', moodEs: 'sedoso y amplio', icon: '✺', color: '#c29ced', waveform: 'sine' },
  { id: 'soft-synth', name: 'Soft Synth', nameEs: 'Synth suave', category: 'Synth', categoryEs: 'Synth', mood: 'warm & glowing', moodEs: 'cálido y luminoso', icon: '◈', color: '#72c9c3', waveform: 'sawtooth' },
  { id: 'retro-synth', name: 'Retro Synth', nameEs: 'Synth retro', category: 'Synth', categoryEs: 'Synth', mood: 'analog & playful', moodEs: 'analógico y juguetón', icon: '▣', color: '#8bb7ec', waveform: 'square' },
  { id: 'pluck', name: 'Pluck', nameEs: 'Pluck', category: 'Synth', categoryEs: 'Synth', mood: 'small & rhythmic', moodEs: 'pequeño y rítmico', icon: '⌁', color: '#73d5bd', waveform: 'triangle' },
  { id: 'warm-bass', name: 'Warm Bass', nameEs: 'Bajo cálido', category: 'Bass', categoryEs: 'Bajo', mood: 'deep & rounded', moodEs: 'profundo y redondo', icon: '●', color: '#ef9b78', waveform: 'triangle' },
  { id: 'bells', name: 'Bells', nameEs: 'Campanas', category: 'Other', categoryEs: 'Otro', mood: 'small sparks', moodEs: 'pequeñas chispas', icon: '✧', color: '#e6a8d6', waveform: 'sine' },
  { id: 'strings', name: 'Strings', nameEs: 'Cuerdas', category: 'Other', categoryEs: 'Otro', mood: 'soft & cinematic', moodEs: 'suave y cinematográfico', icon: '∿', color: '#a6c1e8', waveform: 'sawtooth' },
]

const keyboardNotes = Array.from({ length: 25 }, (_, index) => 48 + index)
const blackNotes = new Set([49, 51, 54, 56, 58, 61, 63, 66, 68, 70])
const computerKeyMap: Record<string, number> = {
  a: 48, w: 49, s: 50, e: 51, d: 52, f: 53, t: 54, g: 55, y: 56, h: 57, u: 58, j: 59,
  k: 60, o: 61, l: 62, p: 63, ';': 64,
}
const encoderCcs = [74, 71, 76, 77, 93, 18, 19, 16]
const faderCcs = [82, 83, 85, 17]
const defaultKnobs = { tone: 58, reverb: 35, delay: 12, attack: 24 }
const whiteKeyCount = keyboardNotes.filter((note) => !blackNotes.has(note)).length

function blackKeyLeft(note: number) {
  const whiteKeysBefore = keyboardNotes.filter((candidate) => candidate < note && !blackNotes.has(candidate)).length
  return `calc(${(whiteKeysBefore / whiteKeyCount) * 100}% - 2.4%)`
}

const copy = {
  es: {
    eyebrow: 'Un lugar para', freePlay: 'MODO LIBRE', heroTitle: 'Haz algo', heroEmphasis: 'pequeño.', heroCopy: 'Conecta tu MiniLab, elige un estado de ánimo y sigue el sonido.',
    tempo: 'TEMPO', bpm: 'BPM', slower: 'Más lento', faster: 'Más rápido', chooseSound: 'ELIGE UN SONIDO', soundSettings: 'ajustes de sonido',
    minilabVisualizer: 'MINILAB / VISUALIZADOR', tip: 'Pulsa una tecla del MiniLab o usa A–P para tocar', hardware: 'hardware y pantalla se mueven juntos', computer: 'el teclado A–P también funciona',
    controller: 'CONTROLADOR', noController: 'Sin controlador todavía', unsupported: 'Web MIDI no disponible', waiting: 'Esperando un controlador MIDI', looking: 'Buscando un controlador', tryChrome: 'Prueba Chrome o Edge para MIDI', plugIn: 'Conecta tu MiniLab para empezar', connectMidi: 'Conectar MIDI', rescan: 'Volver a buscar MIDI', selectController: 'Seleccionar controlador',
    padBank: 'BANCO DE PADS', encoders: 'ENCODERS 1–8', faders: 'FADERS 1–4', keys: '25 TECLAS · SLIM KEYBED',
    quickTools: 'HERRAMIENTAS RÁPIDAS', inspire: 'Inspírame', inspireSub: 'Encuentra un punto de partida', preview: 'Probar sonido', previewSub: 'Escucha el instrumento elegido',
    metronome: 'Metrónomo', metronomeSub: 'Pulso audible a este BPM', start: 'Iniciar', pause: 'Pausar', active: 'activo',
    shape: 'DALE FORMA', autoMap: 'los controles se asignan solos', tone: 'timbre', reverb: 'reverb', delay: 'delay', attack: 'ataque',
    loop: 'LOOP', loopSub: 'una pulsación para empezar', loopsNext: 'Loops y capas son el siguiente paso', openMonitor: 'abrir monitor MIDI',
    record: 'GRABAR SESIÓN', stopRecord: 'DETENER GRABACIÓN', recordSub: 'captura el audio que escuchas', recording: 'Grabando sesión', recordingReady: 'Grabación lista', download: 'Descargar',
    audioReady: 'audio listo', audioWaiting: 'esperando la primera nota', footer: 'local-first · sin cuenta · hecho para perderse en el sonido',
    devTool: 'HERRAMIENTA DE DESARROLLO', midiMonitor: 'Monitor MIDI', liveMessages: 'mensajes en vivo de', events: 'eventos', emptyEvents: 'Pulsa una tecla o mueve un control para verlo aquí.', listener: 'escucha activa', clear: 'limpiar',
    settings: 'AJUSTES DEL PLAYGROUND', keepSimple: 'Mantengámoslo simple.', scale: 'Asistente de escala', scaleSub: 'Stay in key llegará con el motor de loops.', output: 'Salida de audio', outputSub: 'Predeterminada del navegador · baja latencia recomendada.', packs: 'Packs de instrumentos', packsSub: 'Los sonidos sampleados llegarán después del loop principal.', openMidi: 'Abrir monitor MIDI', language: 'Cambiar idioma',
  },
  en: {
    eyebrow: 'A tiny place to', freePlay: 'FREE PLAY', heroTitle: 'Make a little', heroEmphasis: 'something.', heroCopy: 'Connect your MiniLab, choose a mood, and follow the sound.',
    tempo: 'TEMPO', bpm: 'BPM', slower: 'Slower', faster: 'Faster', chooseSound: 'CHOOSE A SOUND', soundSettings: 'sound settings',
    minilabVisualizer: 'MINILAB / VISUALIZER', tip: 'Press any key on your MiniLab, or use A–P to play', hardware: 'hardware & screen move together', computer: 'computer keys A–P work too',
    controller: 'CONTROLLER', noController: 'No controller yet', unsupported: 'Web MIDI unavailable', waiting: 'Waiting for a MIDI controller', looking: 'Looking for a controller', tryChrome: 'Try Chrome or Edge for MIDI access', plugIn: 'Plug in your MiniLab to start playing', connectMidi: 'Connect MIDI', rescan: 'Rescan MIDI', selectController: 'Select controller',
    padBank: 'PAD BANK', encoders: 'ENCODERS 1–8', faders: 'FADERS 1–4', keys: '25 KEYS · SLIM KEYBED',
    quickTools: 'QUICK TOOLS', inspire: 'Inspire me', inspireSub: 'Find a new place to start', preview: 'Preview sound', previewSub: 'Hear the selected instrument',
    metronome: 'Metronome', metronomeSub: 'Audible pulse at this BPM', start: 'Start', pause: 'Pause', active: 'active',
    shape: 'SHAPE THE FEELING', autoMap: 'knobs map automatically', tone: 'tone', reverb: 'reverb', delay: 'delay', attack: 'attack',
    loop: 'LOOP', loopSub: 'one press to begin', loopsNext: 'Loops & layers are next', openMonitor: 'open MIDI monitor',
    record: 'RECORD SESSION', stopRecord: 'STOP RECORDING', recordSub: 'capture the audio you hear', recording: 'Recording session', recordingReady: 'Recording ready', download: 'Download',
    audioReady: 'audio ready', audioWaiting: 'waiting for first note', footer: 'local-first · no account · made for getting lost in sound',
    devTool: 'DEVELOPMENT TOOL', midiMonitor: 'MIDI monitor', liveMessages: 'live messages from', events: 'events', emptyEvents: 'Play a key or move a control to see it here.', listener: 'listener active', clear: 'clear',
    settings: 'PLAYGROUND SETTINGS', keepSimple: 'Keep it simple.', scale: 'Scale assist', scaleSub: 'Stay in key will arrive with the loop engine.', output: 'Audio output', outputSub: 'Browser default · low latency preferred.', packs: 'Instrument packs', packsSub: 'Sample-based sounds are planned after the core play loop.', openMidi: 'Open MIDI monitor', language: 'Change language',
  },
} as const

function formatDuration(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function App() {
  const midi = useMemo(() => new MidiEngine(), [])
  const audio = useMemo(() => new AudioEngine(), [])
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem('minilab-language') === 'en' ? 'en' : 'es')
  const ui = copy[language]
  const [selectedInstrument, setSelectedInstrument] = useState(instruments[2])
  const [midiState, setMidiState] = useState<'checking' | 'connected' | 'waiting' | 'unsupported'>('checking')
  const [devices, setDevices] = useState<MidiInputLike[]>([])
  const [activeDevice, setActiveDevice] = useState<MidiInputLike | null>(null)
  const [showMonitor, setShowMonitor] = useState(false)
  const [logs, setLogs] = useState<MidiLogEvent[]>([])
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set())
  const [activePads, setActivePads] = useState<Set<number>>(new Set())
  const [padBank, setPadBank] = useState<'A' | 'B'>('A')
  const [knobs, setKnobs] = useState(defaultKnobs)
  const [hardwareValues, setHardwareValues] = useState<Record<number, number>>({})
  const [lastControl, setLastControl] = useState<{ cc: number; value: number } | null>(null)
  const [bpm, setBpm] = useState(readStoredBpm)
  const [isAudioReady, setIsAudioReady] = useState(false)
  const [isTransportPlaying, setIsTransportPlaying] = useState(false)
  const [beat, setBeat] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [tip, setTip] = useState<string>(ui.tip)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [recordingMime, setRecordingMime] = useState('audio/webm')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingStartedAtRef = useRef(0)
  const languageRef = useRef(language)

  useEffect(() => {
    languageRef.current = language
    localStorage.setItem('minilab-language', language)
    setTip(copy[language].tip)
  }, [language])

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
      if (pressed) setTip(`Pad ${pad} · MIDI`)
    },
    onKnob: (cc: number, value: number) => {
      setHardwareValues((previous) => ({ ...previous, [cc]: value }))
      setLastControl({ cc, value })
      const knobNames: Record<number, keyof typeof defaultKnobs> = { 74: 'tone', 71: 'reverb', 76: 'delay', 77: 'attack', 93: 'tone', 18: 'reverb', 19: 'delay', 16: 'attack' }
      const name = knobNames[cc]
      if (name) {
        const normalized = Math.round((value / 127) * 100)
        setKnobs((previous) => ({ ...previous, [name]: normalized }))
        if (name === 'tone') audio.setTone(value / 127)
        if (name === 'attack') audio.setAttack(value / 127)
      }
    },
    onLog: (event: MidiLogEvent) => setLogs((previous) => [event, ...previous].slice(0, 20)),
    onDevices: (inputs: MidiInputLike[]) => {
      setDevices(inputs)
      if (!inputs.length) {
        setMidiState('waiting')
        setActiveDevice(null)
      } else {
        setMidiState('connected')
        setActiveDevice((current) => current && inputs.some((input) => input.id === current.id) ? current : inputs.find((input) => /minilab.*midi|arturia.*midi/i.test(`${input.name} ${input.manufacturer}`)) ?? inputs[0])
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

  useEffect(() => () => {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl)
  }, [recordingUrl])

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

  useEffect(() => {
    if (!isTransportPlaying) return
    let currentBeat = 0
    const tick = () => {
      void audio.start().then(() => audio.triggerClick(currentBeat % 4 === 0))
      setBeat(currentBeat % 4)
      currentBeat += 1
    }
    tick()
    const interval = window.setInterval(tick, 60000 / bpm)
    return () => window.clearInterval(interval)
  }, [audio, bpm, isTransportPlaying])

  useEffect(() => {
    if (!isRecording) return
    const interval = window.setInterval(() => setRecordingSeconds(Math.floor((Date.now() - recordingStartedAtRef.current) / 1000)), 250)
    return () => window.clearInterval(interval)
  }, [isRecording])

  const pressNote = (note: number, velocity = 96) => {
    void audio.start().then(() => {
      audio.noteOn(note, velocity)
      setIsAudioReady(true)
    })
    setActiveNotes((previous) => new Set(previous).add(note))
    setTip(`${midiNoteName(note)} · ${language === 'es' ? 'teclado del ordenador' : 'computer keyboard'}`)
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

  const startRecording = async () => {
    if (isRecording) {
      recorderRef.current?.stop()
      return
    }
    await audio.start()
    const stream = audio.getRecordingStream()
    if (!stream || !('MediaRecorder' in window)) {
      setTip(language === 'es' ? 'Este navegador no permite grabar audio' : 'This browser cannot record audio')
      return
    }
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? ''
    const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    recordingChunksRef.current = []
    recorder.ondataavailable = (event) => { if (event.data.size) recordingChunksRef.current.push(event.data) }
    recorder.onstop = () => {
      const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
      setRecordingUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return URL.createObjectURL(blob) })
      setRecordingMime(recorder.mimeType || 'audio/webm')
      setIsRecording(false)
      setTip(ui.recordingReady)
    }
    recorder.start(250)
    recorderRef.current = recorder
    recordingStartedAtRef.current = Date.now()
    setRecordingSeconds(0)
    setRecordingUrl(null)
    setIsRecording(true)
    setTip(ui.recording)
  }

  const statusLabel = midiState === 'connected' ? 'MiniLab 3 ' + (language === 'es' ? 'conectado' : 'connected') : midiState === 'unsupported' ? ui.unsupported : midiState === 'waiting' ? ui.waiting : ui.looking
  const statusDetail = activeDevice?.name || (midiState === 'unsupported' ? ui.tryChrome : midiState === 'waiting' ? ui.plugIn : ui.tryChrome)
  const instrumentText = (instrument: InstrumentDefinition) => language === 'es' ? { name: instrument.nameEs, category: instrument.categoryEs, mood: instrument.moodEs } : { name: instrument.name, category: instrument.category, mood: instrument.mood }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <div className="brand-lockup"><div className="brand-mark"><Waves size={18} strokeWidth={2.4} /></div><div><span className="eyebrow">{ui.eyebrow}</span><h1>MiniLab Playground</h1></div></div>
        <div className="top-actions"><div className={`connection-pill ${midiState}`}><span className="status-dot" /><span>{statusLabel}</span></div><button className="language-toggle" aria-label={ui.language} title={ui.language} onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}><Languages size={15} /> {language === 'es' ? 'EN' : 'ES'}</button><button className="icon-button" aria-label="Settings" onClick={() => setShowSettings((value) => !value)}><Settings2 size={17} /></button><button className="icon-button" aria-label="Menu" onClick={() => setShowMonitor(true)}><Menu size={18} /></button></div>
      </header>

      <main className="workspace">
        <section className="hero-row"><div><p className="section-kicker"><span className="live-dot" /> {ui.freePlay}</p><h2>{ui.heroTitle} <em>{ui.heroEmphasis}</em></h2><p className="hero-copy">{ui.heroCopy}</p></div><div className="tempo-card"><span className="tempo-label">{ui.tempo}</span><div className="tempo-value"><span>♩</span><strong>{bpm}</strong><small>{ui.bpm}</small></div><div className="tempo-controls"><button aria-label={ui.slower} onClick={() => updateBpm(bpm - 1)}>−</button><button aria-label={ui.faster} onClick={() => updateBpm(bpm + 1)}>+</button></div><button className={`transport-button ${isTransportPlaying ? 'active' : ''}`} aria-label={isTransportPlaying ? ui.pause : ui.start} onClick={() => setIsTransportPlaying((value) => !value)}>{isTransportPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}<span>{isTransportPlaying ? ui.pause : ui.start}</span></button><div className="beat-dots" aria-label={ui.metronome}>{[0, 1, 2, 3].map((item) => <span key={item} className={isTransportPlaying && beat === item ? 'current' : ''} />)}</div></div></section>

        <section className="instrument-section panel"><div className="panel-heading"><div><span className="section-kicker">{ui.chooseSound}</span><h3>{instrumentText(selectedInstrument).name} <span className="muted">/ {instrumentText(selectedInstrument).mood}</span></h3></div><button className="text-button" onClick={() => setShowSettings(true)}>{ui.soundSettings} <ChevronDown size={15} /></button></div><div className="instrument-grid">{instruments.map((instrument) => <button className={`instrument-card ${selectedInstrument.id === instrument.id ? 'selected' : ''}`} key={instrument.id} onClick={() => setSelectedInstrument(instrument)} style={{ '--instrument-color': instrument.color } as CSSProperties}><span className="instrument-icon">{instrument.icon}</span><span className="instrument-name">{instrumentText(instrument).name}</span><span className="instrument-category">{instrumentText(instrument).category}</span></button>)}<button className="instrument-card add-card" onClick={() => setTip(language === 'es' ? 'Los packs importados llegarán después del motor de loops' : 'Imported packs arrive after the loop engine')}><span className="instrument-icon"><Plus size={20} /></span><span className="instrument-name">{language === 'es' ? 'Nuevo sonido' : 'New sound'}</span><span className="instrument-category">{language === 'es' ? 'pronto' : 'soon'}</span></button></div></section>

        <section className="playground-grid"><div className="keyboard-panel panel"><div className="panel-heading compact"><div className="controller-label"><KeyboardMusic size={17} /><span>{ui.minilabVisualizer}</span></div><span className="hint-text">{tip}</span></div><div className="hardware-overview"><div className="hardware-block pad-block"><div className="hardware-label-row"><span>{ui.padBank}</span><div className="pad-bank-toggle"><button className={padBank === 'A' ? 'selected' : ''} onClick={() => setPadBank('A')}>A</button><button className={padBank === 'B' ? 'selected' : ''} onClick={() => setPadBank('B')}>B</button></div></div><div className="pad-grid">{Array.from({ length: 8 }, (_, index) => index + 1).map((pad) => <button key={pad} className={`hardware-pad ${activePads.has(pad) ? 'active' : ''}`} onPointerDown={() => setActivePads((previous) => new Set(previous).add(pad))} onPointerUp={() => setActivePads((previous) => { const next = new Set(previous); next.delete(pad); return next })} onPointerLeave={() => setActivePads((previous) => { const next = new Set(previous); next.delete(pad); return next })}><span>{pad}</span></button>)}</div></div><div className="hardware-block encoder-block"><div className="hardware-label-row"><span>{ui.encoders}</span><span className="hardware-live">{lastControl ? `CC ${lastControl.cc}` : '—'}</span></div><div className="encoder-grid">{encoderCcs.map((cc, index) => { const value = hardwareValues[cc] ?? [58, 35, 12, 24, 52, 40, 28, 64][index]; return <div className={`hardware-encoder ${lastControl?.cc === cc ? 'live' : ''}`} key={cc}><div className="mini-knob" style={{ '--knob-progress': `${(value / 127) * 100}%` } as CSSProperties}><span /></div><small>{index + 1}</small></div> })}</div></div><div className="hardware-block fader-block"><div className="hardware-label-row"><span>{ui.faders}</span></div><div className="fader-grid">{faderCcs.map((cc, index) => <div className="mini-fader" key={cc}><div className="fader-rail"><span style={{ bottom: `${((hardwareValues[cc] ?? [72, 55, 42, 66][index]) / 127) * 100}%` }} /></div><small>{index + 1}</small></div>)}</div></div></div><div className="sound-orbit"><span style={{ background: selectedInstrument.color }} /><span /><span /></div><div className="keyboard-wrap" aria-label={ui.keys}><div className="keyboard">{keyboardNotes.map((note) => { const isBlack = blackNotes.has(note); return <button key={note} style={isBlack ? { '--black-key-left': blackKeyLeft(note) } as CSSProperties : undefined} className={`key ${isBlack ? 'black-key' : 'white-key'} ${activeNotes.has(note) ? 'active' : ''}`} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); pressNote(note, 96) }} onPointerUp={() => releaseNote(note)} onPointerCancel={() => releaseNote(note)} onPointerLeave={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) releaseNote(note) }}>{!isBlack && note % 12 === 0 && <span>C{Math.floor(note / 12) - 1}</span>}</button> })}</div></div><div className="controller-footnote"><span><span className="key-dot" /> {ui.hardware}</span><span>{ui.computer}</span></div></div>

          <aside className="side-stack"><div className="midi-card panel"><div className="card-title-row"><span className="section-kicker">{ui.controller}</span><Activity size={17} /></div><div className="device-name"><Headphones size={17} />{activeDevice?.name || ui.noController}</div><p>{statusDetail}</p><button className="outline-button" onClick={connectMidi}><Power size={15} /> {midiState === 'connected' ? ui.rescan : ui.connectMidi}</button>{devices.length > 1 && <select className="device-select" aria-label={ui.selectController} value={activeDevice?.id ?? ''} onChange={(event) => { const selected = devices.find((device) => device.id === event.target.value); if (selected) { midi.selectInput(selected, callbacks); setActiveDevice(selected) } }}><option value="">{ui.selectController}</option>{devices.map((device) => <option key={device.id} value={device.id}>{device.name || device.id}</option>)}</select>}</div><div className="quick-card panel"><div className="card-title-row"><span className="section-kicker">{ui.quickTools}</span><Sparkles size={17} /></div><button className="quick-action" onClick={() => { const next = instruments[Math.floor(Math.random() * instruments.length)]; setSelectedInstrument(next); updateBpm([72, 84, 92, 108][Math.floor(Math.random() * 4)]); setTip(`${instrumentText(next).name} · ${language === 'es' ? 'una invitación a tocar' : 'a small invitation to play'}`) }}><span className="quick-action-icon"><Lightbulb size={17} /></span><span><strong>{ui.inspire}</strong><small>{ui.inspireSub}</small></span><ChevronDown size={15} className="rotate-neg" /></button><button className={`quick-action ${isTransportPlaying ? 'playing' : ''}`} onClick={() => setIsTransportPlaying((value) => !value)}><span className="quick-action-icon">{isTransportPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</span><span><strong>{isTransportPlaying ? `${ui.metronome} ${ui.active}` : ui.metronome}</strong><small>{ui.metronomeSub}</small></span><span className="preview-bars">{isTransportPlaying ? '▂▅▂▅' : '▂▅▃▇'}</span></button></div></aside></section>

        <section className="lower-row"><div className="controls-panel panel"><div className="panel-heading compact"><div className="controller-label"><SlidersHorizontal size={17} /><span>{ui.shape}</span></div><span className="mapping-note">{ui.autoMap}</span></div><div className="knob-grid">{(['tone', 'reverb', 'delay', 'attack'] as const).map((name) => <label className="knob-control" key={name}><span>{ui[name]}</span><input aria-label={`${ui[name]} ${knobs[name]}%`} type="range" min="0" max="100" value={knobs[name]} onChange={(event) => { const value = Number(event.target.value); setKnobs((previous) => ({ ...previous, [name]: value })); if (name === 'tone') audio.setTone(value / 100); if (name === 'attack') audio.setAttack(value / 100) }} /><div className="knob-visual" style={{ '--knob-progress': `${knobs[name]}%` } as CSSProperties}><div className="knob-dot" /></div><small>{knobs[name]}%</small></label>)}</div></div><div className="actions-panel panel"><div className="action-row"><button className="loop-button" onClick={() => setTip(language === 'es' ? 'La grabación de loops MIDI será el siguiente motor' : 'MIDI loop recording is the next engine')}><span className="record-symbol" /><span><strong>{ui.loop}</strong><small>{ui.loopSub}</small></span></button><button className={`record-button ${isRecording ? 'recording' : ''}`} onClick={() => void startRecording()}>{isRecording ? <Square size={15} fill="currentColor" /> : <Circle size={15} fill="currentColor" />}<span>{isRecording ? `${ui.stopRecord} · ${formatDuration(recordingSeconds)}` : ui.record}</span></button></div>{recordingUrl && <div className="recording-result"><div className="recording-result-heading"><FileAudio size={16} /><span><strong>{ui.recordingReady}</strong><small>{recordingMime} · {formatDuration(recordingSeconds)}</small></span><a href={recordingUrl} download={`minilab-session-${Date.now()}.webm`}><Download size={15} /> {ui.download}</a></div><audio controls src={recordingUrl} /></div>}<div className="next-row"><span><span className="sparkle-mini">✦</span> {ui.loopsNext}</span><button className="monitor-link" onClick={() => setShowMonitor(true)}><Activity size={14} /> {ui.openMonitor} <span>{logs.length}</span></button></div></div></section>
      </main>

      <footer className="footer"><span><span className="footer-status" /> {isAudioReady ? ui.audioReady : ui.audioWaiting}</span><span>{ui.footer}</span></footer>

      {showMonitor && <div className="modal-backdrop" onClick={() => setShowMonitor(false)}><div className="monitor-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="section-kicker">{ui.devTool}</span><h3>{ui.midiMonitor}</h3></div><button className="icon-button" onClick={() => setShowMonitor(false)}><X size={17} /></button></div><div className="monitor-caption"><span>{ui.liveMessages} {activeDevice?.name || (language === 'es' ? 'tu controlador' : 'your controller')}</span><span>{logs.length} {ui.events}</span></div><div className="event-list">{logs.length ? logs.map((event) => <div className="event-row" key={event.id}><span className={`event-type ${event.type === 'NOTE ON' ? 'note' : event.type === 'CC' ? 'cc' : ''}`}>{event.type}</span><strong>{event.label}</strong><span>{event.detail}</span><time>{event.time}</time></div>) : <div className="empty-events"><Activity size={24} /><span>{ui.emptyEvents}</span></div>}</div><div className="modal-footer"><span><span className="status-dot connected" /> {ui.listener}</span><button className="text-button" onClick={() => setLogs([])}><RotateCcw size={14} /> {ui.clear}</button></div></div></div>}
      {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><div className="settings-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="section-kicker">{ui.settings}</span><h3>{ui.keepSimple}</h3></div><button className="icon-button" onClick={() => setShowSettings(false)}><X size={17} /></button></div><div className="settings-list"><div><span>{ui.scale}</span><small>{ui.scaleSub}</small></div><div><span>{ui.output}</span><small>{ui.outputSub}</small></div><div><span>{ui.packs}</span><small>{ui.packsSub}</small></div></div><button className="outline-button full" onClick={() => { setShowSettings(false); setShowMonitor(true) }}><Activity size={15} /> {ui.openMidi}</button></div></div>}
    </div>
  )
}

export default App
