#include <catch2/catch_test_macros.hpp>

#include <utility>
#include <vector>

#include "gv/algorithms.hpp"
#include "test_helpers.hpp"

using EdgeList = std::vector<std::pair<int, int>>;

namespace {

double treeWeight(const gv::Steps& steps) {
    double total = 0;
    for (const auto& s : stepsOfType(steps, gv::StepType::PathEdge)) total += s.value;
    return total;
}

EdgeList treeEdges(const gv::Steps& steps) {
    EdgeList edges;
    for (const auto& s : stepsOfType(steps, gv::StepType::PathEdge)) edges.emplace_back(s.node, s.target);
    return edges;
}

} // namespace

TEST_CASE("Prim encuentra el árbol de cubrimiento mínimo") {
    gv::Grafo g(5);
    g.agregarAristaNoDirigida(0, 1, 2);
    g.agregarAristaNoDirigida(0, 3, 6);
    g.agregarAristaNoDirigida(1, 2, 3);
    g.agregarAristaNoDirigida(1, 3, 8);
    g.agregarAristaNoDirigida(1, 4, 5);
    g.agregarAristaNoDirigida(2, 4, 7);
    g.agregarAristaNoDirigida(3, 4, 9);

    auto steps = gv::prim(g, 0);
    CHECK(treeEdges(steps) == EdgeList{{0, 1}, {1, 2}, {1, 4}, {0, 3}});
    CHECK(treeWeight(steps) == 16.0);
}

TEST_CASE("Prim conecta por la arista más barata, no por el camino más corto") {
    // 0-1 (1), 1-2 (1), 0-2 (1.5): Dijkstra llega a 2 directo desde 0,
    // Prim lo cuelga de 1 porque esa arista es más barata.
    gv::Grafo g(3);
    g.agregarAristaNoDirigida(0, 1, 1.0);
    g.agregarAristaNoDirigida(1, 2, 1.0);
    g.agregarAristaNoDirigida(0, 2, 1.5);

    CHECK(treeEdges(gv::prim(g, 0)) == EdgeList{{0, 1}, {1, 2}});
    CHECK(stepsOfType(gv::dijkstra(g, 0, 2), gv::StepType::PathEdge).size() == 1);
}

TEST_CASE("Prim solo cubre la componente del origen") {
    gv::Grafo g(4);
    g.agregarAristaNoDirigida(0, 1, 1.0);
    g.agregarAristaNoDirigida(2, 3, 1.0);

    auto steps = gv::prim(g, 0);
    CHECK(treeEdges(steps) == EdgeList{{0, 1}});
    CHECK(visitOrder(steps) == std::vector<int>{0, 1});
}
