import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  Activity,
  ChevronDown,
  Circle,
  Download,
  FileAudio,
  Grid2X2,
  Headphones,
  KeyboardMusic,
  Languages,
  Lightbulb,
  Menu,
  Music2,
  Pause,
  Play,
  Plus,
  Power,
  RotateCcw,
  Settings2,
  Square,
  Trash2,
  Upload,
  Waves,
  X,
} from 'lucide-react'
import { AudioEngine } from './lib/audioEngine'
import { chooseKeyboardStart, accuracyFor, judgeInput, playableNotes } from './lib/gameScoring'
import { midiNoteName, MidiEngine, type MidiInputLike } from './lib/midiEngine'
import { readStoredBpm, storeBpm } from './lib/storage'
import { parseMidiFile, pickTargetTrack } from './lib/songParser'
import { songStorage, type StoredSong } from './lib/songStorage'
import { SongTransport } from './lib/songTransport'
import { SongGame } from './components/SongGame'
import type { GameTransportState, GameView, ImportedSong, InstrumentDefinition, MidiLogEvent, MidiNoteInput, SongTrack } from './types'

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
const blackPitchClasses = new Set([1, 3, 6, 8, 10])
const computerKeyOffsets: Record<string, number> = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14, p: 15, ';': 16 }
const defaultKnobs = { tone: 58, reverb: 35, delay: 12, attack: 24 }

const copy = {
  es: {
    eyebrow: 'Un lugar para', freePlay: 'MODO LIBRE', heroTitle: 'Haz algo', heroEmphasis: 'pequeño.', heroCopy: 'Conecta tu MiniLab, elige un sonido y empieza a tocar.', tempo: 'TEMPO', bpm: 'BPM', slower: 'Más lento', faster: 'Más rápido', chooseSound: 'ELIGE UN SONIDO', soundSettings: 'ajustes', inspire: 'Inspírame', songs: 'CANCIONES', songLibrary: 'Biblioteca de canciones', loadSong: 'Cargar canción', dropSong: 'Arrastra un MIDI aquí o selecciónalo', midiOnly: 'Solo archivos .mid y .midi', noSongs: 'Todavía no hay canciones cargadas.', openSong: 'Jugar', deleteSong: 'Eliminar', loadingSong: 'Analizando MIDI…', songLoaded: 'Canción lista para jugar', songError: 'No se pudo leer ese MIDI.', songEmpty: 'El MIDI no contiene pistas con notas.', targetTrack: 'Pista objetivo', gameReady: 'Elige una canción para comenzar',
    minilab: 'MINILAB / VISUALIZADOR', keys: '25 TECLAS', tip: 'Pulsa una tecla del MiniLab o usa A–P para tocar', computer: 'el teclado A–P también funciona', pads: 'PADS', padBank: 'BANCO', controller: 'CONTROLADOR', noController: 'Sin controlador todavía', unsupported: 'Web MIDI no disponible', waiting: 'Esperando un controlador MIDI', looking: 'Buscando un controlador', tryChrome: 'Prueba Chrome o Edge para MIDI', plugIn: 'Conecta tu MiniLab para empezar', connectMidi: 'Conectar MIDI', rescan: 'Volver a buscar MIDI', selectController: 'Seleccionar controlador',
    metronome: 'Metrónomo', active: 'activo', start: 'Iniciar', pause: 'Pausar', loop: 'LOOP', loopSub: 'una pulsación para empezar', record: 'GRABAR SESIÓN', stopRecord: 'DETENER GRABACIÓN', recording: 'Grabando sesión', recordingReady: 'Grabación lista', download: 'Descargar', loopsNext: 'Loops y capas son el siguiente paso', openMonitor: 'abrir monitor MIDI',
    audioReady: 'audio listo', audioWaiting: 'esperando la primera nota', footer: 'local-first · sin cuenta · hecho para perderse en el sonido', devTool: 'HERRAMIENTA DE DESARROLLO', midiMonitor: 'Monitor MIDI', liveMessages: 'mensajes en vivo de', events: 'eventos', emptyEvents: 'Pulsa una tecla o mueve un control para verlo aquí.', listener: 'escucha activa', clear: 'limpiar', settings: 'AJUSTES', keepSimple: 'Mantengámoslo simple.', scale: 'Asistente de escala', scaleSub: 'Stay in key llegará con el motor de loops.', output: 'Salida de audio', outputSub: 'Predeterminada del navegador · baja latencia recomendada.', packs: 'Packs de instrumentos', packsSub: 'Los sonidos sampleados llegarán después del loop principal.', openMidi: 'Abrir monitor MIDI', language: 'Cambiar idioma',
  },
  en: {
    eyebrow: 'A tiny place to', freePlay: 'FREE PLAY', heroTitle: 'Make a little', heroEmphasis: 'something.', heroCopy: 'Connect your MiniLab, choose a sound, and start playing.', tempo: 'TEMPO', bpm: 'BPM', slower: 'Slower', faster: 'Faster', chooseSound: 'CHOOSE A SOUND', soundSettings: 'settings', inspire: 'Inspire me', songs: 'SONGS', songLibrary: 'Song library', loadSong: 'Load song', dropSong: 'Drop a MIDI here or choose one', midiOnly: 'Only .mid and .midi files', noSongs: 'No songs loaded yet.', openSong: 'Play', deleteSong: 'Delete', loadingSong: 'Reading MIDI…', songLoaded: 'Song ready to play', songError: 'That MIDI could not be read.', songEmpty: 'The MIDI has no tracks with notes.', targetTrack: 'Target track', gameReady: 'Choose a song to begin',
    minilab: 'MINILAB / VISUALIZER', keys: '25 KEYS', tip: 'Press any key on your MiniLab, or use A–P to play', computer: 'computer keys A–P work too', pads: 'PADS', padBank: 'BANK', controller: 'CONTROLLER', noController: 'No controller yet', unsupported: 'Web MIDI unavailable', waiting: 'Waiting for a MIDI controller', looking: 'Looking for a controller', tryChrome: 'Try Chrome or Edge for MIDI access', plugIn: 'Plug in your MiniLab to start playing', connectMidi: 'Connect MIDI', rescan: 'Rescan MIDI', selectController: 'Select controller',
    metronome: 'Metronome', active: 'active', start: 'Start', pause: 'Pause', loop: 'LOOP', loopSub: 'one press to begin', record: 'RECORD SESSION', stopRecord: 'STOP RECORDING', recording: 'Recording session', recordingReady: 'Recording ready', download: 'Download', loopsNext: 'Loops & layers are next', openMonitor: 'open MIDI monitor',
    audioReady: 'audio ready', audioWaiting: 'waiting for first note', footer: 'local-first · no account · made for getting lost in sound', devTool: 'DEVELOPMENT TOOL', midiMonitor: 'MIDI monitor', liveMessages: 'live messages from', events: 'events', emptyEvents: 'Play a key or move a control to see it here.', listener: 'listener active', clear: 'clear', settings: 'SETTINGS', keepSimple: 'Keep it simple.', scale: 'Scale assist', scaleSub: 'Stay in key will arrive with the loop engine.', output: 'Audio output', outputSub: 'Browser default · low latency preferred.', packs: 'Instrument packs', packsSub: 'Sample-based sounds are planned after the core play loop.', openMidi: 'Open MIDI monitor', language: 'Change language',
  },
} as const

function blackKeyLeft(note: number, notes = keyboardNotes) {
  const whiteNotes = notes.filter((candidate) => !blackPitchClasses.has(candidate % 12))
  const whiteKeysBefore = notes.filter((candidate) => candidate < note && !blackPitchClasses.has(candidate % 12)).length
  return `calc(${(whiteKeysBefore / whiteNotes.length) * 100}% - 2.4%)`
}

function formatDuration(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function instrumentForTrack(track: SongTrack) {
  const name = `${track.instrumentName}`.toLowerCase()
  if (track.isPercussion || name.includes('drum') || name.includes('percussion')) return instruments.find((instrument) => instrument.id === 'pluck')!
  if (name.includes('bass')) return instruments.find((instrument) => instrument.id === 'warm-bass')!
  if (name.includes('guitar')) return instruments.find((instrument) => instrument.id === 'pluck')!
  if (name.includes('string') || name.includes('violin') || name.includes('cello')) return instruments.find((instrument) => instrument.id === 'strings')!
  if (name.includes('pad')) return instruments.find((instrument) => instrument.id === 'warm-pad')!
  if (name.includes('synth')) return instruments.find((instrument) => instrument.id === 'retro-synth')!
  if (name.includes('organ') || name.includes('piano') || name.includes('keyboard')) return instruments.find((instrument) => instrument.id === 'soft-piano')!
  return instruments[track.instrumentProgram % instruments.length] ?? instruments[0]
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
  const [showSettings, setShowSettings] = useState(false)
  const [showPadMenu, setShowPadMenu] = useState(false)
  const [padBank, setPadBank] = useState<'A' | 'B'>('A')
  const [logs, setLogs] = useState<MidiLogEvent[]>([])
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set())
  const [activePads, setActivePads] = useState<Set<number>>(new Set())
  const [knobs, setKnobs] = useState(defaultKnobs)
  const [bpm, setBpm] = useState(readStoredBpm)
  const [beat, setBeat] = useState(0)
  const [isAudioReady, setIsAudioReady] = useState(false)
  const [isTransportPlaying, setIsTransportPlaying] = useState(false)
  const [tip, setTip] = useState<string>(ui.tip)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [recordingMime, setRecordingMime] = useState('audio/webm')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingStartedAtRef = useRef(0)
  const [songLibrary, setSongLibrary] = useState<StoredSong[]>([])
  const [showSongLibrary, setShowSongLibrary] = useState(false)
  const [isImportingSong, setIsImportingSong] = useState(false)
  const [activeSong, setActiveSong] = useState<ImportedSong | null>(null)
  const [targetTrackId, setTargetTrackId] = useState('')
  const [gameView, setGameView] = useState<GameView>('falling')
  const [gameState, setGameState] = useState<GameTransportState>('stopped')
  const [gamePosition, setGamePosition] = useState(0)
  const [gameSpeed, setGameSpeed] = useState(1)
  const [keyboardStart, setKeyboardStart] = useState(48)
  const [gameScore, setGameScore] = useState(0)
  const [gameCombo, setGameCombo] = useState(0)
  const [gameAccuracy, setGameAccuracy] = useState(100)
  const [lastJudgment, setLastJudgment] = useState('—')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const judgedIdsRef = useRef<Set<string>>(new Set())
  const scoreStatsRef = useRef({ score: 0, combo: 0, hits: 0, attempts: 0 })
  const gameRef = useRef({ song: null as ImportedSong | null, targetTrackId: '', keyboardStart: 48 })

  const transport = useMemo(() => new SongTransport(audio, {
    onUpdate: (snapshot) => {
      setGameState(snapshot.state)
      setGamePosition(snapshot.position)
      setGameSpeed(snapshot.speed)
    },
    onBeat: (nextBeat, accent) => {
      setBeat(nextBeat % 4)
      void audio.start().then(() => audio.triggerClick(accent))
    },
  }), [audio])

  gameRef.current = { song: activeSong, targetTrackId, keyboardStart }

  useEffect(() => {
    localStorage.setItem('minilab-language', language)
    setTip(copy[language].tip)
  }, [language])

  const resetGameScore = () => {
    scoreStatsRef.current = { score: 0, combo: 0, hits: 0, attempts: 0 }
    judgedIdsRef.current = new Set()
    setGameScore(0)
    setGameCombo(0)
    setGameAccuracy(100)
    setLastJudgment('—')
  }

  const handleGameInput = useCallback((input: MidiNoteInput) => {
    const game = gameRef.current
    const track = game.song?.tracks.find((candidate) => candidate.id === game.targetTrackId)
    if (!game.song || !track) return
    const result = judgeInput(input, playableNotes(track, game.keyboardStart), transport.getPosition(), game.keyboardStart, judgedIdsRef.current)
    if (result.noteId) judgedIdsRef.current.add(result.noteId)
    const stats = scoreStatsRef.current
    stats.attempts += 1
    if (result.label !== 'Fallo') {
      stats.hits += 1
      stats.combo += 1
      stats.score += result.points
    } else {
      stats.combo = 0
    }
    setGameScore(stats.score)
    setGameCombo(stats.combo)
    setGameAccuracy(accuracyFor(stats.hits, stats.attempts))
    setLastJudgment(result.label)
  }, [transport])

  const callbacks = useMemo(() => ({
    onNoteOn: (note: number, velocity: number, channel: number, receivedAt: number) => {
      void audio.start().then(() => { audio.noteOn(note, velocity); setIsAudioReady(true) })
      handleGameInput({ note, velocity, channel, receivedAt, source: 'midi' })
      setActiveNotes((previous) => new Set(previous).add(note))
      setTip(`${midiNoteName(note)} · velocity ${velocity}`)
    },
    onNoteOff: (note: number) => {
      audio.noteOff(note)
      setActiveNotes((previous) => { const next = new Set(previous); next.delete(note); return next })
    },
    onPad: (pad: number, pressed: boolean) => {
      setActivePads((previous) => { const next = new Set(previous); if (pressed) next.add(pad); else next.delete(pad); return next })
      if (pressed) setTip(`Pad ${pad} · MIDI`)
    },
    onKnob: (cc: number, value: number) => {
      const knobNames: Record<number, keyof typeof defaultKnobs> = { 74: 'tone', 71: 'reverb', 76: 'delay', 77: 'attack', 93: 'tone', 18: 'reverb', 19: 'delay', 16: 'attack' }
      const name = knobNames[cc]
      if (!name) return
      const normalized = Math.round((value / 127) * 100)
      setKnobs((previous) => ({ ...previous, [name]: normalized }))
      if (name === 'tone') audio.setTone(value / 127)
      if (name === 'attack') audio.setAttack(value / 127)
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
  }), [audio, handleGameInput])

  const connectMidi = useCallback(async () => {
    setMidiState('checking')
    try { await midi.connect(callbacks) } catch { setMidiState('unsupported') }
  }, [callbacks, midi])

  useEffect(() => {
    audio.setInstrument(selectedInstrument)
    audio.setTone(knobs.tone / 100)
  }, [audio, knobs.tone, selectedInstrument])

  useEffect(() => {
    transport.setInstrumentResolver((track) => instrumentForTrack(track))
    void songStorage.list().then(setSongLibrary)
    return () => transport.dispose()
  }, [transport])

  useEffect(() => {
    void connectMidi()
    return () => { midi.disconnect(); audio.stopAll() }
  }, [audio, connectMidi, midi])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      const offset = computerKeyOffsets[event.key.toLowerCase()]
      const note = offset === undefined ? undefined : (activeSong ? keyboardStart + offset : 48 + offset)
      if (note !== undefined) { event.preventDefault(); pressNote(note, 88) }
    }
    const onKeyUp = (event: KeyboardEvent) => { const offset = computerKeyOffsets[event.key.toLowerCase()]; const note = offset === undefined ? undefined : (activeSong ? keyboardStart + offset : 48 + offset); if (note !== undefined) releaseNote(note) }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp) }
  })

  useEffect(() => {
    if (!isTransportPlaying) return
    let currentBeat = 0
    const tick = () => { void audio.start().then(() => audio.triggerClick(currentBeat % 4 === 0)); setBeat(currentBeat % 4); currentBeat += 1 }
    tick()
    const interval = window.setInterval(tick, 60000 / bpm)
    return () => window.clearInterval(interval)
  }, [audio, bpm, isTransportPlaying])

  useEffect(() => {
    if (!isRecording) return
    const interval = window.setInterval(() => setRecordingSeconds(Math.floor((Date.now() - recordingStartedAtRef.current) / 1000)), 250)
    return () => window.clearInterval(interval)
  }, [isRecording])

  useEffect(() => {
    if (!activeSong || (gameState !== 'playing' && !(gameState === 'stopped' && gamePosition >= activeSong.duration - 0.02))) return
    const track = activeSong.tracks.find((candidate) => candidate.id === targetTrackId)
    if (!track) return
    const missed = playableNotes(track, keyboardStart).filter((note) => note.startTime < gamePosition - 0.15 && !judgedIdsRef.current.has(note.id))
    if (!missed.length) return
    missed.forEach((note) => judgedIdsRef.current.add(note.id))
    const stats = scoreStatsRef.current
    stats.attempts += missed.length
    stats.combo = 0
    setGameCombo(0)
    setGameAccuracy(accuracyFor(stats.hits, stats.attempts))
    setLastJudgment('Fallo')
  }, [activeSong, gamePosition, gameState, keyboardStart, targetTrackId])

  useEffect(() => () => { if (recordingUrl) URL.revokeObjectURL(recordingUrl) }, [recordingUrl])

  const instrumentText = (instrument: InstrumentDefinition) => language === 'es' ? { name: instrument.nameEs, category: instrument.categoryEs, mood: instrument.moodEs } : { name: instrument.name, category: instrument.category, mood: instrument.mood }
  const persistSongPreferences = (song: ImportedSong, preferences: StoredSong['preferences']) => {
    const existing = songLibrary.find((record) => record.song.id === song.id)
    void songStorage.save({ song, preferences: { ...existing?.preferences, ...preferences } }).then(() => songStorage.list().then(setSongLibrary))
  }
  const openSong = (song: ImportedSong, preferences?: StoredSong['preferences']) => {
    const target = song.tracks.find((track) => track.id === preferences?.targetTrackId) ?? pickTargetTrack(song)
    if (!target) { setTip(ui.songEmpty); return }
    const nextView = preferences?.view ?? 'falling'
    const nextSpeed = preferences?.speed ?? 1
    resetGameScore()
    setActiveSong(song)
    setTargetTrackId(target.id)
    setGameView(nextView)
    setGameSpeed(nextSpeed)
    setKeyboardStart(chooseKeyboardStart(target))
    transport.load(song, target.id)
    transport.setSpeed(nextSpeed)
    setShowSongLibrary(false)
    persistSongPreferences(song, { targetTrackId: target.id, view: nextView, speed: nextSpeed })
    setTip(ui.songLoaded)
  }
  const importSong = async (file: File) => {
    if (!/\.midi?$/i.test(file.name)) { setTip(ui.midiOnly); return }
    setIsImportingSong(true)
    try {
      const song = await parseMidiFile(file)
      if (!song.tracks.length) throw new Error('empty')
      await songStorage.save({ song, preferences: { targetTrackId: pickTargetTrack(song)?.id, view: 'falling', speed: 1 } })
      setSongLibrary(await songStorage.list())
      openSong(song)
    } catch {
      setTip(ui.songError)
    } finally {
      setIsImportingSong(false)
    }
  }
  const deleteSong = async (song: ImportedSong) => {
    if (activeSong?.id === song.id) {
      transport.stop()
      setActiveSong(null)
      setTargetTrackId('')
      resetGameScore()
    }
    await songStorage.remove(song.id)
    setSongLibrary(await songStorage.list())
  }
  const changeTargetTrack = (trackId: string) => {
    if (!activeSong) return
    const track = activeSong.tracks.find((candidate) => candidate.id === trackId)
    if (!track) return
    resetGameScore()
    setTargetTrackId(trackId)
    setKeyboardStart(chooseKeyboardStart(track))
    transport.setTargetTrack(trackId)
    persistSongPreferences(activeSong, { targetTrackId: trackId })
  }
  const closeSong = () => {
    transport.stop()
    setActiveSong(null)
    setTargetTrackId('')
    resetGameScore()
  }
  const toggleSongTransport = () => {
    if (gameState === 'playing') transport.pause()
    else void transport.play()
  }
  const restartSong = () => {
    resetGameScore()
    transport.restart()
  }
  const changeSongView = (view: GameView) => {
    setGameView(view)
    if (activeSong) persistSongPreferences(activeSong, { view })
  }
  const changeSongSpeed = (speed: number) => {
    setGameSpeed(speed)
    transport.setSpeed(speed)
    if (activeSong) persistSongPreferences(activeSong, { speed })
  }
  const pressNote = (note: number, velocity = 96, source: 'midi' | 'virtual' = 'virtual') => {
    void audio.start().then(() => { audio.noteOn(note, velocity); setIsAudioReady(true) })
    if (source === 'virtual') handleGameInput({ note, velocity, channel: 1, receivedAt: performance.now(), source })
    setActiveNotes((previous) => new Set(previous).add(note))
    setTip(`${midiNoteName(note)} · ${language === 'es' ? 'teclado del ordenador' : 'computer keyboard'}`)
  }
  const releaseNote = (note: number) => { audio.noteOff(note); setActiveNotes((previous) => { const next = new Set(previous); next.delete(note); return next }) }
  const updateBpm = (next: number) => { const value = Math.max(40, Math.min(220, next)); setBpm(value); storeBpm(value) }
  const inspire = () => { const next = instruments[Math.floor(Math.random() * instruments.length)]; setSelectedInstrument(next); updateBpm([72, 84, 92, 108][Math.floor(Math.random() * 4)]); setTip(`${instrumentText(next).name} · ${language === 'es' ? 'una invitación a tocar' : 'a small invitation to play'}`) }

  const startRecording = async () => {
    if (isRecording) { recorderRef.current?.stop(); return }
    await audio.start()
    const stream = audio.getRecordingStream()
    if (!stream || !('MediaRecorder' in window)) { setTip(language === 'es' ? 'Este navegador no permite grabar audio' : 'This browser cannot record audio'); return }
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? ''
    const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    chunksRef.current = []
    recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
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

  const statusLabel = midiState === 'connected' ? `MiniLab 3 ${language === 'es' ? 'conectado' : 'connected'}` : midiState === 'unsupported' ? ui.unsupported : midiState === 'waiting' ? ui.waiting : ui.looking
  const statusDetail = activeDevice?.name || (midiState === 'unsupported' ? ui.tryChrome : midiState === 'waiting' ? ui.plugIn : ui.tryChrome)
  const activeTargetTrack = activeSong?.tracks.find((track) => track.id === targetTrackId) ?? null
  const visibleKeyboardNotes = activeSong ? Array.from({ length: 25 }, (_, index) => keyboardStart + index) : keyboardNotes

  return <div className="app-shell">
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <header className="topbar">
      <div className="brand-lockup"><div className="brand-mark"><Waves size={18} strokeWidth={2.4} /></div><div><span className="eyebrow">{ui.eyebrow}</span><h1>MiniLab Playground</h1></div></div>
      <div className="top-actions"><div className={`connection-pill ${midiState}`}><span className="status-dot" /><span>{statusLabel}</span></div><button className="song-top-button" onClick={() => setShowSongLibrary(true)}><Music2 size={15} /> {ui.songs}</button><button className="language-toggle" aria-label={ui.language} title={ui.language} onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}><Languages size={15} /> {language === 'es' ? 'EN' : 'ES'}</button><button className="icon-button" aria-label="Settings" onClick={() => setShowSettings((value) => !value)}><Settings2 size={17} /></button><button className="icon-button" aria-label="Menu" onClick={() => setShowMonitor(true)}><Menu size={18} /></button></div>
    </header>

    <main className={`workspace ${activeSong ? 'game-active' : ''}`}>
      {activeSong && activeTargetTrack && <SongGame song={activeSong} targetTrack={activeTargetTrack} position={gamePosition} state={gameState} view={gameView} speed={gameSpeed} keyboardStart={keyboardStart} score={gameScore} combo={gameCombo} accuracy={gameAccuracy} judgment={lastJudgment} language={language} onViewChange={changeSongView} onPlayPause={toggleSongTransport} onRestart={restartSong} onClose={closeSong} onSpeedChange={changeSongSpeed} onTrackChange={changeTargetTrack} />}
      <section className="hero-row"><div><p className="section-kicker"><span className="live-dot" /> {ui.freePlay}</p><h2>{ui.heroTitle} <em>{ui.heroEmphasis}</em></h2><p className="hero-copy">{ui.heroCopy}</p></div><div className="tempo-card"><span className="tempo-label">{ui.tempo}</span><div className="tempo-value"><span>♩</span><strong>{bpm}</strong><small>{ui.bpm}</small></div><div className="tempo-controls"><button aria-label={ui.slower} onClick={() => updateBpm(bpm - 1)}>−</button><button aria-label={ui.faster} onClick={() => updateBpm(bpm + 1)}>+</button></div><button className={`transport-button ${isTransportPlaying ? 'active' : ''}`} aria-label={isTransportPlaying ? ui.pause : ui.start} onClick={() => setIsTransportPlaying((value) => !value)}>{isTransportPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}<span>{isTransportPlaying ? ui.pause : ui.start}</span></button><div className="beat-dots" aria-label={ui.metronome}>{[0, 1, 2, 3].map((item) => <span key={item} className={isTransportPlaying && beat === item ? 'current' : ''} />)}</div></div></section>

      <section className="instrument-section panel"><div className="panel-heading"><div><span className="section-kicker">{ui.chooseSound}</span><h3>{instrumentText(selectedInstrument).name} <span className="muted">/ {instrumentText(selectedInstrument).mood}</span></h3></div><div className="sound-actions"><button className="inspire-button" onClick={inspire}><Lightbulb size={14} /> {ui.inspire}</button><button className="text-button" onClick={() => setShowSettings(true)}>{ui.soundSettings} <ChevronDown size={15} /></button></div></div><div className="instrument-grid">{instruments.map((instrument) => <button className={`instrument-card ${selectedInstrument.id === instrument.id ? 'selected' : ''}`} key={instrument.id} onClick={() => setSelectedInstrument(instrument)} style={{ '--instrument-color': instrument.color } as CSSProperties}><span className="instrument-icon">{instrument.icon}</span><span className="instrument-name">{instrumentText(instrument).name}</span><span className="instrument-category">{instrumentText(instrument).category}</span></button>)}<button className="instrument-card add-card" onClick={() => setTip(language === 'es' ? 'Los packs importados llegarán después del motor de loops' : 'Imported packs arrive after the loop engine')}><span className="instrument-icon"><Plus size={20} /></span><span className="instrument-name">{language === 'es' ? 'Nuevo sonido' : 'New sound'}</span><span className="instrument-category">{language === 'es' ? 'pronto' : 'soon'}</span></button></div></section>

      <div className="midi-line panel"><div className="midi-line-info"><span className="status-dot connected" /><div><strong>{activeDevice?.name || ui.noController}</strong><small>{statusDetail}</small></div></div><div className="midi-line-actions"><button className="outline-button" onClick={connectMidi}><Power size={14} /> {midiState === 'connected' ? ui.rescan : ui.connectMidi}</button>{devices.length > 1 && <select className="device-select" aria-label={ui.selectController} value={activeDevice?.id ?? ''} onChange={(event) => { const selected = devices.find((device) => device.id === event.target.value); if (selected) { midi.selectInput(selected, callbacks); setActiveDevice(selected) } }}><option value="">{ui.selectController}</option>{devices.map((device) => <option key={device.id} value={device.id}>{device.name || device.id}</option>)}</select>}</div></div>

      <section className="keyboard-stage panel"><div className="panel-heading compact"><div className="controller-label"><KeyboardMusic size={17} /><span>{ui.minilab}</span></div><div className="keyboard-heading-actions"><span className="key-count">{ui.keys}</span><button className={`pad-menu-trigger ${showPadMenu ? 'active' : ''}`} onClick={() => setShowPadMenu((value) => !value)}><Grid2X2 size={14} /> {ui.pads}<ChevronDown size={13} /></button></div></div>{showPadMenu && <div className="pad-menu"><div className="pad-menu-header"><span>{ui.padBank}</span><div className="pad-bank-toggle"><button className={padBank === 'A' ? 'selected' : ''} onClick={() => setPadBank('A')}>A</button><button className={padBank === 'B' ? 'selected' : ''} onClick={() => setPadBank('B')}>B</button></div></div><div className="pad-menu-grid">{Array.from({ length: 8 }, (_, index) => index + 1).map((pad) => <button key={pad} className={`menu-pad ${activePads.has(pad) ? 'active' : ''}`} onPointerDown={() => setActivePads((previous) => new Set(previous).add(pad))} onPointerUp={() => setActivePads((previous) => { const next = new Set(previous); next.delete(pad); return next })} onPointerLeave={() => setActivePads((previous) => { const next = new Set(previous); next.delete(pad); return next })}>{pad}</button>)}</div></div>}<div className="sound-orbit"><span style={{ background: selectedInstrument.color }} /><span /><span /></div><div className="keyboard-wrap" aria-label={ui.keys}><div className="keyboard">{visibleKeyboardNotes.map((note) => { const isBlack = blackPitchClasses.has(note % 12); return <button key={note} style={isBlack ? { '--black-key-left': blackKeyLeft(note, visibleKeyboardNotes) } as CSSProperties : undefined} className={`key ${isBlack ? 'black-key' : 'white-key'} ${activeNotes.has(note) ? 'active' : ''}`} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); pressNote(note, 96) }} onPointerUp={() => releaseNote(note)} onPointerCancel={() => releaseNote(note)} onPointerLeave={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) releaseNote(note) }}>{!isBlack && note % 12 === 0 && <span>C{Math.floor(note / 12) - 1}</span>}</button> })}</div></div><div className="controller-footnote"><span><span className="key-dot" /> {tip}</span><span>{ui.computer}</span></div></section>

      <section className="actions-panel panel"><div className="action-row"><button className="loop-button" onClick={() => setTip(language === 'es' ? 'La grabación de loops MIDI será el siguiente motor' : 'MIDI loop recording is the next engine')}><span className="record-symbol" /><span><strong>{ui.loop}</strong><small>{ui.loopSub}</small></span></button><button className={`record-button ${isRecording ? 'recording' : ''}`} onClick={() => void startRecording()}>{isRecording ? <Square size={15} fill="currentColor" /> : <Circle size={15} fill="currentColor" />}<span>{isRecording ? `${ui.stopRecord} · ${formatDuration(recordingSeconds)}` : ui.record}</span></button></div>{recordingUrl && <div className="recording-result"><div className="recording-result-heading"><FileAudio size={16} /><span><strong>{ui.recordingReady}</strong><small>{recordingMime} · {formatDuration(recordingSeconds)}</small></span><a href={recordingUrl} download={`minilab-session-${Date.now()}.webm`}><Download size={15} /> {ui.download}</a></div><audio controls src={recordingUrl} /></div>}<div className="next-row"><span><span className="sparkle-mini">✦</span> {ui.loopsNext}</span><button className="monitor-link" onClick={() => setShowMonitor(true)}><Activity size={14} /> {ui.openMonitor} <span>{logs.length}</span></button></div></section>
    </main>

    <footer className="footer"><span><span className="footer-status" /> {isAudioReady ? ui.audioReady : ui.audioWaiting}</span><span>{ui.footer}</span></footer>

    {showSongLibrary && <div className="modal-backdrop" onClick={() => setShowSongLibrary(false)}><div className="song-library-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="section-kicker">{ui.songs}</span><h3>{ui.songLibrary}</h3></div><button className="icon-button" onClick={() => setShowSongLibrary(false)}><X size={17} /></button></div><input ref={fileInputRef} className="visually-hidden" type="file" accept=".mid,.midi,audio/midi" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importSong(file); event.currentTarget.value = '' }} /><button className="song-drop-zone" onClick={() => fileInputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void importSong(file) }}><Upload size={22} /><strong>{isImportingSong ? ui.loadingSong : ui.dropSong}</strong><small>{ui.midiOnly}</small></button><div className="song-library-list">{songLibrary.length ? songLibrary.map((record) => <div className="song-library-row" key={record.song.id}><div className="song-library-info"><Music2 size={16} /><div><strong>{record.song.name}</strong><small>{record.song.tracks.length} pistas · {formatDuration(record.song.duration)}</small></div></div><div className="song-library-actions"><button className="outline-button" onClick={() => openSong(record.song, record.preferences)}>{ui.openSong}</button><button className="icon-button danger" aria-label={ui.deleteSong} title={ui.deleteSong} onClick={() => void deleteSong(record.song)}><Trash2 size={15} /></button></div></div>) : <div className="song-library-empty"><Music2 size={22} /><span>{ui.noSongs}</span></div>}</div></div></div>}

    {showMonitor && <div className="modal-backdrop" onClick={() => setShowMonitor(false)}><div className="monitor-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="section-kicker">{ui.devTool}</span><h3>{ui.midiMonitor}</h3></div><button className="icon-button" onClick={() => setShowMonitor(false)}><X size={17} /></button></div><div className="monitor-caption"><span>{ui.liveMessages} {activeDevice?.name || (language === 'es' ? 'tu controlador' : 'your controller')}</span><span>{logs.length} {ui.events}</span></div><div className="event-list">{logs.length ? logs.map((event) => <div className="event-row" key={event.id}><span className={`event-type ${event.type === 'NOTE ON' ? 'note' : event.type === 'CC' ? 'cc' : ''}`}>{event.type}</span><strong>{event.label}</strong><span>{event.detail}</span><time>{event.time}</time></div>) : <div className="empty-events"><Activity size={24} /><span>{ui.emptyEvents}</span></div>}</div><div className="modal-footer"><span><span className="status-dot connected" /> {ui.listener}</span><button className="text-button" onClick={() => setLogs([])}><RotateCcw size={14} /> {ui.clear}</button></div></div></div>}
    {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><div className="settings-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="section-kicker">{ui.settings}</span><h3>{ui.keepSimple}</h3></div><button className="icon-button" onClick={() => setShowSettings(false)}><X size={17} /></button></div><div className="settings-list"><div><span>{ui.scale}</span><small>{ui.scaleSub}</small></div><div><span>{ui.output}</span><small>{ui.outputSub}</small></div><div><span>{ui.packs}</span><small>{ui.packsSub}</small></div></div><button className="outline-button full" onClick={() => { setShowSettings(false); setShowMonitor(true) }}><Activity size={15} /> {ui.openMidi}</button></div></div>}
  </div>
}

export default App
