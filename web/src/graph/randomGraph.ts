// Generador de grafos aleatorios reproducible: la misma semilla y las mismas
// opciones dan siempre el mismo grafo.
import { MAX_NODES, nextLabel } from "./customGraph";
import type { SampleGraph } from "./samples";

export interface RandomGraphOptions {
  nodes: number;
  /** Probabilidad (0-1) de agregar cada arista posible, además del árbol de conexión. */
  density: number;
  directed: boolean;
  /** Solo para dirigidos: todas las aristas respetan un orden, así no hay ciclos. */
  acyclic: boolean;
  /** Arranca con un árbol que toca todos los nodos, así el grafo queda conexo. */
  connected: boolean;
  minWeight: number;
  maxWeight: number;
}

export const DEFAULT_RANDOM_OPTIONS: RandomGraphOptions = {
  nodes: 8,
  density: 0.3,
  directed: false,
  acyclic: false,
  connected: true,
  minWeight: 1,
  maxWeight: 9,
};

/** Generador pseudoaleatorio mulberry32: rápido y con semilla. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randomSeed = () => Math.floor(Math.random() * 1_000_000);

/**
 * Layout de fuerzas (Fruchterman-Reingold): los nodos se repelen, las aristas
 * los atraen como resortes y una gravedad leve mantiene juntas las componentes
 * sueltas. Usa el mismo generador con semilla, así que es reproducible.
 */
function forceLayout(
  n: number,
  edges: readonly { from: number; to: number }[],
  random: () => number,
): { x: number; y: number }[] {
  const k = 130; // distancia ideal entre nodos
  const size = k * Math.sqrt(n);
  // Arranca en un círculo con un poco de ruido para romper la simetría.
  const pos = Array.from({ length: n }, (_, i) => {
    const angle = (2 * Math.PI * i) / Math.max(n, 1);
    return {
      x: (size / 2) * Math.cos(angle) + (random() - 0.5) * 10,
      y: (size / 2) * Math.sin(angle) + (random() - 0.5) * 10,
    };
  });

  const iterations = 300;
  for (let step = 0; step < iterations; step++) {
    const temperature = (size / 8) * (1 - step / iterations); // se enfría hasta 0
    const disp = pos.map(() => ({ x: 0, y: 0 }));

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        const dist = Math.max(Math.hypot(dx, dy), 0.01);
        const force = (k * k) / dist;
        disp[i].x += (dx / dist) * force;
        disp[i].y += (dy / dist) * force;
        disp[j].x -= (dx / dist) * force;
        disp[j].y -= (dy / dist) * force;
      }
    }
    for (const e of edges) {
      const dx = pos[e.from].x - pos[e.to].x;
      const dy = pos[e.from].y - pos[e.to].y;
      const dist = Math.max(Math.hypot(dx, dy), 0.01);
      const force = (dist * dist) / k;
      disp[e.from].x -= (dx / dist) * force;
      disp[e.from].y -= (dy / dist) * force;
      disp[e.to].x += (dx / dist) * force;
      disp[e.to].y += (dy / dist) * force;
    }

    for (let i = 0; i < n; i++) {
      disp[i].x -= pos[i].x * 0.05; // gravedad hacia el centro
      disp[i].y -= pos[i].y * 0.05;
      const length = Math.max(Math.hypot(disp[i].x, disp[i].y), 0.01);
      const move = Math.min(length, temperature);
      pos[i].x += (disp[i].x / length) * move;
      pos[i].y += (disp[i].y / length) * move;
    }
  }
  // Si dos nodos quedaron demasiado cerca, se agranda todo el dibujo hasta
  // separarlos (la vista encaja el grafo, así que solo cambia la escala).
  const minSeparation = 80;
  let closest = Infinity;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      closest = Math.min(closest, Math.hypot(pos[i].x - pos[j].x, pos[i].y - pos[j].y));
    }
  }
  const scale = closest < minSeparation ? Math.min(minSeparation / Math.max(closest, 1), 4) : 1;
  return pos.map((p) => ({ x: Math.round(p.x * scale), y: Math.round(p.y * scale) }));
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function generateRandomGraph(options: RandomGraphOptions, seed: number): SampleGraph {
  const random = seededRandom(seed);
  const n = clamp(Math.round(options.nodes), 1, MAX_NODES);
  const directed = options.directed;
  const acyclic = directed && options.acyclic;
  const density = clamp(options.density, 0, 1);
  const low = Math.ceil(Math.min(options.minWeight, options.maxWeight));
  const high = Math.floor(Math.max(options.minWeight, options.maxWeight));
  const weight = () => low + Math.floor(random() * (high - low + 1));

  // Orden aleatorio de los nodos: en un DAG las aristas van siempre de un
  // nodo anterior a uno posterior en este orden.
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const rank = new Map(order.map((node, i) => [node, i]));

  const edges: { from: number; to: number; weight: number }[] = [];
  const used = new Set<string>();
  const key = (a: number, b: number) => (directed ? `${a}-${b}` : `${Math.min(a, b)}-${Math.max(a, b)}`);
  const add = (a: number, b: number) => {
    // En un DAG se orienta la arista según el orden; si no, se respeta (a, b).
    const [from, to] = acyclic && rank.get(a)! > rank.get(b)! ? [b, a] : [a, b];
    if (from === to || used.has(key(from, to))) return;
    used.add(key(from, to));
    edges.push({ from, to, weight: weight() });
  };

  if (options.connected) {
    // Cada nodo (en el orden aleatorio) se cuelga de uno anterior: árbol de conexión.
    for (let i = 1; i < n; i++) {
      const parent = order[Math.floor(random() * i)];
      const child = order[i];
      // En dirigidos sin DAG la orientación del árbol también es aleatoria.
      if (directed && !acyclic && random() < 0.5) add(child, parent);
      else add(parent, child);
    }
  }

  // Pares candidatos: ordenados en un dirigido con ciclos permitidos; sin
  // ordenar en los demás (en un DAG la orientación la decide `add`).
  const bothWays = directed && !acyclic;
  for (let a = 0; a < n; a++) {
    for (let b = bothWays ? 0 : a + 1; b < n; b++) {
      if (a !== b && random() < density) add(a, b);
    }
  }

  const labels: string[] = [];
  for (let i = 0; i < n; i++) labels.push(nextLabel(labels));
  const positions = forceLayout(n, edges, random);

  return {
    name: `Aleatorio (${n} nodos, semilla ${seed})`,
    graph: { nodeCount: n, directed, edges },
    labels,
    positions,
  };
}
