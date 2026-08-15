# Desarrollo y validación

## Requisitos

- Windows para usar los lanzadores `.bat`/`.vbs`.
- Node `>=18.18.0` y npm.
- Navegador Chromium compatible con Web MIDI para probar el MiniLab; el teclado virtual y el resto de la app funcionan sin Web MIDI.

## Instalación y desarrollo

```bash
npm install
npm run dev
```

La aplicación queda en `http://127.0.0.1:5173/`. Vite usa `.vite-cache/`, que está ignorado por Git.

Producción local:

```bash
npm run build
npm run preview
```

## Pruebas

```bash
npm test
npm run build
```

Las pruebas actuales cubren:

- selección/adaptación del rango de 25 teclas;
- puntuación de nota, sincronización y velocidad;
- excepción de velocidad para el teclado virtual;
- normalización de pistas, tempos y notas MIDI;
- selección automática de la pista objetivo.

## Lanzador Windows

El flujo recomendado para el usuario es doble clic en `iniciar_minilab.vbs`:

1. El VBS ejecuta el BAT con ventana oculta.
2. El BAT usa `%~dp0` como raíz del proyecto.
3. Consulta `origin/main` y solo ejecuta `git pull --ff-only` cuando la copia local está atrasada y no tiene commits propios.
4. Ejecuta `npm ci` solo si faltan dependencias o cambió `package.json`/`package-lock.json`.
5. No arranca una segunda instancia si el puerto `5173` ya está escuchando.
6. Espera una respuesta HTTP 200 de `/` y recién entonces abre el navegador.
7. Escribe diagnóstico en `logs/launcher.log` y salida del servidor en `logs/server.log`.

El BAT está fijado a la rama `main`. Si se prueba otra rama de desarrollo, actualizarla manualmente o cambiar esa decisión de forma explícita; no asumir que el launcher debe seguir cualquier rama local.

## Checklist manual por área

### Interfaz

- Cargar la página en oscuro y cambiar a claro.
- Recargar y confirmar que el tema persiste.
- Cambiar idioma y confirmar textos en ambos idiomas.
- Revisar ancho móvil y que el teclado siga siendo el elemento central.
- Abrir menú de pads, ajustes, monitor y biblioteca de canciones.

### Audio y MIDI

- Pulsar una tecla virtual y comprobar que el audio se habilita tras interacción.
- Iniciar y pausar el metrónomo; comprobar cambio de BPM.
- Conectar MiniLab 3 en Chrome/Edge y comprobar el dispositivo preferido.
- Confirmar Note On/Off, CC, pads, pitch bend y aftertouch en el monitor.
- Grabar una sesión, reproducirla y descargar el formato indicado.

### Modo canción

- Importar un MIDI con varias pistas.
- Confirmar biblioteca después de recargar.
- Cambiar pista objetivo y comprobar acompañamiento.
- Probar Guitar Hero con notas descendentes y Rocksmith con piano-roll; ambos deben corresponder a las 25 teclas, sin elementos de guitarra.
- Probar reproducir, pausar, reiniciar y velocidad 50–150%.
- Comprobar puntuación con teclado virtual y, si está disponible, MiniLab.
- Pegar un enlace de YouTube Music, vincular un MIDI y confirmar que abre en Rocksmith y puede alternar a Guitar Hero sin reiniciar.
- Comprobar reproductor visible, play/pausa/reinicio, velocidad y offset de 0,1 s.
- Recargar y confirmar que el enlace, offset y preferencias permanecen en la biblioteca.
- Recordar que la grabación del master no incluye el audio del IFrame de YouTube.

## Diagnóstico rápido

- Puerto ocupado: comprobar el proceso que escucha `5173`; no matar procesos de forma amplia.
- Launcher sin navegador: revisar `logs/launcher.log` y `logs/server.log`; debe existir respuesta 200 en `/`.
- MIDI no disponible: verificar navegador, permisos, contexto `localhost` y puerto seleccionado.
- Preferencias corruptas: eliminar solo la clave concreta de `localStorage`. Para borrar la biblioteca completa, usar la herramienta de almacenamiento del navegador y recordar que elimina canciones importadas.
- MIDI sin notas: revisar `songParser.ts`; se descartan pistas sin notas y se informa al usuario.

## Guía para cambios habituales

### Agregar un instrumento

1. Añadir la definición a `instruments` en `src/App.tsx`.
2. Elegir waveform y color coherentes.
3. Si debe sonar en acompañamiento, revisar `instrumentForTrack`.
4. Comprobar modo oscuro y claro.

### Agregar un control MIDI

1. Confirmar el mensaje en el monitor con el MiniLab real.
2. Añadir el CC a `src/lib/minilabMapping.ts`.
3. Conectar el significado a los callbacks de `App.tsx`.
4. Añadir o actualizar texto y documentación.

### Cambiar modo canción

Preservar la separación: tipos → parser/storage → transporte/scoring → componente visual → orquestación en `App.tsx`. Los tiempos musicales deben vivir en el transporte y Web Audio, no en contadores de renders React.

### Agregar una integración externa

Documentar primero credenciales, privacidad, almacenamiento y límites del proveedor. La integración actual de YouTube usa enlace + reproductor oficial visible + MIDI local. No implementar descarga, extracción de audio, reproductor oculto ni generación de charts desde contenido protegido. Si se agrega búsqueda interna, mantenerla aislada de `youtube.ts` y documentar API key, cuota y errores.
