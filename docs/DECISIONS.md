# Registro de decisiones

Este registro evita reabrir decisiones ya tomadas sin una razón concreta. Cada entrada debe indicar qué cambia y qué documentación queda afectada.

## D-001 — Aplicación local-first

**Estado:** vigente.

La primera versión no tiene backend ni cuenta. MIDI, preferencias, biblioteca y audio se procesan localmente. Esto reduce latencia y mantiene las canciones del usuario fuera de un servidor.

**Consecuencia:** cualquier sincronización o catálogo remoto futuro debe ser opcional y documentar credenciales, privacidad y fallback offline.

## D-002 — MIDI como fuente del modo canción

**Estado:** vigente.

El modo juego usa `.mid`/`.midi` y `@tonejs/midi`. El modelo conserva tempos, pista, canal, nota, velocidad y duración.

**Consecuencia:** MP3/WAV y audio de servicios externos no son entrada del chart actual. La conversión audio→MIDI queda como una fase separada.

## D-003 — Un solo AudioContext para audio, metrónomo, grabación y canción

**Estado:** vigente.

`AudioEngine` es dueño del `AudioContext`; `SongTransport` lo reutiliza para que acompañamiento, metrónomo y grabación compartan reloj y salida.

**Consecuencia:** no crear contextos de audio independientes desde componentes React ni usar `setInterval` como reloj musical definitivo.

## D-004 — Adaptación a 25 teclas por transporte de octavas

**Estado:** vigente.

Las canciones pueden tener un registro mayor que el MiniLab visual. `gameScoring.ts` calcula un inicio central y pliega notas por octavas, conservando la nota MIDI original para información y futuras mejoras.

**Consecuencia:** una primera versión jugable puede repetir alturas en registros distintos; no cambiar a truncado silencioso sin rediseñar el chart.

## D-005 — Complejidad visual progresiva

**Estado:** vigente.

El teclado ocupa el centro. Pads, encoders, faders y ajustes secundarios se muestran en menús o paneles compactos.

**Consecuencia:** una feature nueva debe tener una entrada mínima y no convertir la pantalla libre en un mezclador profesional.

## D-006 — Tema persistente con oscuro por defecto

**Estado:** vigente.

El tema se guarda en `localStorage` bajo `minilab-theme`, se aplica en `data-theme` del documento y se inicializa desde `index.html` antes de React.

**Consecuencia:** todos los nuevos estilos deben cubrir claro y oscuro; no asumir que un color hardcodeado oscuro es legible en ambos.

## D-007 — Launcher conservador

**Estado:** vigente.

El launcher solo actualiza con fast-forward, conserva cambios locales, instala dependencias cuando cambian los manifests, oculta la consola y abre el navegador después del health check.

**Consecuencia:** no cambiar a `git reset`, pulls forzados ni comandos destructivos para “arreglar” una actualización.

## D-008 — Límite de YouTube Music

**Estado:** decisión para una futura integración.

Se puede explorar búsqueda/enlaces y reproducción mediante APIs/reproductor oficial visible, pero la aplicación no descargará, separará, almacenará ni analizará el audio de YouTube para crear notas.

**Consecuencia:** una canción seleccionada desde YouTube podría funcionar como referencia/reproductor, mientras que el juego necesita un MIDI local o una fuente autorizada independiente.
