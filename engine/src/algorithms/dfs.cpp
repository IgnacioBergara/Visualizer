#include "gv/algorithms.hpp"

namespace gv {

namespace {

void visit(const Graph& graph, int u, std::vector<bool>& seen, Steps& steps) {
    seen[u] = true;
    steps.push_back({StepType::Visit, u});

    for (const Edge& e : graph.neighbors(u)) {
        steps.push_back({StepType::ExploreEdge, u, e.to, e.weight});
        if (!seen[e.to]) {
            steps.push_back({StepType::Discover, u, e.to});
            visit(graph, e.to, seen, steps);
        }
    }
    steps.push_back({StepType::Finish, u});
}

} // namespace

Steps dfs(const Graph& graph, int source) {
    Steps steps;
    std::vector<bool> seen(graph.size(), false);
    steps.push_back({StepType::Discover, -1, source});
    visit(graph, source, seen, steps);
    return steps;
}

} // namespace gv
