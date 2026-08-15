# MiniLab Playground — arquitectura inicial

## Dirección del producto

La aplicación se trata como un instrumento digital y no como una estación de trabajo. La pantalla principal concentra el gesto importante: conectar, elegir una textura, tocar y ver una respuesta inmediata. La complejidad técnica vive detrás de una pequeña cantidad de controles con intención musical.

## Decisiones técnicas

### React + TypeScript + Vite

React organiza la superficie visual y las interacciones de producto; TypeScript mantiene explícitos los contratos entre los motores. Vite mantiene el arranque local rápido y no introduce backend ni una capa de despliegue innecesaria.

Las versiones están fijadas en una línea compatible con Node 18.18+, que es el runtime disponible en el entorno de desarrollo actual.

### Web MIDI API

`MidiEngine` es el único lugar que conoce los bytes de MIDI. Expone eventos semánticos hacia la UI y el futuro loop engine:

```ts
onNoteOn(note, velocity, channel)
onNoteOff(note, channel)
onPad(pad, pressed)
onKnob(cc, value)
onLog(event)
onDevices(inputs)
```

El engine recuerda el último `input.id`, prefiere un dispositivo cuyo nombre contenga `MiniLab` o `Arturia` y observa cambios de conexión. Si hay más de un dispositivo, la pantalla permite seleccionarlo.

El mapping inicial está aislado en `MiniLabMapping`. El MVP no presupone que todos los MiniLab estén configurados igual: los números de CC son defaults de diagnóstico y deben confirmarse con el monitor al probar el hardware real.

### Web Audio API

`AudioEngine` mantiene el contexto de audio y las voces fuera del estado de React. Cada nota crea una voz con oscilador, filtro low-pass y envolvente de ganancia. La UI solo envía comandos (`noteOn`, `noteOff`, parámetros); no funciona como reloj musical.

Esto permite evolucionar después hacia:

- un scheduler basado en `AudioContext.currentTime`;
- buses internos de reverb y delay;
- instrumentos sample-based;
- grabación del master mediante `MediaStreamAudioDestinationNode`.

El MVP usa cinco formas de onda agradables y una arquitectura deliberadamente pequeña. No intenta reemplazar un sampler ni un sintetizador completo.

### Modelo de datos

El contrato que debe conservarse para cualquier loop es:

```ts
type NoteEvent = {
  note: number
  velocity: number
  startTime: number
  duration: number
  channel: number
}
```

Cuando llegue el loop engine, los tiempos se guardarán en beats relativos al inicio del loop, no como timestamps de React. Una sesión futura puede representarse así:

```ts
type Session = {
  id: string
  name: string
  bpm: number
  createdAt: number
  layers: Layer[]
}

type Layer = {
  id: string
  instrumentId: string
  muted: boolean
  lengthInBeats: number
  notes: NoteEvent[]
}
```

Las sesiones pequeñas pueden vivir en `localStorage`. Los packs de samples, renders WAV y audio grabado deben ir a IndexedDB porque no conviene serializarlos en la configuración.

## Cómo se implementará el looping

El loop engine será independiente de React y tendrá un `Transport` propio:

1. El primer click de Loop arma la captura y fija el tiempo de inicio del transporte.
2. El modo Auto espera una duración musical razonable; 1, 2, 4 y 8 compases son límites explícitos.
3. Los eventos entrantes se convierten de `AudioContext.currentTime` a beats.
4. Una pequeña cuantización se aplica al inicio y al final, con una opción Auto conservadora para no borrar la intención humana.
5. Al cerrar el compás, se congela la capa y el scheduler la reproduce repetidamente con look-ahead.
6. La siguiente capa se graba contra el mismo transporte, nunca contra un contador de renders.

El primer diseño de UX seguirá siendo una tarjeta por capa con mute, borrar y undo. No se agregará piano roll en esta etapa.

## Sesión y exportación

La grabación de sesión se hará conectando el master de audio a un `MediaStreamAudioDestinationNode` y grabando con `MediaRecorder`. El formato preferido será WAV si se incorpora un encoder pequeño y fiable; si el navegador solo ofrece un contenedor comprimido de forma consistente, se mostrará el formato real antes de descargar.

La exportación offline de loops MIDI puede usar un `OfflineAudioContext` en una etapa posterior para renderizar sin depender del tiempo de la pantalla.

## Riesgos técnicos

| Riesgo | Impacto | Respuesta |
| --- | --- | --- |
| Web MIDI no está disponible en todos los navegadores | El controlador no se puede detectar | Mostrar estado claro y recomendar Chrome/Edge; el teclado virtual sigue funcionando |
| Los mappings del MiniLab pueden variar por preset/firmware | Knobs o pads pueden llegar con otro CC/nota | Mantener un monitor visible y una capa de mapping configurable |
| Autoplay policy bloquea AudioContext | El primer toque no suena | Arrancar audio en la primera interacción y exponer el estado `audio ready` |
| Scheduling en timers de UI produce jitter | Loops irregulares | Mantener el reloj en Web Audio y usar look-ahead, nunca `setInterval` como reloj musical |
| Reverb/delay mal aislados generan feedback o latencia | Sonido incómodo o inestable | Buses internos con límites y valores seguros antes de exponer controles |
| Los samples grandes no caben bien en localStorage | Sesiones/importaciones frágiles | IndexedDB para audio, localStorage solo para preferencias y metadatos |
| Exportar MP3 en navegador agrega codecs y costes | Resultado inconsistente | Priorizar WAV/PCM y postergar MP3 hasta validar compatibilidad |

## Próximos milestones

### Milestone 2 — instrumento que responde

Pulir el AudioEngine con velocity, polyphony, envolventes consistentes y selección inmediata de timbres.

### Milestone 3 — hardware como interfaz

Confirmar mapping real del MiniLab 3 con mensajes del monitor, conectar knobs a parámetros, y hacer que los pads tengan un modo diagnóstico y uno de drums.

### Milestone 4 — loop musical

Construir Transport, captura MIDI, cuantización conservadora, reproducción sincronizada y BPM/tap tempo.

### Milestone 5 — capas

Capas como tarjetas, mute, delete, undo e instrumentos independientes, sin mixer profesional.

### Milestone 6+ — grabación, persistencia e inspiración

Render de sesión, export, sesiones locales, Inspire Me, escalas y presets. Play Mode y análisis de audio quedan fuera hasta que Free Play sea estable.
