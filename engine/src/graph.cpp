#include "gv/graph.hpp"

#include <stdexcept>
#include <string>

namespace gv {

Graph::Graph(int nodeCount, bool directed)
    : directed_(directed), adj_(nodeCount < 0 ? 0 : nodeCount) {}

int Graph::addNode() {
    adj_.emplace_back();
    return size() - 1;
}

void Graph::addEdge(int from, int to, double weight) {
    checkNode(from);
    checkNode(to);
    adj_[from].push_back({to, weight});
    if (!directed_ && from != to) {
        adj_[to].push_back({from, weight});
    }
}

const std::vector<Edge>& Graph::neighbors(int node) const {
    checkNode(node);
    return adj_[node];
}

void Graph::checkNode(int node) const {
    if (node < 0 || node >= size()) {
        throw std::out_of_range("nodo inexistente: " + std::to_string(node));
    }
}

} // namespace gv
