// Puente C++ <-> JavaScript. La UI pasa el grafo como objeto plano
// ({ nodeCount, directed, edges: [{ from, to, weight }] }) y recibe un array
// de pasos, así no hay objetos C++ vivos en JS que haya que liberar a mano.
#include <emscripten/bind.h>
#include <emscripten/val.h>

#include <string>

#include "gv/algorithms.hpp"

using emscripten::val;

namespace {

// Grafo no es copiable, así que en vez de devolverlo se construye acá y se
// le pasa al algoritmo.
template <typename Algorithm>
val withGraph(const val& desc, Algorithm run) {
    gv::Grafo graph(desc["nodeCount"].as<int>());
    const bool directed = desc["directed"].as<bool>();
    const val edges = desc["edges"];
    const auto count = edges["length"].as<unsigned>();
    for (unsigned i = 0; i < count; ++i) {
        const val e = edges[i];
        const int from = e["from"].as<int>();
        const int to = e["to"].as<int>();
        const double weight = e["weight"].as<double>();
        if (directed) graph.agregarArista(from, to, weight);
        else graph.agregarAristaNoDirigida(from, to, weight);
    }
    return run(graph);
}

val stepsToJs(const gv::Steps& steps) {
    val out = val::array();
    for (const gv::Step& s : steps) {
        val obj = val::object();
        obj.set("type", std::string(gv::toString(s.type)));
        obj.set("node", s.node);
        obj.set("target", s.target);
        obj.set("value", s.value);
        out.call<void>("push", obj);
    }
    return out;
}

val runBfs(const val& desc, int source) {
    return withGraph(desc, [&](const gv::Grafo& g) { return stepsToJs(gv::bfs(g, source)); });
}
val runDfs(const val& desc, int source) {
    return withGraph(desc, [&](const gv::Grafo& g) { return stepsToJs(gv::dfs(g, source)); });
}
val runDijkstra(const val& desc, int source, int target) {
    return withGraph(desc, [&](const gv::Grafo& g) { return stepsToJs(gv::dijkstra(g, source, target)); });
}

} // namespace

EMSCRIPTEN_BINDINGS(gv_engine) {
    emscripten::function("bfs", &runBfs);
    emscripten::function("dfs", &runDfs);
    emscripten::function("dijkstra", &runDijkstra);
}
