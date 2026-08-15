# MiniLab Playground

Un playground musical local-first para conectar un Arturia MiniLab 3, elegir un sonido, tocar y practicar canciones MIDI con una interfaz minimalista.

## Estado actual

La aplicación ya incluye:

- detección, selección y monitor de dispositivos mediante Web MIDI API;
- Note On/Off, CC, pads, pitch bend y aftertouch;
- teclado visual de 25 teclas y entrada desde el teclado del ordenador;
- diez timbres sintetizados con Web Audio API;
- metrónomo audible con play/pausa y BPM persistente;
- grabación del master con reproducción y descarga en el formato disponible, normalmente WebM;
- interfaz Español/English;
- modo oscuro y claro persistente;
- superficie compacta del MiniLab 3 con menú de pads, encoders y faders;
- importación local de `.mid`/`.midi` por selector o arrastrar y soltar;
- biblioteca de canciones persistente en IndexedDB con fallback local;
- selección automática/manual de pista objetivo y acompañamiento sintetizado;
- modos Guitar Hero y Rocksmith diseñados para las 25 teclas del MiniLab 3, con puntuación, combo, precisión, pausa, reinicio y velocidad 50–150%;
- enlace de YouTube Music + chart MIDI local, reproductor oficial visible, sincronización y calibración de offset disponible en ambas vistas;
- adaptación automática al rango visual de 25 teclas.

La aplicación no tiene backend ni sube canciones. MP3/WAV, conversión automática de audio de YouTube a notas, loops editables y capas MIDI siguen fuera del alcance actual.

## Inicio rápido

```bash
npm install
npm run dev
```

Abrir `http://127.0.0.1:5173/`.

Para comprobar el proyecto:

```bash
npm test
npm run build
```

En Windows, el acceso recomendado es ejecutar `iniciar_minilab.vbs`. El launcher mantiene la consola oculta, verifica el servidor, consulta actualizaciones fast-forward desde `origin/main`, instala dependencias solo cuando cambian los manifests y abre el navegador después de recibir HTTP 200.

## Documentación para futuras modificaciones

- [`AGENTS.md`](AGENTS.md): reglas de trabajo y checklist mínimo para agentes y colaboradores.
- [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md): resumen operativo, mapa de archivos, persistencia y límites actuales.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): fronteras entre UI, MIDI, audio, canciones, scoring y launcher.
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md): instalación, pruebas, launcher, diagnóstico y guía de cambios frecuentes.
- [`docs/DECISIONS.md`](docs/DECISIONS.md): decisiones que deben conservarse o revisarse explícitamente.

## Estructura

```text
src/
  App.tsx                 orquestación de la interfaz y estado de sesión
  components/SongGame.tsx modo canción
  components/YouTubePlayer.tsx reproductor oficial y reloj del chart vinculado
  styles.css              layout, responsive y temas claro/oscuro
  types.ts                contratos compartidos
  lib/
    audioEngine.ts        Web Audio, voces, metrónomo, grabación y scheduling
    gameScoring.ts        rango de 25 teclas y puntuación
    midiEngine.ts         Web MIDI y parsing de mensajes
    minilabMapping.ts     mapping semántico inicial del MiniLab 3
    songParser.ts         normalización de archivos MIDI
    songStorage.ts        IndexedDB con fallback local
    songTransport.ts      transporte y acompañamiento
    youtube.ts            validación de enlaces y asociación YouTube + MIDI
    storage.ts            BPM persistente
    *.test.ts             pruebas unitarias
docs/
  PROJECT_CONTEXT.md      contexto rápido y fuente de orientación
  ARCHITECTURE.md         arquitectura técnica
  DEVELOPMENT.md         desarrollo y validación
  DECISIONS.md            registro de decisiones
```

## Compatibilidad y límites

Web MIDI necesita un navegador compatible, normalmente Chrome o Edge, y permisos para el dispositivo. El primer sonido requiere una interacción del usuario por las políticas de autoplay. Si Web MIDI no está disponible, el teclado virtual continúa funcionando.

YouTube Music se vincula pegando el enlace de una canción y seleccionando un MIDI que contiene las notas. El reproductor oficial permanece visible y guía el tiempo del chart. La aplicación no descarga, separa, almacena ni convierte el audio de YouTube; algunos videos pueden impedir la reproducción embebida.
