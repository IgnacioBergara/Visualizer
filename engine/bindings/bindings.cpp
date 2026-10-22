// Puente C++ <-> JavaScript. La UI pasa el grafo como objeto plano
// ({ nodeCount, directed, edges: [{ from, to, weight }] }) y recibe un array
// de pasos, así no hay objetos C++ vivos en JS que haya que liberar a mano.
#include <emscripten/bind.h>
#include <emscripten/val.h>

#include <string>

#include "gv/algorithms.hpp"

using emscripten::val;

namespace {

gv::Graph graphFromJs(const val& desc) {
    gv::Graph graph(desc["nodeCount"].as<int>(), desc["directed"].as<bool>());
    const val edges = desc["edges"];
    const auto count = edges["length"].as<unsigned>();
    for (unsigned i = 0; i < count; ++i) {
        const val e = edges[i];
        graph.addEdge(e["from"].as<int>(), e["to"].as<int>(), e["weight"].as<double>());
    }
    return graph;
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

val runBfs(const val& desc, int source) { return stepsToJs(gv::bfs(graphFromJs(desc), source)); }
val runDfs(const val& desc, int source) { return stepsToJs(gv::dfs(graphFromJs(desc), source)); }
val runDijkstra(const val& desc, int source, int target) {
    return stepsToJs(gv::dijkstra(graphFromJs(desc), source, target));
}

} // namespace

EMSCRIPTEN_BINDINGS(gv_engine) {
    emscripten::function("bfs", &runBfs);
    emscripten::function("dfs", &runDfs);
    emscripten::function("dijkstra", &runDijkstra);
}
