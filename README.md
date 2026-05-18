# LingGames NPC Sandbox

Sandbox para experimentar con NPCs que reaccionan de forma diferente segun las metricas de cada alumno.

## Incluye

- Escena base en `three.js` para pruebas visuales.
- Alumnos seleccionables con metricas iniciales.
- NPCs con estilos distintos de respuesta.
- Motor simple de reaccion separado para evolucionar hacia IA mas rica.

## Estructura

- `src/main.js`: escena, seleccion de alumnos y render UI.
- `src/data/students.js`: perfiles y metricas de alumnos.
- `src/sim/npcProfiles.js`: definicion de NPCs.
- `src/sim/reactionEngine.js`: reglas iniciales de reaccion.

## Uso local

```bash
npm install
npm run dev
```

## Siguientes pasos

1. Sustituir reglas fijas por prompts o arboles de decision.
2. Anadir mas metricas como asistencia, progreso por unidad o comportamiento.
3. Conectar cada NPC a objetivos concretos del aula o del juego.

## GitHub

```bash
git init
git add .
git commit -m "Initial NPC sandbox"
git branch -M main
git remote add origin <tu-url-de-github>
git push -u origin main
```

Si Git te muestra un aviso de seguridad por propietario de carpeta, usa:

```bash
git config --global --add safe.directory D:/projects/games/LingGames
```
