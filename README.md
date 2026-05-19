# LingGames NPC Sandbox

Sandbox minimo para probar interaccion basica entre un player controlable y un NPC, con espacio para conectar metricas externas de alumnos.

## Incluye

- Escena base en `three.js`.
- Un player manejable con `W A S D`.
- Un NPC con reaccion simple por proximidad.
- GUI en escena con selector de modo.
- Integracion segura con `deutsch` usando `player-access` y `npc-metrics`.
- Fallbacks mock para iterar sin sesion real.

## Estructura

- `src/main.js`: escena, movimiento del player y estado del NPC.
- `src/publicStudents.js`: modos disponibles (`Mi sesion actual` y mocks locales).
- `src/studentMetrics.js`: acceso a `deutsch`, normalizacion y derivacion del perfil del NPC.
- `src/style.css`: layout minimo de escena completa.

## Uso local

```bash
npm install
npm run dev
```

## Variables de entorno

Usa `.env` con:

```bash
VITE_DEUTSCH_BASE_URL=http://localhost:3000
```

## Flujo seguro con `deutsch`

1. LingGames llama `GET /api/linggames/player-access` con `credentials: include`.
2. `deutsch` valida la sesion del alumno y devuelve:
   - `studentKey` opaco
   - `accessToken` corto
3. LingGames llama `GET /api/internal/linggames/npc-metrics` con `Authorization: Bearer <accessToken>`.
4. `deutsch` responde un perfil seguro para NPCs sin exponer `studentId` real.

## Requisitos para probarlo

- Tener `deutsch` corriendo en `http://localhost:3000`.
- Haber iniciado sesion en `deutsch` con el alumno en el mismo navegador.
- Configurar en `deutsch`:
  - `LINGGAMES_ALIAS_SECRET`
  - `LINGGAMES_TOKEN_SECRET`
  - `LINGGAMES_ALLOWED_ORIGIN=http://localhost:5173`

## Modos disponibles

- `Mi sesion actual`: usa la sesion real del alumno en `deutsch`.
- `Alumno Alfa/Bravo/Charlie (mock)`: datos locales para iteracion rapida.

## Siguientes pasos

1. Anadir interaccion contextual al pulsar una tecla cerca del NPC.
2. Convertir `recommendedStrategy` en ramas de dialogo.
3. Reaccionar a `supportNeed`, `challengeLevel` y `pace` con conducta jugable real.
4. Si el sandbox se despliega en otro dominio, registrar ese origen en `LINGGAMES_ALLOWED_ORIGIN`.
