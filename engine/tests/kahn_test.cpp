#include <catch2/catch_test_macros.hpp>

#include <vector>

#include "gv/algorithms.hpp"
#include "test_helpers.hpp"

using Order = std::vector<int>;

namespace {

Order outputOrder(const gv::Steps& steps) {
    Order order;
    for (const auto& s : stepsOfType(steps, gv::StepType::Output)) order.push_back(s.node);
    return order;
}

Order blockedNodes(const gv::Steps& steps) {
    Order nodes;
    for (const auto& s : stepsOfType(steps, gv::StepType::Blocked)) nodes.push_back(s.node);
    return nodes;
}

} // namespace

TEST_CASE("Kahn ordena respetando todas las dependencias") {
    // 0 -> 2, 1 -> 2, 1 -> 3, 2 -> 4, 3 -> 4
    gv::Grafo g(5);
    g.agregarArista(0, 2);
    g.agregarArista(1, 2);
    g.agregarArista(1, 3);
    g.agregarArista(2, 4);
    g.agregarArista(3, 4);

    auto steps = gv::topologicalSortKahn(g);
    CHECK(outputOrder(steps) == Order{0, 1, 2, 3, 4});
    CHECK(blockedNodes(steps).empty());
}

TEST_CASE("Kahn arranca por los nodos sin dependencias en orden de índice") {
    // 2 -> 0: el 1 está aislado y también tiene grado 0.
    gv::Grafo g(3);
    g.agregarArista(2, 0);

    CHECK(outputOrder(gv::topologicalSortKahn(g)) == Order{1, 2, 0});
}

TEST_CASE("Kahn informa los grados de entrada") {
    gv::Grafo g(3);
    g.agregarArista(0, 2);
    g.agregarArista(1, 2);

    auto values = stepsOfType(gv::topologicalSortKahn(g), gv::StepType::SetValue);
    REQUIRE(values.size() >= 3);
    CHECK(values[2].node == 2);
    CHECK(values[2].value == 2.0); // grado inicial de 2
    CHECK(values.back().node == 2);
    CHECK(values.back().value == 0.0); // tras procesar 0 y 1
}

TEST_CASE("Kahn detecta un ciclo y marca lo que no pudo ordenar") {
    // 0 -> 1 -> 2 -> 1 (ciclo 1-2) y 2 -> 3, que depende del ciclo.
    gv::Grafo g(4);
    g.agregarArista(0, 1);
    g.agregarArista(1, 2);
    g.agregarArista(2, 1);
    g.agregarArista(2, 3);

    auto steps = gv::topologicalSortKahn(g);
    CHECK(outputOrder(steps) == Order{0});
    CHECK(blockedNodes(steps) == Order{1, 2, 3});
}

TEST_CASE("Kahn con aristas repetidas descuenta cada una") {
    gv::Grafo g(2);
    g.agregarArista(0, 1);
    g.agregarArista(0, 1);

    CHECK(outputOrder(gv::topologicalSortKahn(g)) == Order{0, 1});
}
