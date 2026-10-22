#include "gv/algorithms.hpp"

#include <queue>

namespace gv {

Steps bfs(const Graph& graph, int source) {
    Steps steps;
    std::vector<bool> seen(graph.size(), false);
    std::queue<int> frontier;

    seen[source] = true;
    frontier.push(source);
    steps.push_back({StepType::Discover, -1, source});

    while (!frontier.empty()) {
        int u = frontier.front();
        frontier.pop();
        steps.push_back({StepType::Visit, u});

        for (const Edge& e : graph.neighbors(u)) {
            steps.push_back({StepType::ExploreEdge, u, e.to, e.weight});
            if (!seen[e.to]) {
                seen[e.to] = true;
                frontier.push(e.to);
                steps.push_back({StepType::Discover, u, e.to});
            }
        }
        steps.push_back({StepType::Finish, u});
    }
    return steps;
}

} // namespace gv
