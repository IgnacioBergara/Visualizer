#include <catch2/catch_test_macros.hpp>

#include "gv/algorithms.hpp"
#include "test_helpers.hpp"

using Order = std::vector<int>;

TEST_CASE("BFS visita por niveles") {
    // 0 -> {1, 2}, 1 -> 3, 2 -> 4
    gv::Graph g(5);
    g.addEdge(0, 1);
    g.addEdge(0, 2);
    g.addEdge(1, 3);
    g.addEdge(2, 4);

    CHECK(visitOrder(gv::bfs(g, 0)) == Order{0, 1, 2, 3, 4});
}

TEST_CASE("BFS no sale de la componente del origen") {
    gv::Graph g(4);
    g.addEdge(0, 1);
    g.addEdge(2, 3);

    CHECK(visitOrder(gv::bfs(g, 2)) == Order{2, 3});
}

TEST_CASE("BFS descubre cada nodo una sola vez aunque haya ciclos") {
    gv::Graph g(3);
    g.addEdge(0, 1);
    g.addEdge(1, 2);
    g.addEdge(2, 0);

    CHECK(stepsOfType(gv::bfs(g, 0), gv::StepType::Discover).size() == 3);
}
