#pragma once

#include <vector>

namespace gv {

struct Edge {
    int to;
    double weight;
};

// Grafo con lista de adyacencia. Los nodos son enteros 0..size()-1.
class Graph {
public:
    explicit Graph(int nodeCount = 0, bool directed = false);

    int addNode();
    void addEdge(int from, int to, double weight = 1.0);

    int size() const { return static_cast<int>(adj_.size()); }
    bool directed() const { return directed_; }
    const std::vector<Edge>& neighbors(int node) const;

private:
    void checkNode(int node) const;

    bool directed_;
    std::vector<std::vector<Edge>> adj_;
};

} // namespace gv
