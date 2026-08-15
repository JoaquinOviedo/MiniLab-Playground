# MiniLab Playground

Un playground musical local-first para conectar un Arturia MiniLab 3, elegir un sonido y empezar a tocar en segundos.

## Estado actual

Esta primera entrega cubre el Milestone 1 y una base de audio mínima:

- detección y selección de dispositivos mediante Web MIDI API;
- reconexión automática y recuerdo del último dispositivo;
- monitor MIDI para Note On/Off, CC, pitch bend y aftertouch;
- teclado virtual que refleja las notas entrantes;
- soporte para tocar desde el teclado del ordenador;
- synth polifónico de baja complejidad con Web Audio API;
- cinco timbres iniciales y controles Tone, Reverb, Delay y Attack como superficie de UX;
- persistencia local del BPM.

La siguiente iteración agrega:

- diez timbres iniciales;
- interfaz Español/English con español como idioma inicial;
- metrónomo audible con play/pausa y BPM persistente;
- grabación del master de audio con reproducción y descarga WebM;
- representación visual de 25 teclas, 8 pads, 8 encoders y 4 faders del MiniLab 3;
- mapping de pads del MiniLab 3 como CC 102–109 y selección preferente del puerto `MiniLab 3 MIDI`.
- importación local de archivos MIDI desde selector o arrastrar y soltar;
- biblioteca persistente local con selección de pista objetivo y acompañamiento sintetizado;
- modo canción con vistas de notas descendentes y piano-roll, puntuación, velocidad, pausa y reinicio;
- adaptación automática de las notas al rango visible de 25 teclas.

La pantalla principal mantiene una superficie minimalista: el teclado es el centro, los instrumentos se recorren en una banda horizontal y el banco de pads se abre desde un menú compacto. Los encoders, faders y parámetros de mezcla no se muestran hasta que exista una interacción musical que los necesite.

El botón de Loop y las capas siguen reservados para el siguiente milestone. La grabación de sesión ya funciona sobre el audio que escucha el usuario, pero todavía no convierte las notas en loops MIDI editables. El modo canción trabaja con MIDI; el análisis automático de MP3/WAV queda para una fase posterior.

El botón `Iniciar` del tempo reproduce un pulso de metrónomo audible a la velocidad indicada; `Pausar` lo detiene. No inicia loops porque el motor de loops aún no está implementado.

## Desarrollo

```bash
npm install
npm run dev
```

Para compilar una versión de producción:

```bash
npm run build
npm test
```

En Windows, el acceso directo `MiniLab Playground` ejecuta `iniciar_minilab.vbs`, que lanza `iniciar_minilab.bat` sin mostrar una consola. El launcher consulta GitHub en cada inicio, descarga únicamente cambios fast-forward disponibles, instala dependencias solo cuando cambian los manifests y abre la aplicación en `http://127.0.0.1:5173/`.

Web MIDI requiere un navegador compatible y normalmente un contexto seguro (`https` o `localhost`). El primer sonido necesita una interacción del usuario para que el navegador habilite el contexto de audio.

## Estructura

```text
src/
  App.tsx                 pantalla principal y orquestación de interacción
  components/SongGame.tsx superficie visual del modo canción
  styles.css              lenguaje visual del playground
  types.ts                contratos compartidos
  lib/
    audioEngine.ts        voces Web Audio, polifonía y parámetros
    gameScoring.ts        adaptación de rango y puntuación
    midiEngine.ts         conexión, parsing y ciclo de vida MIDI
    minilabMapping.ts     mapping semántico inicial del MiniLab 3
    songParser.ts         normalización de archivos MIDI
    songStorage.ts        biblioteca IndexedDB con fallback local
    songTransport.ts      reloj y acompañamiento programado
    storage.ts            persistencia local pequeña
docs/
  ARCHITECTURE.md         decisiones, riesgos y plan de milestones
```
