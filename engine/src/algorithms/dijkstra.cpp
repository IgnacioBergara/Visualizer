#include "gv/algorithms.hpp"

#include <functional>
#include <limits>
#include <queue>
#include <utility>

namespace gv {

Steps dijkstra(const Graph& graph, int source, int target) {
    constexpr double inf = std::numeric_limits<double>::infinity();
    using Entry = std::pair<double, int>; // (distancia, nodo)

    Steps steps;
    std::vector<double> dist(graph.size(), inf);
    std::vector<int> prev(graph.size(), -1);
    std::vector<bool> done(graph.size(), false);
    std::priority_queue<Entry, std::vector<Entry>, std::greater<>> frontier;

    dist[source] = 0.0;
    frontier.push({0.0, source});
    steps.push_back({StepType::Relax, -1, source, 0.0});

    while (!frontier.empty()) {
        auto [d, u] = frontier.top();
        frontier.pop();
        if (done[u]) continue; // entrada obsoleta de la cola
        done[u] = true;
        steps.push_back({StepType::Visit, u, -1, d});
        if (u == target) break;

        for (const Edge& e : graph.neighbors(u)) {
            if (done[e.to]) continue;
            steps.push_back({StepType::ExploreEdge, u, e.to, e.weight});
            double candidate = d + e.weight;
            if (candidate < dist[e.to]) {
                dist[e.to] = candidate;
                prev[e.to] = u;
                frontier.push({candidate, e.to});
                steps.push_back({StepType::Relax, u, e.to, candidate});
            }
        }
        steps.push_back({StepType::Finish, u, -1, d});
    }

    if (target >= 0 && prev[target] != -1) {
        std::vector<int> path;
        for (int v = target; v != -1; v = prev[v]) path.push_back(v);
        for (auto i = path.size() - 1; i > 0; --i) {
            steps.push_back({StepType::PathEdge, path[i], path[i - 1], dist[path[i - 1]]});
        }
    }
    return steps;
}

} // namespace gv
