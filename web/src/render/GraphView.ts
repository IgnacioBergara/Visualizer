import cytoscape from "cytoscape";
import type { SampleGraph } from "../graph/samples";
import { edgeKey, type VisualState } from "../player/state";

const STATE_CLASSES = "frontier visited finished current active tree path cycle rejected focus";

// Cytoscape no lee variables CSS, así que tomamos los colores del tema al crear la vista.
function themeColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export class GraphView {
  private readonly cy: cytoscape.Core;
  private readonly resizeObserver: ResizeObserver;

  constructor(
    container: HTMLElement,
    private readonly data: SampleGraph,
  ) {
    const { graph, labels, positions } = data;
    this.cy = cytoscape({
      container,
      layout: { name: "preset", fit: true, padding: 40 },
      userZoomingEnabled: true,
      wheelSensitivity: 0.2,
      elements: [
        ...labels.map((label, i) => ({
          group: "nodes" as const,
          data: { id: `n${i}`, label },
          position: { ...positions[i] },
        })),
        ...graph.edges.map((e) => ({
          group: "edges" as const,
          data: {
            id: edgeKey(e.from, e.to, graph.directed),
            source: `n${e.from}`,
            target: `n${e.to}`,
            weight: e.weight,
          },
        })),
      ],
      style: this.buildStyle(),
    });

    // Cytoscape solo encaja el grafo al crearse; lo reencajamos si cambia el tamaño.
    this.resizeObserver = new ResizeObserver(() => {
      this.cy.resize();
      this.cy.fit(undefined, 40);
    });
    this.resizeObserver.observe(container);
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    this.cy.destroy();
  }

  /** `formatValue` decide cómo se escribe el número bajo cada nodo. */
  render(state: VisualState, formatValue: (value: number) => string = String): void {
    this.cy.batch(() => {
      this.cy.elements().removeClass(STATE_CLASSES);

      this.data.labels.forEach((label, i) => {
        const node = this.cy.getElementById(`n${i}`);
        const value = state.nodeValues.get(i);
        node.data("label", value === undefined ? label : `${label}\n${formatValue(value)}`);
        if (state.frontier.has(i)) node.addClass("frontier");
        if (state.visited.has(i)) node.addClass("visited");
        if (state.finished.has(i)) node.addClass("finished");
        if (state.current === i) node.addClass("current");
        if (state.cycleNodes.has(i)) node.addClass("cycle");
        if (state.updatedCell && (state.updatedCell.i === i || state.updatedCell.j === i)) {
          node.addClass("focus");
        }
      });

      for (const key of state.treeEdges) this.cy.getElementById(key).addClass("tree");
      for (const key of state.pathEdges) this.cy.getElementById(key).addClass("path");
      for (const key of state.cycleEdges) this.cy.getElementById(key).addClass("cycle");
      for (const key of state.rejectedEdges) this.cy.getElementById(key).addClass("rejected");
      if (state.activeEdge) this.cy.getElementById(state.activeEdge).addClass("active");
    });
  }

  private buildStyle(): cytoscape.Stylesheet[] {
    const c = {
      node: themeColor("--node"),
      nodeBorder: themeColor("--node-border"),
      text: themeColor("--text"),
      edge: themeColor("--edge"),
      frontier: themeColor("--frontier"),
      visited: themeColor("--visited"),
      finished: themeColor("--finished"),
      current: themeColor("--current"),
      active: themeColor("--active"),
      path: themeColor("--path"),
      cycle: themeColor("--cycle"),
      bg: themeColor("--bg"),
    };
    const directed = this.data.graph.directed;

    return [
      {
        selector: "node",
        style: {
          "background-color": c.node,
          "border-width": 2,
          "border-color": c.nodeBorder,
          label: "data(label)",
          color: c.text,
          "font-size": 14,
          "font-weight": 600,
          "text-wrap": "wrap",
          "text-valign": "center",
          "text-halign": "center",
          width: 44,
          height: 44,
          "transition-property": "background-color, border-color, border-width",
          "transition-duration": 200,
        },
      },
      {
        selector: "edge",
        style: {
          width: 2,
          "line-color": c.edge,
          "target-arrow-color": c.edge,
          "target-arrow-shape": directed ? "triangle" : "none",
          "curve-style": "bezier",
          label: "data(weight)",
          "font-size": 12,
          color: c.text,
          "text-background-color": c.bg,
          "text-background-opacity": 1,
          "text-background-padding": "2px",
        },
      },
      { selector: "node.frontier", style: { "background-color": c.frontier } },
      { selector: "node.visited", style: { "background-color": c.visited } },
      { selector: "node.finished", style: { "background-color": c.finished } },
      { selector: "node.focus", style: { "background-color": c.frontier } },
      { selector: "node.current", style: { "border-color": c.current, "border-width": 5 } },
      { selector: "edge.tree", style: { "line-color": c.visited, "target-arrow-color": c.visited, width: 4 } },
      { selector: "edge.active", style: { "line-color": c.active, "target-arrow-color": c.active, width: 5 } },
      { selector: "edge.path", style: { "line-color": c.path, "target-arrow-color": c.path, width: 6 } },
      { selector: "edge.rejected", style: { "line-style": "dotted", opacity: 0.35 } },
      { selector: "node.cycle", style: { "border-color": c.cycle, "border-width": 5 } },
      {
        selector: "edge.cycle",
        style: { "line-color": c.cycle, "target-arrow-color": c.cycle, "line-style": "dashed", width: 6 },
      },
    ];
  }
}
