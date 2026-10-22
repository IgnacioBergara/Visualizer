#include <catch2/catch_test_macros.hpp>

#include "gv/algorithms.hpp"
#include "test_helpers.hpp"

using Order = std::vector<int>;

TEST_CASE("DFS baja por una rama antes de pasar a la siguiente") {
    // 0 -> {1, 2}, 1 -> 3, 2 -> 4
    gv::Grafo g(5);
    g.agregarAristaNoDirigida(0, 1);
    g.agregarAristaNoDirigida(0, 2);
    g.agregarAristaNoDirigida(1, 3);
    g.agregarAristaNoDirigida(2, 4);

    CHECK(visitOrder(gv::dfs(g, 0)) == Order{0, 1, 3, 2, 4});
}

TEST_CASE("DFS termina los nodos en orden inverso a la pila") {
    gv::Grafo g(3);
    g.agregarArista(0, 1);
    g.agregarArista(1, 2);

    Order finished;
    for (const auto& s : stepsOfType(gv::dfs(g, 0), gv::StepType::Finish)) {
        finished.push_back(s.node);
    }
    CHECK(finished == Order{2, 1, 0});
}
