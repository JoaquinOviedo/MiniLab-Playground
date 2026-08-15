# Contexto persistente del proyecto

## Identidad

- Proyecto: `MiniLab Playground`
- Repositorio: `JoaquinOviedo/MiniLab-Playground`
- Stack: React 18 + TypeScript + Vite + Web Audio API + Web MIDI API
- Runtime mínimo declarado: Node `>=18.18.0`
- Puerto local: `5173`
- Baseline documentado: temas claro/oscuro + modos Guitar Hero/Rocksmith YouTube/MIDI
- Rama observada al documentar: `agent/song-mode-midi`
- Última auditoría: 2026-08-15

Este documento resume el estado real que debe asumir una futura modificación. Si contradice al código, primero se verifica el código y luego se actualiza este documento.

## Producto actual

### Modo libre

- Diez timbres sintetizados mediante osciladores Web Audio.
- Teclado visual de 25 teclas, centrado en la pantalla.
- Teclado del ordenador como entrada alternativa.
- Metrónomo audible con BPM persistente entre 40 y 220; valor inicial 92.
- Grabación del master mediante `MediaRecorder`, reproducción local y descarga en el formato real ofrecido por el navegador, normalmente WebM.
- Menú compacto para banco de 8 pads; encoders y faders se muestran como superficie de hardware, sin convertir la pantalla en una consola completa.

### MiniLab 3 y MIDI

- `MidiEngine` solicita acceso Web MIDI, observa conexión/desconexión y selecciona preferentemente el último dispositivo o uno cuyo nombre contenga MiniLab/Arturia.
- La pantalla muestra estado, dispositivo seleccionado y monitor de Note On/Off, CC, pitch bend y aftertouch.
- El mapping semántico está en `src/lib/minilabMapping.ts`.
- Pads: CC `102–109`.
- Encoders aceptados: `74, 71, 76, 77, 93, 18, 19, 16`.
- Faders observados: `82, 83, 85, 17`.
- El mapping real depende del puerto, preset y firmware; el monitor es la fuente de verdad para ajustar el hardware.

### Modo canción

- Importa `.mid` y `.midi` mediante selector o arrastrar y soltar.
- `@tonejs/midi` normaliza tempos, pistas, instrumentos y notas a los tipos de `src/types.ts`.
- `songStorage` guarda canciones y preferencias en IndexedDB; usa `localStorage` como fallback.
- Se selecciona automáticamente una pista melódica probable, con selección manual disponible.
- La pista objetivo no se programa como acompañamiento; las demás pistas se sintetizan con los timbres aproximados disponibles.
- Vistas: Guitar Hero con notas descendentes (`falling`) y Rocksmith con piano-roll horizontal (`piano-roll`). Ambas representan las 25 teclas del MiniLab 3, no cuerdas ni trastes.
- Transporte: reproducir, pausar, reiniciar y velocidad entre `0.5` y `1.5`.
- `SongTransport` comparte el `AudioContext` con `AudioEngine`, programa notas con look-ahead y actualiza la UI cada 25 ms.
- El rango jugable es de 25 teclas; `gameScoring.ts` conserva la nota MIDI original y la transporta por octavas para la vista y la entrada.
- La ventana de juicio es de aproximadamente `±150 ms`; la puntuación combina 70% sincronización y 30% velocidad MIDI. El teclado virtual no penaliza velocidad.

### Guitar Hero y Rocksmith para MiniLab 3

- La biblioteca permite pegar un enlace de YouTube Music/YouTube y vincularlo con un `.mid`/`.midi` local.
- `src/lib/youtube.ts` valida el video ID y agrega `youtube { videoId, url, offset }` al `ImportedSong`; el registro persiste en la misma biblioteca IndexedDB.
- `src/components/YouTubePlayer.tsx` monta el IFrame Player oficial y visible. Sus estados play/pause/ended y `getCurrentTime()` controlan la posición del chart.
- Para una canción vinculada no se programa acompañamiento sintetizado: YouTube aporta el audio y el MIDI aporta exclusivamente las notas objetivo.
- El usuario puede calibrar el segundo del video donde empieza el MIDI con pasos de 0,1 s. El offset se guarda en la canción.
- La vista Guitar Hero hace descender las notas hacia 25 carriles alineados con el teclado. La vista Rocksmith desplaza las notas horizontalmente hacia una línea de acierto.
- En canciones vinculadas la vista inicial es Rocksmith, pero se puede alternar a Guitar Hero sin perder la posición. Las dos adaptan las notas al mismo rango de 25 teclas del MiniLab 3.
- La velocidad usa pasos compatibles habituales de 50%, 75%, 100%, 125% y 150%.
- La grabación del master no incluye el audio de YouTube porque este permanece dentro del reproductor oficial.

### Temas e idioma

- Español es el idioma inicial; el selector Español/English persiste `minilab-language`.
- Oscuro es el tema inicial; el botón Sol/Luna persiste `minilab-theme`.
- El tema se aplica en `document.documentElement.dataset.theme` y también en `.app-shell[data-theme]`.
- `index.html` aplica el tema guardado antes de montar React para evitar un parpadeo visual.
- Los estilos claros están al final de `src/styles.css` para ganar especificidad sobre la base oscura.

## Mapa de archivos

| Ruta | Responsabilidad | Cambiar aquí cuando… |
| --- | --- | --- |
| `src/App.tsx` | Orquestación de UI, estado, idioma, tema, grabación, MIDI y sesión canción | se cambia un flujo visible o una coordinación entre motores |
| `src/components/SongGame.tsx` | Barra y tablero del modo canción | se cambia la interacción visual de juego |
| `src/components/YouTubePlayer.tsx` | Reproductor visible, reloj, velocidad y offset de YouTube | se cambia la sincronización YouTube/MIDI |
| `src/types.ts` | Contratos de instrumentos, MIDI, canciones y sesión | se agrega o modifica un dato compartido |
| `src/styles.css` | Sistema visual, responsive, teclado, modales y temas | se cambia layout, legibilidad o apariencia |
| `src/lib/audioEngine.ts` | AudioContext, voces, metrónomo, grabación y notas programadas | se cambia síntesis o scheduling de audio |
| `src/lib/midiEngine.ts` | Solicitud Web MIDI, parsing de mensajes y selección de dispositivo | se cambia entrada MIDI o ciclo de conexión |
| `src/lib/minilabMapping.ts` | CC y nombres semánticos del MiniLab | se confirma un mapping diferente en el hardware |
| `src/lib/songParser.ts` | Conversión de MIDI a `ImportedSong` | se cambia importación, selección automática o metadatos |
| `src/lib/songStorage.ts` | Persistencia de biblioteca y preferencias | se cambia IndexedDB, fallback o migración |
| `src/lib/songTransport.ts` | Reloj de canción, acompañamiento y velocidad | se cambia play/pause/scheduling |
| `src/lib/youtube.ts` | Validación de URLs y asociación del chart MIDI con un video | se cambia la fuente YouTube |
| `src/lib/gameScoring.ts` | Rango de 25 teclas, juicio y precisión | se cambia adaptación o puntuación |
| `src/lib/storage.ts` | BPM persistente | se cambia una preferencia pequeña |
| `src/lib/*.test.ts` | Pruebas unitarias de parser y puntuación | se cambia una regla determinista |
| `index.html` | entrada Vite y tema inicial | se cambia metadata o bootstrap antes de React |
| `iniciar_minilab.bat` | actualización, dependencias, servidor y health check | se cambia el flujo de arranque Windows |
| `iniciar_minilab.vbs` | ejecución invisible del `.bat` | se cambia la visibilidad o el acceso directo |
| `docs/ARCHITECTURE.md` | decisiones técnicas y evolución de motores | se cambia la arquitectura |
| `docs/DEVELOPMENT.md` | comandos y checklist de validación | se cambia la forma de desarrollar o probar |
| `docs/DECISIONS.md` | decisiones con consecuencias duraderas | se elige una solución que futuros cambios deben respetar |

## Persistencia conocida

| Dato | Almacenamiento | Clave/base |
| --- | --- | --- |
| Idioma | `localStorage` | `minilab-language` |
| Tema | `localStorage` | `minilab-theme` |
| BPM | `localStorage` | `minilab-bpm` |
| Último dispositivo MIDI | `localStorage` | `minilab-last-device` |
| Biblioteca de canciones | IndexedDB | base `minilab-playground`, store `songs` |
| Fallback de canciones | `localStorage` | `minilab-song-library` |

## Límites actuales

- No hay backend, autenticación ni sincronización en la nube.
- MP3/WAV no se convierten a notas; el modo canción trabaja con MIDI.
- No existe todavía un loop engine editable: el botón Loop y las capas siguen siendo un siguiente milestone.
- La conexión y el mapping del MiniLab físico no se validaron en cada navegador/preset; Web MIDI no estuvo disponible en el navegador de validación.
- YouTube Music requiere pegar un enlace y aportar un MIDI local. No existe búsqueda interna ni conversión automática del audio; algunos videos no permiten reproducción embebida.
- El proyecto no tiene variables de entorno requeridas actualmente.

## Próxima lectura según la tarea

- UI, tema, idioma o responsive: `src/App.tsx` + `src/styles.css` + sección de temas de este archivo.
- MIDI/MiniLab: `src/lib/midiEngine.ts` + `src/lib/minilabMapping.ts` + `docs/ARCHITECTURE.md`.
- Canciones: `src/types.ts`, `songParser.ts`, `songStorage.ts`, `songTransport.ts`, `gameScoring.ts` y `SongGame.tsx`; si usa YouTube, también `youtube.ts` y `YouTubePlayer.tsx`.
- Launcher: `iniciar_minilab.bat`, `iniciar_minilab.vbs` y la sección correspondiente de `docs/DEVELOPMENT.md`.
