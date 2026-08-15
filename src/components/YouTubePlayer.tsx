import { ExternalLink, Minus, Plus, Youtube } from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

interface YouTubePlayerApi {
  cueVideoById(options: { videoId: string; startSeconds?: number }): void
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  setPlaybackRate(rate: number): void
  getCurrentTime(): number
  getPlayerState(): number
  destroy(): void
}

interface YouTubeNamespace {
  Player: new (element: HTMLElement, options: {
    videoId: string
    playerVars: Record<string, string | number>
    events: {
      onReady: (event: { target: YouTubePlayerApi }) => void
      onStateChange: (event: { data: number }) => void
      onError: (event: { data: number }) => void
    }
  }) => YouTubePlayerApi
}

declare global {
  interface Window {
    YT?: YouTubeNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let youtubeApiPromise: Promise<YouTubeNamespace> | null = null

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (youtubeApiPromise) return youtubeApiPromise

  youtubeApiPromise = new Promise<YouTubeNamespace>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.()
      if (window.YT?.Player) resolve(window.YT)
      else reject(new Error('YouTube IFrame API unavailable'))
    }

    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]')
    if (existing) return
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.onerror = () => reject(new Error('YouTube IFrame API failed to load'))
    document.head.appendChild(script)
  })

  return youtubeApiPromise
}

export interface YouTubePlayerHandle {
  play(): void
  pause(): void
  restart(): void
  setSpeed(speed: number): void
}

interface YouTubePlayerProps {
  videoId: string
  url: string
  offset: number
  duration: number
  speed: number
  language: 'es' | 'en'
  onTime: (position: number) => void
  onStateChange: (state: 'stopped' | 'playing' | 'paused') => void
  onOffsetChange: (offset: number) => void
}

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(function YouTubePlayer({
  videoId,
  url,
  offset,
  duration,
  speed,
  language,
  onTime,
  onStateChange,
  onOffsetChange,
}, ref) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<YouTubePlayerApi | null>(null)
  const stateRef = useRef(-1)
  const chartEndedRef = useRef(false)
  const configRef = useRef({ offset, duration, speed, onTime, onStateChange })
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorCode, setErrorCode] = useState<number | null>(null)
  configRef.current = { offset, duration, speed, onTime, onStateChange }

  useEffect(() => {
    let cancelled = false
    let timer: number | null = null
    setStatus('loading')
    setErrorCode(null)

    void loadYouTubeApi().then((youtube) => {
      if (cancelled || !hostRef.current) return
      const player = new youtube.Player(hostRef.current, {
        videoId,
        playerVars: {
          controls: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            if (cancelled) return
            playerRef.current = event.target
            event.target.cueVideoById({ videoId, startSeconds: Math.max(0, configRef.current.offset) })
            event.target.setPlaybackRate(configRef.current.speed)
            setStatus('ready')
          },
          onStateChange: (event) => {
            stateRef.current = event.data
            if (event.data === 1) {
              chartEndedRef.current = false
              configRef.current.onStateChange('playing')
            } else if (event.data === 2) {
              configRef.current.onStateChange(chartEndedRef.current ? 'stopped' : 'paused')
              chartEndedRef.current = false
            } else if (event.data === 0) {
              configRef.current.onStateChange('stopped')
            }
          },
          onError: (event) => {
            setStatus('error')
            setErrorCode(event.data)
            configRef.current.onStateChange('stopped')
          },
        },
      })
      playerRef.current = player
      timer = window.setInterval(() => {
        const currentPlayer = playerRef.current
        if (!currentPlayer) return
        const current = currentPlayer.getCurrentTime()
        const chartPosition = Math.max(0, Math.min(configRef.current.duration, current - configRef.current.offset))
        configRef.current.onTime(chartPosition)
        if (stateRef.current === 1 && chartPosition >= configRef.current.duration - 0.01) {
          chartEndedRef.current = true
          currentPlayer.pauseVideo()
          configRef.current.onStateChange('stopped')
        }
      }, 50)
    }).catch(() => {
      if (!cancelled) setStatus('error')
    })

    return () => {
      cancelled = true
      if (timer !== null) window.clearInterval(timer)
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [videoId])

  useEffect(() => {
    playerRef.current?.setPlaybackRate(speed)
  }, [speed])

  useImperativeHandle(ref, () => ({
    play() {
      const player = playerRef.current
      if (!player) return
      const current = player.getCurrentTime()
      const chartPosition = current - offset
      if (current < offset - 0.05 || chartPosition >= duration - 0.05) player.seekTo(Math.max(0, offset), true)
      player.setPlaybackRate(speed)
      chartEndedRef.current = false
      player.playVideo()
    },
    pause() {
      chartEndedRef.current = false
      playerRef.current?.pauseVideo()
    },
    restart() {
      const player = playerRef.current
      if (!player) return
      chartEndedRef.current = false
      player.seekTo(Math.max(0, offset), true)
      player.setPlaybackRate(speed)
      player.playVideo()
    },
    setSpeed(nextSpeed: number) {
      playerRef.current?.setPlaybackRate(nextSpeed)
    },
  }), [duration, offset, speed])

  const copy = language === 'es' ? {
    title: 'YOUTUBE MUSIC',
    visible: 'reproductor oficial visible',
    loading: 'Conectando con YouTube…',
    ready: 'Video listo · el MIDI guía las notas',
    error: 'Este video no se puede reproducir aquí',
    offset: 'Inicio del MIDI',
    seconds: 'segundos del video',
    open: 'Abrir en YouTube Music',
  } : {
    title: 'YOUTUBE MUSIC',
    visible: 'visible official player',
    loading: 'Connecting to YouTube…',
    ready: 'Video ready · MIDI drives the notes',
    error: 'This video cannot be played here',
    offset: 'MIDI start',
    seconds: 'video seconds',
    open: 'Open in YouTube Music',
  }

  const changeOffset = (next: number) => onOffsetChange(Math.max(0, Math.min(600, Math.round(next * 10) / 10)))

  return <section className="youtube-player-card panel">
    <div className="youtube-player-heading"><div><span className="section-kicker"><Youtube size={14} /> {copy.title}</span><strong>{copy.visible}</strong></div><a href={url} target="_blank" rel="noreferrer" title={copy.open} aria-label={copy.open}><ExternalLink size={15} /></a></div>
    <div className="youtube-player-frame" ref={hostRef} />
    <div className={`youtube-player-status ${status}`}><span className="status-dot" /> {status === 'loading' ? copy.loading : status === 'ready' ? copy.ready : `${copy.error}${errorCode ? ` · ${errorCode}` : ''}`}</div>
    <div className="youtube-sync-control"><div><strong>{copy.offset}</strong><small>{copy.seconds}</small></div><button aria-label="-0.1" onClick={() => changeOffset(offset - 0.1)}><Minus size={13} /></button><input aria-label={copy.offset} type="number" min="0" max="600" step="0.1" value={offset.toFixed(1)} onChange={(event) => changeOffset(Number(event.target.value))} /><button aria-label="+0.1" onClick={() => changeOffset(offset + 0.1)}><Plus size={13} /></button></div>
  </section>
})
