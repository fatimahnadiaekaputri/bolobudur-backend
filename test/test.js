const nodeModel = require('../src/models/nodeModel');
const edgeModel = require('../src/models/edgeModel');
const { dijkstra } = require('../src/utils/calculation');

const testShortestPath = async (startLat, startLon, endLat, endLon) => {
  try {
    // 1. Snap ke node terdekat untuk start & end
    const startNode = await nodeModel.findNearestNode(startLat, startLon);
    const endNode = await nodeModel.findNearestNode(endLat, endLon);

    if (!startNode || !endNode) {
      console.log("Start or end node not found");
      return;
    }

    // 2. Ambil semua node & edge dari DB
    const nodes = await nodeModel.getAll();
    const edges = await edgeModel.getAllEdges();

    // 3. Build graph
    const graph = {};
    nodes.forEach(n => graph[n.node_id] = []);
    edges.forEach(e => {
      const factor = e.type === 'stair' ? 5 : 1; // sesuai logika tangga
      const weight = e.distance * factor;

      if (!graph[e.from_node]) graph[e.from_node] = [];
      if (!graph[e.to_node]) graph[e.to_node] = [];

      graph[e.from_node].push({ node: e.to_node, weight });
      graph[e.to_node].push({ node: e.from_node, weight });
    });

    // 4. Jalankan Dijkstra
    console.time("dijkstra");
    const { path, totalDistance } = dijkstra(graph, startNode.node_id, endNode.node_id);
    console.timeEnd("dijkstra");

    if (!path || path.length === 0) {
      console.log("No path found");
      return;
    }

    let realDistance = 0;

for (let i = 0; i < path.length - 1; i++) {
  const from = path[i];
  const to = path[i + 1];

  const edge = edges.find(e =>
    (Number(e.from_node) === Number(from) && Number(e.to_node) === Number(to)) ||
    (Number(e.from_node) === Number(to) && Number(e.to_node) === Number(from))
  );

  if (edge) {
    realDistance += edge.distance; // TANPA factor
  }
}


    console.log("Path node IDs:", path);
    console.log("Total distance:", realDistance);

    // 5. (Opsional) Ambil koordinat path dari DB untuk verifikasi
    const pathNodeIds = path;
    const fullCoordsRaw = await nodeModel.getCoordinateById(pathNodeIds);
    const coordMap = new Map();
    (fullCoordsRaw || []).forEach(c => coordMap.set(Number(c.node_id), { lat: c.latitude, lon: c.longitude }));

    const pathCoords = path.map(id => coordMap.get(id) || null);
    console.log("Path coordinates:", pathCoords);

  } catch (err) {
    console.error("Error testing shortest path:", err);
  }
};

const testCases = [
    { start: [-7.607955, 110.204235], end: [-7.607957, 110.203399] }, // pintu masuk ke pintu keluar
    { start: [-7.607955, 110.204235], end: [-7.607955, 110.204068] },  // pintu masuk ke area stupa
    { start: [-7.607955, 110.204235], end: [-7.60837499107859, 110.203887490883] }, // pintu masuk ke relief lantai 1 panel 4
    { start: [-7.608376, 110.203824], end: [-7.607545, 110.20382] }, // pintu selatan ke pintu utara
    { start: [-7.607753913093191, 110.20397727429838], end: [-7.607957, 110.203399] } // random dari stupa ke pintu keluar
  ];
  
  const runAllTests = async () => {
    for (let i = 0; i < testCases.length; i++) {
      const { start, end } = testCases[i];
      console.log(`\nTest case ${i + 1}: Start ${start} -> End ${end}`);
      await testShortestPath(start[0], start[1], end[0], end[1]);
    }
  };
  
  runAllTests();
  