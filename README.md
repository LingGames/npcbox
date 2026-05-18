# LingGames NPC Sandbox

Sandbox minimo para probar interaccion basica entre un player controlable y un NPC, con espacio para conectar metricas externas de alumnos.

## Incluye

- Escena base en `three.js`.
- Un player manejable con `W A S D`.
- Un NPC con reaccion simple por proximidad.
- GUI en escena con dropdown para elegir alumnos por alias publico.
- Adaptador para cargar metricas desde `deutsch` usando un `studentRef` opaco.
- Estructura ligera para iterar rapido.

## Estructura

- `src/main.js`: escena, movimiento del player y estado del NPC.
- `src/publicStudents.js`: roster publico de alumnos seleccionables.
- `src/studentMetrics.js`: carga y normalizacion de metricas externas.
- `src/style.css`: layout minimo de escena completa.

## Uso local

```bash
npm install
npm run dev
```

## Variables de entorno

Usa `.env` con:

```bash
VITE_DEUTSCH_METRICS_URL=http://localhost:3000/api/linggames/student-metrics
VITE_DEUTSCH_STUDENT_REF=tu-student-ref-opaco
```

Tambien puedes pasar el alias por URL:

```bash
http://localhost:5173/?studentRef=tu-student-ref-opaco
```

## Integracion segura con `deutsch`

No conviene hashear el `studentId` dentro de LingGames si el secreto vive en el navegador. El cliente se puede inspeccionar y un hash simple de IDs numericos se puede enumerar.

La opcion mas sana es:

1. `deutsch` genera un `studentRef` opaco y estable, por ejemplo un token aleatorio o un HMAC firmado en servidor.
2. LingGames solo conoce ese `studentRef`.
3. Un endpoint puente en `deutsch` recibe `studentRef`, resuelve el alumno real en servidor y devuelve solo las metricas necesarias.

Payload minimo sugerido desde `deutsch`:

```json
{
  "studentRef": "opaque-ref",
  "level": {
    "currentLevel": 3,
    "resolvedInput": {
      "attendancePct": 84,
      "punctualityAvgLateMinutes": 2.5,
      "practicesPct": 79,
      "gradesPct": 81,
      "points": 48
    }
  }
}
```

## Siguientes pasos

1. Anadir interaccion al pulsar una tecla cerca del NPC.
2. Crear en `deutsch` el endpoint puente por `studentRef`.
3. Reemplazar la reaccion visual por dialogos o estados del NPC basados en metricas reales.

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
