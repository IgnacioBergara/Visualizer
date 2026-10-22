#pragma once

#include <stdexcept>

namespace gv {

// TAD MFSet (union-find) con compresión de caminos y unión por altura.
// Los elementos son enteros 0..n-1.
class DisjointSet {
    int* parent;
    int* height;
    int size;

    void validar(int x) const {
        if (x < 0 || x >= size) throw std::out_of_range("elemento inexistente");
    }

public:
    explicit DisjointSet(int n) : size(n) {
        if (n <= 0) throw std::invalid_argument("el tamaño debe ser positivo");
        parent = new int[n];
        height = new int[n];
        for (int i = 0; i < n; i++) {
            parent[i] = i;
            height[i] = 0;
        }
    }
    ~DisjointSet() { delete[] parent; delete[] height; }
    DisjointSet(const DisjointSet&) = delete;
    DisjointSet& operator=(const DisjointSet&) = delete;

    int find(int x) {
        validar(x);
        if (parent[x] == x) return x;
        // Path compression:
        parent[x] = find(parent[x]);
        return parent[x];
    }

    // Une los conjuntos de x e y. Devuelve false si ya estaban en el mismo.
    bool merge(int x, int y) {
        int xRoot = find(x);
        int yRoot = find(y);
        if (xRoot == yRoot) return false;

        // Union by rank: el árbol más bajo cuelga del más alto.
        if (height[xRoot] < height[yRoot]) {
            parent[xRoot] = yRoot;
        } else if (height[xRoot] > height[yRoot]) {
            parent[yRoot] = xRoot;
        } else {
            parent[yRoot] = xRoot;
            height[xRoot]++;
        }
        return true;
    }
};

} // namespace gv
