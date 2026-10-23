# Visualizer

Visualizador interactivo de algoritmos de grafos. Los algoritmos están escritos en **C++20**, se compilan a **WebAssembly** con Emscripten y se animan en el navegador con **TypeScript + Cytoscape.js**.

## Algoritmos

| Algoritmo | Qué muestra | Estructuras propias |
|---|---|---|
| **BFS** | Recorrido por niveles | `Cola` |
| **DFS** | Recorrido recursivo con profundidad | — |
| **Dijkstra** (O(V²)) | Camino mínimo con pesos no negativos | — |
| **Bellman-Ford** (con cola) | Camino mínimo con pesos negativos y detección de ciclos negativos | `Cola` |
| **Floyd-Warshall** | Matriz de distancias entre todos los pares, pivote a pivote | — |
| **Kahn** | Orden topológico y detección de ciclos | `Cola` |
| **Prim** (O(V²)) | Árbol de cubrimiento mínimo creciendo desde un nodo | — |
| **Kruskal** | Árbol de cubrimiento mínimo con unión de conjuntos | `MinHeap`, `MFSet` |

La app trae grafos de ejemplo para cada caso: ponderado no dirigido, dependencias (dirigido sin ciclos), pesos negativos y ciclo negativo. Los grafos que no sirven para el algoritmo elegido aparecen deshabilitados con el motivo (por ejemplo, Dijkstra con pesos negativos).

## Editor de grafos

Con **✎ Editar** se arma un grafo propio, partiendo de cero o de una copia del ejemplo que se está viendo:

- Clic en el fondo: nuevo nodo. Clic en un nodo y luego en otro: arista.
- Clic en una arista (o en su peso): cambiar el peso. Clic derecho: borrar. Arrastrar: mover.
- Interruptor dirigido / no dirigido, **exportar e importar JSON** y guardado automático en el navegador.

Formato del JSON:

```json
{
  "version": 1,
  "directed": false,
  "nodes": [{ "label": "A", "x": 0, "y": 0 }, { "label": "B", "x": 150, "y": 0 }],
  "edges": [{ "from": 0, "to": 1, "weight": 4 }]
}
```

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
│  └─ algoritmos → std::vector<Step>      │
└─────────────────────────────────────────┘
```

La idea clave es que **los algoritmos no animan nada**. Cada uno devuelve la lista de pasos que dio (`visit`, `explore-edge`, `relax`, `path-edge`, `matrix-update`, etc., definidos en `engine/include/gv/step.hpp`). La UI reproduce esa lista y reconstruye el estado visual hasta cualquier paso, por eso se puede avanzar, retroceder o saltar con la línea de tiempo.

Para agregar un algoritmo:

1. Implementarlo en `engine/src/algorithms/` y declararlo en `engine/include/gv/algorithms.hpp`.
2. Exponerlo en `engine/bindings/bindings.cpp` y tiparlo en `web/src/wasm/engine.d.ts`.
3. Agregarlo a `AlgorithmId`, a `runAlgorithm` y al `<select>` de `index.html`.
4. Si usa tipos de paso nuevos, interpretarlos en `web/src/player/state.ts` (estado visual y descripción).

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

El workflow `ci.yml` compila y ejecuta los tests en cada push a `main` y en cada PR. La publicación en GitHub Pages es manual: **Actions → CI → Run workflow** sobre `main`. Antes hay que activar **Settings → Pages → Source: GitHub Actions** en el repositorio.
