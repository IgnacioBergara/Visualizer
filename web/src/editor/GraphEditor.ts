import type cytoscape from "cytoscape";
import {
  addNode,
  emptyGraph,
  fromJson,
  MAX_NODES,
  moveNode,
  removeEdge,
  removeNode,
  saveCustom,
  setDirected,
  setEdge,
  toJson,
} from "../graph/customGraph";
import type { SampleGraph } from "../graph/samples";
import { edgeKey } from "../player/state";
import { GraphView, type Viewport } from "../render/GraphView";

/** Controles del panel lateral que maneja el editor. */
export interface EditorElements {
  directed: HTMLInputElement;
  weight: HTMLInputElement;
  edgePanel: HTMLElement;
  edgeLabel: HTMLElement;
  edgeWeight: HTMLInputElement;
  edgeDelete: HTMLButtonElement;
  clear: HTMLButtonElement;
  exportButton: HTMLButtonElement;
  importInput: HTMLInputElement;
  summary: HTMLElement;
  message: HTMLElement;
}

// Los nodos tienen id `n<índice>`.
const nodeIndex = (element: { id(): string }) => Number(element.id().slice(1));

/**
 * Edición sobre el lienzo:
 *   clic en el fondo → nodo nuevo · clic en dos nodos → arista
 *   clic en una arista → editar su peso · clic derecho → borrar · arrastrar → mover
 * Cada cambio produce un grafo nuevo y se redibuja conservando la cámara.
 */
export class GraphEditor {
  private graph: SampleGraph;
  private view: GraphView | null = null;
  /** Nodo elegido como origen de la próxima arista. */
  private pending: number | null = null;
  private selected: { from: number; to: number } | null = null;
  private readonly listeners = new AbortController();

  constructor(
    private readonly container: HTMLElement,
    start: SampleGraph,
    private readonly ui: EditorElements,
    viewport?: Viewport,
  ) {
    this.graph = start;
    ui.directed.checked = start.graph.directed;
    this.showMessage("");
    this.bindPanel();
    this.redraw(viewport);
  }

  /** Termina la edición y devuelve el grafo resultante. */
  finish(): SampleGraph {
    this.listeners.abort();
    this.view?.destroy();
    this.view = null;
    return this.graph;
  }

  // Cada cambio se guarda enseguida, así una recarga no pierde lo editado.
  private update(next: SampleGraph, keepViewport = true): void {
    this.graph = next;
    saveCustom(this.graph);
    this.redraw(keepViewport ? this.view?.viewport : undefined);
  }

  private redraw(viewport?: Viewport): void {
    this.view?.destroy();
    this.view = new GraphView(this.container, this.graph, viewport);
    const cy = this.view.core;
    if (this.pending !== null) cy.getElementById(`n${this.pending}`).addClass("pending");
    if (this.selected) {
      const { from, to } = this.selected;
      cy.getElementById(edgeKey(from, to, this.graph.graph.directed)).addClass("selected");
    }
    this.bindCanvas(cy);
    this.renderPanel();
  }

  // Los listeners del lienzo mueren con cada instancia de Cytoscape. Cada
  // cambio redibuja creando otra instancia, así que se aplica después de que
  // termine el evento: si no, el mismo clic le llega también a la nueva.
  private bindCanvas(cy: cytoscape.Core): void {
    const later = (action: () => void) => setTimeout(action, 0);
    cy.on("tap", (evt) => {
      if (evt.target === cy) later(() => this.onBackgroundTap(evt.position));
    });
    cy.on("tap", "node", (evt) => later(() => this.onNodeTap(nodeIndex(evt.target))));
    cy.on("tap", "edge", (evt) => later(() => this.onEdgeTap(evt.target)));
    cy.on("cxttap", "node", (evt) => later(() => this.deleteNode(nodeIndex(evt.target))));
    cy.on("cxttap", "edge", (evt) =>
      later(() => this.deleteEdge(nodeIndex(evt.target.source()), nodeIndex(evt.target.target()))),
    );
    // Mover un nodo no cambia la estructura: se guarda la posición sin redibujar.
    cy.on("dragfree", "node", (evt) => {
      this.graph = moveNode(this.graph, nodeIndex(evt.target), evt.target.position());
      saveCustom(this.graph);
    });
  }

  private onBackgroundTap(position: { x: number; y: number }): void {
    // Con algo seleccionado, el clic en el fondo solo cancela la selección.
    if (this.pending !== null || this.selected !== null) {
      this.pending = null;
      this.selected = null;
      this.redraw(this.view?.viewport);
      return;
    }
    if (this.graph.graph.nodeCount >= MAX_NODES) {
      this.showMessage(`Se llegó al máximo de ${MAX_NODES} nodos.`, true);
      return;
    }
    this.update(addNode(this.graph, position));
  }

  private onNodeTap(index: number): void {
    this.selected = null;
    if (this.pending === null) {
      this.pending = index;
      this.redraw(this.view?.viewport);
    } else if (this.pending === index) {
      this.pending = null;
      this.redraw(this.view?.viewport);
    } else {
      const from = this.pending;
      this.pending = null;
      this.update(setEdge(this.graph, from, index, this.newEdgeWeight()));
    }
  }

  private onEdgeTap(edge: cytoscape.EdgeSingular): void {
    this.pending = null;
    this.selected = { from: nodeIndex(edge.source()), to: nodeIndex(edge.target()) };
    this.redraw(this.view?.viewport);
  }

  private deleteNode(index: number): void {
    this.pending = null;
    this.selected = null;
    this.update(removeNode(this.graph, index));
  }

  private deleteEdge(from: number, to: number): void {
    this.selected = null;
    this.update(removeEdge(this.graph, from, to));
  }

  private newEdgeWeight(): number {
    const weight = Number(this.ui.weight.value);
    return this.ui.weight.value !== "" && Number.isFinite(weight) ? weight : 1;
  }

  private bindPanel(): void {
    const { signal } = this.listeners;
    const ui = this.ui;

    ui.directed.addEventListener(
      "change",
      () => {
        this.selected = null;
        this.update(setDirected(this.graph, ui.directed.checked));
      },
      { signal },
    );
    ui.edgeWeight.addEventListener(
      "change",
      () => {
        const weight = Number(ui.edgeWeight.value);
        if (!this.selected || ui.edgeWeight.value === "" || !Number.isFinite(weight)) return;
        this.update(setEdge(this.graph, this.selected.from, this.selected.to, weight));
      },
      { signal },
    );
    ui.edgeDelete.addEventListener(
      "click",
      () => this.selected && this.deleteEdge(this.selected.from, this.selected.to),
      { signal },
    );
    ui.clear.addEventListener(
      "click",
      () => {
        if (this.graph.graph.nodeCount > 0 && !confirm("¿Borrar todos los nodos y aristas?")) return;
        this.pending = null;
        this.selected = null;
        this.update(emptyGraph(this.graph.graph.directed));
      },
      { signal },
    );
    ui.exportButton.addEventListener("click", () => this.download(), { signal });
    ui.importInput.addEventListener("change", () => this.importFile(), { signal });
  }

  private renderPanel(): void {
    const { graph, labels } = this.graph;
    const ui = this.ui;
    ui.directed.checked = graph.directed;
    ui.summary.textContent = `${graph.nodeCount} nodos · ${graph.edges.length} aristas`;

    const edge = this.selected
      ? graph.edges.find((e) => e.from === this.selected!.from && e.to === this.selected!.to)
      : undefined;
    ui.edgePanel.hidden = !edge;
    if (edge) {
      ui.edgeLabel.textContent = `${labels[edge.from]} ${graph.directed ? "→" : "–"} ${labels[edge.to]}`;
      ui.edgeWeight.value = String(edge.weight);
    }
  }

  private download(): void {
    const blob = new Blob([toJson(this.graph)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "grafo.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  private async importFile(): Promise<void> {
    const file = this.ui.importInput.files?.[0];
    this.ui.importInput.value = ""; // permite volver a elegir el mismo archivo
    if (!file) return;
    try {
      const imported = fromJson(await file.text());
      this.pending = null;
      this.selected = null;
      this.update(imported, false); // encaja la cámara al grafo importado
      this.showMessage(`Se importó «${file.name}».`);
    } catch (err) {
      this.showMessage(err instanceof Error ? err.message : "No se pudo importar el archivo.", true);
    }
  }

  private showMessage(text: string, isError = false): void {
    this.ui.message.textContent = text;
    this.ui.message.hidden = text === "";
    this.ui.message.classList.toggle("error", isError);
  }
}
