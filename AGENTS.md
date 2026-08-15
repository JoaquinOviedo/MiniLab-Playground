# Guía de trabajo para MiniLab Playground

Este archivo es el punto de entrada para cualquier modificación futura del repositorio. Antes de editar, leer `docs/PROJECT_CONTEXT.md`; consultar `docs/ARCHITECTURE.md` para cambios de diseño y `docs/DEVELOPMENT.md` para validación.

## Propósito del proyecto

MiniLab Playground es un instrumento musical local-first para Arturia MiniLab 3. La prioridad de la interfaz es conectar, elegir un timbre, tocar y recibir respuesta inmediata. El teclado visual es el centro; los controles secundarios deben permanecer compactos o dentro de menús.

## Reglas de implementación

- Mantener la aplicación sin backend por defecto: Web MIDI, Web Audio, IndexedDB y `localStorage` viven en el navegador.
- Mantener los contratos compartidos en `src/types.ts` y la lógica de audio, MIDI, canciones y persistencia fuera de los componentes React.
- Actualizar las copias en español e inglés cuando se agregue texto visible.
- Todo nuevo control visual debe contemplar `data-theme="dark"` y `data-theme="light"`; el tema elegido se guarda en `minilab-theme`.
- El modo canción acepta MIDI local. No descargar, extraer, separar ni reproducir audio de YouTube fuera de un reproductor oficial visible.
- El launcher debe seguir usando rutas basadas en `%~dp0`, consola invisible mediante `.vbs`, comprobación HTTP del servidor y actualizaciones fast-forward únicamente.
- No cambiar el puerto `5173`, la base IndexedDB `minilab-playground` ni las claves de preferencias sin documentar una migración.
- Preferir cambios pequeños, reversibles y cubiertos por pruebas unitarias cuando se modifique parser, rango, puntuación o transporte.

## Comandos de verificación

```bash
npm install
npm run dev
npm test
npm run build
```

En Windows, el flujo de usuario es ejecutar `iniciar_minilab.vbs`. El script inicia `iniciar_minilab.bat`, verifica `http://127.0.0.1:5173/` y abre el navegador cuando responde.

## Flujo Git

Antes de trabajar, comprobar `git status --short --branch` y el remoto. No usar `git reset --hard` ni sobrescribir cambios ajenos. Publicar solo cuando el usuario lo solicite o cuando forme parte explícita de la tarea.

## Checklist mínimo antes de entregar

1. `npm test` pasa.
2. `npm run build` pasa.
3. La interfaz principal se revisa en oscuro y claro.
4. Si el cambio afecta canciones, se revisan biblioteca, importación, transporte y ambas vistas.
5. Si el cambio afecta MIDI, se revisa el estado sin Web MIDI y el monitor con un dispositivo real cuando esté disponible.
6. Se actualiza la documentación cuando cambia una decisión, una ruta, una persistencia o una limitación.
