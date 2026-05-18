# LingGames NPC Sandbox

Sandbox minimo para probar interaccion basica entre un player controlable y un NPC.

## Incluye

- Escena base en `three.js`.
- Un player manejable con `W A S D`.
- Un NPC con reaccion simple por proximidad.
- Estructura ligera para iterar rapido.

## Estructura

- `src/main.js`: escena, movimiento del player y estado del NPC.
- `src/style.css`: layout y HUD minima.

## Uso local

```bash
npm install
npm run dev
```

## Siguientes pasos

1. Anadir interaccion al pulsar una tecla cerca del NPC.
2. Conectar respuestas dinamicas del NPC a un sistema de estados.
3. Reintroducir metricas solo cuando la base de movimiento e interaccion ya este estable.

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
