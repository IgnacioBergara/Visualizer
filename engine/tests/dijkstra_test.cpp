#include <catch2/catch_test_macros.hpp>

#include <utility>

#include "gv/algorithms.hpp"
#include "test_helpers.hpp"

namespace {

// 0-1 (peso 1), 1-2 (peso 1) y el atajo 0-2 (peso 5).
gv::Graph triangle() {
    gv::Graph g(3);
    g.addEdge(0, 1, 1.0);
    g.addEdge(1, 2, 1.0);
    g.addEdge(0, 2, 5.0);
    return g;
}

} // namespace

TEST_CASE("Dijkstra prefiere el camino más barato aunque tenga más aristas") {
    auto path = stepsOfType(gv::dijkstra(triangle(), 0, 2), gv::StepType::PathEdge);

    REQUIRE(path.size() == 2);
    CHECK(std::pair{path[0].node, path[0].target} == std::pair{0, 1});
    CHECK(std::pair{path[1].node, path[1].target} == std::pair{1, 2});
    CHECK(path[1].value == 2.0);
}

TEST_CASE("Dijkstra visita los nodos en orden de distancia") {
    CHECK(visitOrder(gv::dijkstra(triangle(), 0)) == std::vector<int>{0, 1, 2});
}

TEST_CASE("Dijkstra se detiene al llegar al destino") {
    gv::Graph g(4);
    g.addEdge(0, 1, 1.0);
    g.addEdge(1, 2, 1.0);
    g.addEdge(2, 3, 1.0);

    CHECK(visitOrder(gv::dijkstra(g, 0, 1)) == std::vector<int>{0, 1});
}

TEST_CASE("Dijkstra no emite camino si el destino es inalcanzable") {
    gv::Graph g(3);
    g.addEdge(0, 1, 1.0);

    CHECK(stepsOfType(gv::dijkstra(g, 0, 2), gv::StepType::PathEdge).empty());
}
