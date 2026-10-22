# Visualizer

Visualizador interactivo de algoritmos de grafos. Los algoritmos están escritos en **C++20**, se compilan a **WebAssembly** con Emscripten y se animan en el navegador con **TypeScript + Cytoscape.js**.

Algoritmos actuales: **BFS**, **DFS** y **Dijkstra**.

## Arquitectura

```
┌─────────────── Navegador ───────────────┐
│ web/ (TypeScript + Vite)                │
│  ├─ render/GraphView   → Cytoscape.js   │
│  ├─ player/Player      → play/pausa/paso│
│  └─ player/state       → pasos → estado │
│           ▲                 │           │
│     Step[]│                 │grafo (JSON)│
│           │                 ▼           │
│ engine/ (C++20 → engine.wasm)           │
│  └─ bfs, dfs, dijkstra → std::vector<Step>
└─────────────────────────────────────────┘
```

La idea clave es que **los algoritmos no animan nada**. Cada uno devuelve la lista de pasos que dio (`visit`, `explore-edge`, `discover`, `relax`, `finish`, `path-edge`). La UI reproduce esa lista y reconstruye el estado visual hasta cualquier paso, por eso se puede avanzar, retroceder o saltar con la línea de tiempo.

Para agregar un algoritmo:

1. Implementarlo en `engine/src/algorithms/` y declararlo en `engine/include/gv/algorithms.hpp`.
2. Exponerlo en `engine/bindings/bindings.cpp` y tiparlo en `web/src/wasm/engine.d.ts`.
3. Agregarlo a `AlgorithmId`, a `runAlgorithm` y al `<select>` de `index.html`.

## Estructura

```
engine/                  C++ (sin dependencias de la web)
  include/gv/            Grafo, Step, algoritmos
  include/gv/tads/       Cola, Pila, MinHeap, MFSet (TADs propios)
  src/                   implementación
  bindings/              puente embind → JavaScript
  tests/                 Catch2
web/                     app Vite + TypeScript
  src/wasm/              engine.js + engine.wasm (generados)
.github/workflows/ci.yml build + tests + deploy a GitHub Pages
```

## Requisitos

- [Node.js](https://nodejs.org) 20+
- [Emscripten (emsdk)](https://emscripten.org/docs/getting_started/downloads.html)
- CMake 3.20+ y Ninja (`pip install cmake ninja` es la forma más simple en Windows)

## Uso

Con el entorno de emsdk activado (`emsdk_env`):

```bash
cd web
npm install
npm run build:wasm    # compila el motor C++ y los tests a WebAssembly
npm run test:engine   # ejecuta los tests de C++ con Node
npm run dev           # abre la app en http://localhost:5173
```

Controles: `←` / `→` avanzan o retroceden un paso y `Espacio` reproduce o pausa.

## Deploy

El workflow `ci.yml` compila, ejecuta los tests y publica `web/dist` en GitHub Pages en cada push a `main`. Para activarlo hay que ir a **Settings → Pages → Source: GitHub Actions** en el repositorio.
