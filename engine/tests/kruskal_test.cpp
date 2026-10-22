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

double treeWeight(const gv::Steps& steps) {
    double total = 0;
    for (const auto& s : stepsOfType(steps, gv::StepType::PathEdge)) total += s.value;
    return total;
}

void buildClassic(gv::Grafo& g) {
    g.agregarAristaNoDirigida(0, 1, 2);
    g.agregarAristaNoDirigida(0, 3, 6);
    g.agregarAristaNoDirigida(1, 2, 3);
    g.agregarAristaNoDirigida(1, 3, 8);
    g.agregarAristaNoDirigida(1, 4, 5);
    g.agregarAristaNoDirigida(2, 4, 7);
    g.agregarAristaNoDirigida(3, 4, 9);
}

} // namespace

TEST_CASE("Kruskal agrega las aristas de menor a mayor peso") {
    gv::Grafo g(5);
    buildClassic(g);
    auto steps = gv::kruskal(g);

    CHECK(edgesOfType(steps, gv::StepType::PathEdge) == EdgeList{{0, 1}, {1, 2}, {1, 4}, {0, 3}});
    CHECK(treeWeight(steps) == 16.0);
}

TEST_CASE("Kruskal y Prim encuentran un árbol del mismo peso") {
    gv::Grafo g(5);
    buildClassic(g);
    CHECK(treeWeight(gv::kruskal(g)) == treeWeight(gv::prim(g, 0)));
}

TEST_CASE("Kruskal descarta las aristas que formarían un ciclo") {
    // Triángulo 0-1 (1), 1-2 (2), 0-2 (3): la última cierra el ciclo.
    gv::Grafo g(4);
    g.agregarAristaNoDirigida(0, 1, 1);
    g.agregarAristaNoDirigida(1, 2, 2);
    g.agregarAristaNoDirigida(0, 2, 3);
    g.agregarAristaNoDirigida(2, 3, 4);

    auto steps = gv::kruskal(g);
    CHECK(edgesOfType(steps, gv::StepType::RejectEdge) == EdgeList{{0, 2}});
    CHECK(edgesOfType(steps, gv::StepType::PathEdge) == EdgeList{{0, 1}, {1, 2}, {2, 3}});
}

TEST_CASE("Kruskal corta al tener V-1 aristas") {
    // La arista 0-3 (peso 10) nunca se llega a mirar.
    gv::Grafo g(3);
    g.agregarAristaNoDirigida(0, 1, 1);
    g.agregarAristaNoDirigida(1, 2, 2);
    g.agregarAristaNoDirigida(0, 2, 10);

    CHECK(stepsOfType(gv::kruskal(g), gv::StepType::ExploreEdge).size() == 2);
}

TEST_CASE("Kruskal en un grafo no conexo arma un bosque") {
    gv::Grafo g(4);
    g.agregarAristaNoDirigida(0, 1, 1);
    g.agregarAristaNoDirigida(2, 3, 1);

    CHECK(stepsOfType(gv::kruskal(g), gv::StepType::PathEdge).size() == 2);
}

TEST_CASE("Kruskal informa a qué conjunto pasa cada nodo") {
    gv::Grafo g(3);
    g.agregarAristaNoDirigida(0, 1, 1);
    g.agregarAristaNoDirigida(1, 2, 2);

    // Último representante informado de cada nodo: todos en el mismo conjunto.
    std::vector<double> rep(3, -1);
    for (const auto& s : stepsOfType(gv::kruskal(g), gv::StepType::SetValue)) rep[s.node] = s.value;
    CHECK(rep[0] == rep[1]);
    CHECK(rep[1] == rep[2]);
}
