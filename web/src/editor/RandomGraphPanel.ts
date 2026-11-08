import { checkAlgorithms, type Verdict } from "../graph/compatibility";
import {
  DEFAULT_RANDOM_OPTIONS,
  generateRandomGraph,
  randomSeed,
  type RandomGraphOptions,
} from "../graph/randomGraph";
import type { SampleGraph } from "../graph/samples";
import { GraphView } from "../render/GraphView";

/** Controles del panel del generador. */
export interface RandomPanelElements {
  nodes: HTMLInputElement;
  density: HTMLInputElement;
  minWeight: HTMLInputElement;
  maxWeight: HTMLInputElement;
  directed: HTMLInputElement;
  acyclic: HTMLInputElement;
  connected: HTMLInputElement;
  seed: HTMLInputElement;
  reroll: HTMLButtonElement;
  summary: HTMLElement;
  report: HTMLUListElement;
}

const ICONS: Record<Verdict, string> = { ok: "✓", warning: "!", blocked: "✗" };

/**
 * Genera un grafo aleatorio con las opciones del panel, lo muestra y lista qué
 * algoritmos se le pueden aplicar. Cualquier cambio en las opciones vuelve a
 * generar; la semilla hace que el resultado sea reproducible.
 */
export class RandomGraphPanel {
  private graph!: SampleGraph;
  private view: GraphView | null = null;
  private readonly listeners = new AbortController();

  constructor(
    private readonly container: HTMLElement,
    private readonly ui: RandomPanelElements,
  ) {
    if (ui.seed.value === "") ui.seed.value = String(randomSeed());
    const { signal } = this.listeners;
    for (const input of [ui.nodes, ui.density, ui.minWeight, ui.maxWeight, ui.directed, ui.acyclic, ui.connected, ui.seed]) {
      input.addEventListener("change", () => this.generate(), { signal });
    }
    ui.reroll.addEventListener(
      "click",
      () => {
        ui.seed.value = String(randomSeed());
        this.generate();
      },
      { signal },
    );
    this.generate();
  }

  /** Cierra el panel y devuelve el grafo generado. */
  finish(): SampleGraph {
    this.listeners.abort();
    this.view?.destroy();
    this.view = null;
    return this.graph;
  }

  private readOptions(): RandomGraphOptions {
    const number = (input: HTMLInputElement, fallback: number) => {
      const value = Number(input.value);
      return input.value !== "" && Number.isFinite(value) ? value : fallback;
    };
    const d = DEFAULT_RANDOM_OPTIONS;
    return {
      nodes: number(this.ui.nodes, d.nodes),
      density: number(this.ui.density, d.density * 100) / 100,
      minWeight: number(this.ui.minWeight, d.minWeight),
      maxWeight: number(this.ui.maxWeight, d.maxWeight),
      directed: this.ui.directed.checked,
      acyclic: this.ui.acyclic.checked,
      connected: this.ui.connected.checked,
    };
  }

  private generate(): void {
    const ui = this.ui;
    // "Sin ciclos" solo tiene sentido en un grafo dirigido.
    ui.acyclic.disabled = !ui.directed.checked;
    if (!ui.directed.checked) ui.acyclic.checked = false;

    const seed = Math.abs(Math.trunc(Number(ui.seed.value))) || 0;
    ui.seed.value = String(seed);
    this.graph = generateRandomGraph(this.readOptions(), seed);

    this.view?.destroy();
    this.view = new GraphView(this.container, this.graph);

    const { nodeCount, edges } = this.graph.graph;
    ui.summary.textContent = `${nodeCount} nodos · ${edges.length} aristas`;
    ui.report.replaceChildren(
      ...checkAlgorithms(this.graph.graph).map((check) => {
        const li = document.createElement("li");
        li.className = check.verdict;
        const icon = document.createElement("span");
        icon.className = "icon";
        icon.textContent = ICONS[check.verdict];
        const text = document.createElement("span");
        text.textContent = check.message;
        li.append(icon, text);
        return li;
      }),
    );
  }
}
