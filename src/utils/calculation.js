function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // radius bumi (meter)
    const toRad = deg => (deg * Math.PI) / 180;
  
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);
  
    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
    return R * c; // hasil meter
}

function diagonalDistance(baseDistance, height) {
  return Math.sqrt(baseDistance ** 2 + height ** 2);
}

function dijkstra(graph, start, end) {
  const distances = {};
  const previous = {};
  const nodes = new Set(Object.keys(graph).map(Number));

  for (let node of nodes) distances[node] = Infinity;
  distances[start] = 0;

  while (nodes.size) {
    let smallest = [...nodes].reduce((a, b) =>
      distances[a] < distances[b] ? a : b
    );
    nodes.delete(smallest);

    if (smallest === end) {
      const path = [];
      let temp = end;
      while (previous[temp]) {
        path.push(temp);
        temp = previous[temp];
      }
      path.push(start);
      return {path: path.reverse(), totalDistance: distances[end]};
    }

    if (!graph[smallest]) continue;

    for (let neighbor of graph[smallest]) {
      let alt = distances[smallest] + neighbor.weight;
      if (alt < distances[neighbor.node]) {
        distances[neighbor.node] = alt;
        previous[neighbor.node] = smallest;
      }
    }
  }

  return {path: [], totalDistance: Infinity};
}

module.exports = { haversineDistance, diagonalDistance, dijkstra };
  