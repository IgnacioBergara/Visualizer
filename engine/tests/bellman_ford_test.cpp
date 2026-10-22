#include <catch2/catch_test_macros.hpp>

#include <utility>
#include <vector>

#include "gv/algorithms.hpp"
#include "test_helpers.hpp"

using EdgeList = std::vector<std::pair<int, int>>;

namespace {

EdgeList edgesOfType(const gv::Steps& steps, gv::StepType type) {
    EdgeList edges;
    for (const auto& s : stepsOfType(steps, type)) edges.emplace_back(s.node, s.target);
    return edges;
}

// Dirigido: 0->1 (4), 0->2 (5), 2->1 (-3), 1->3 (3). El camino bueno a 3 pasa
// por la arista negativa: 0->2->1->3 = 5.
void buildNegativeEdge(gv::Grafo& g) {
    g.agregarArista(0, 1, 4);
    g.agregarArista(0, 2, 5);
    g.agregarArista(2, 1, -3);
    g.agregarArista(1, 3, 3);
}

} // namespace

TEST_CASE("Bellman-Ford aprovecha las aristas negativas") {
    gv::Grafo g(4);
    buildNegativeEdge(g);
    auto steps = gv::bellmanFord(g, 0, 3);

    CHECK(edgesOfType(steps, gv::StepType::PathEdge) == EdgeList{{0, 2}, {2, 1}, {1, 3}});
    CHECK(stepsOfType(steps, gv::StepType::PathEdge).back().value == 5.0);
    CHECK(stepsOfType(steps, gv::StepType::NegativeCycle).empty());
}

TEST_CASE("con aristas negativas Dijkstra se equivoca y Bellman-Ford no") {
    gv::Grafo g(4);
    buildNegativeEdge(g);

    // Dijkstra cierra 1 con distancia 4 antes de ver la arista 2->1.
    auto dijkstraPath = stepsOfType(gv::dijkstra(g, 0, 3), gv::StepType::PathEdge);
    CHECK(dijkstraPath.back().value == 7.0);
    CHECK(stepsOfType(gv::bellmanFord(g, 0, 3), gv::StepType::PathEdge).back().value == 5.0);
}

TEST_CASE("Bellman-Ford sin pesos negativos coincide con Dijkstra") {
    gv::Grafo g(4);
    g.agregarAristaNoDirigida(0, 1, 1);
    g.agregarAristaNoDirigida(1, 2, 1);
    g.agregarAristaNoDirigida(0, 2, 5);
    g.agregarAristaNoDirigida(2, 3, 2);

    CHECK(edgesOfType(gv::bellmanFord(g, 0, 3), gv::StepType::PathEdge) ==
          edgesOfType(gv::dijkstra(g, 0, 3), gv::StepType::PathEdge));
}

TEST_CASE("Bellman-Ford detecta un ciclo negativo y termina") {
    // 0->1 (1), ciclo 1->2 (2), 2->3 (-4), 3->1 (1) de peso -1, y 3->4 (2).
    gv::Grafo g(5);
    g.agregarArista(0, 1, 1);
    g.agregarArista(1, 2, 2);
    g.agregarArista(2, 3, -4);
    g.agregarArista(3, 1, 1);
    g.agregarArista(3, 4, 2);

    auto steps = gv::bellmanFord(g, 0, 4);
    auto cycle = edgesOfType(steps, gv::StepType::NegativeCycle);

    REQUIRE(cycle.size() == 3);
    // Es el ciclo 1 -> 2 -> 3 -> 1, empiece donde empiece.
    for (std::size_t i = 0; i < cycle.size(); ++i) {
        CHECK(cycle[i].second == cycle[(i + 1) % cycle.size()].first);
        CHECK(cycle[i].first >= 1);
        CHECK(cycle[i].first <= 3);
    }
    CHECK(stepsOfType(steps, gv::StepType::PathEdge).empty());
}

TEST_CASE("una arista negativa no dirigida ya es un ciclo negativo") {
    gv::Grafo g(2);
    g.agregarAristaNoDirigida(0, 1, -1);

    CHECK(edgesOfType(gv::bellmanFord(g, 0), gv::StepType::NegativeCycle).size() == 2);
}

TEST_CASE("un ciclo negativo inalcanzable no afecta al resultado") {
    gv::Grafo g(4);
    g.agregarArista(0, 1, 2);
    g.agregarArista(2, 3, -5);
    g.agregarArista(3, 2, 1);

    auto steps = gv::bellmanFord(g, 0, 1);
    CHECK(stepsOfType(steps, gv::StepType::NegativeCycle).empty());
    CHECK(visitOrder(steps) == std::vector<int>{0, 1});
}
