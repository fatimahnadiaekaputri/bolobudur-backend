const nodeModel = require('../models/nodeModel');
const edgeModel = require('../models/edgeModel');
const { dijkstra } = require('../utils/calculation');

const snapToNearest = async (req, res) => {
    try {
        const {lat, lon} = req.query;
        const nearestNode = await nodeModel.findNearestNode(lat, lon);

        res.json({
            success: true,
            message: 'Nearest node found',
            data: nearestNode
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({success: false, message: 'Server error'});
    }
};

const shortestPath = async (req, res) => {
    try {
      const { from_lat, from_lon, to_lat, to_lon } = req.query;
  
      if (!from_lat || !from_lon || !to_lat || !to_lon) {
        return res.status(400).json({ success: false, message: "Missing coordinates" });
      }
  
      const fromNode = await nodeModel.findNearestNode(parseFloat(from_lat), parseFloat(from_lon));
      const toNode = await nodeModel.findNearestNode(parseFloat(to_lat), parseFloat(to_lon));

      const edges = await edgeModel.getAllEdges();
  
      // entuk graph (dua arah)
      const graph = {};
      edges.forEach(edge => {
        if (!graph[edge.from_node]) graph[edge.from_node] = [];
        if (!graph[edge.to_node]) graph[edge.to_node] = [];
  
        graph[edge.from_node].push({ node: edge.to_node, weight: edge.distance });
        graph[edge.to_node].push({ node: edge.from_node, weight: edge.distance }); // arah bolak balik
      });
  
      const { path, totalDistance } = dijkstra(graph, parseInt(fromNode.node_id), parseInt(toNode.node_id));
  
      if (path.length < 2) {
        return res.status(404).json({ success: false, message: "No path found" });
      }
  
      const coords = await nodeModel.getCoordinateById(path);
  
      // virtual edge di depan POI
      const lastNodeId = path[path.length - 1];
  
      const nearestEdgeToPOI = await edgeModel.findNearestEdge(
        parseFloat(to_lat),
        parseFloat(to_lon),
        lastNodeId
      );
  
      let virtualEdge = null;
  
      if (nearestEdgeToPOI) {
        const {
          from_node,
          to_node,
          nearest_lon,
          nearest_lat,
          dist_to_from,
          dist_to_to
        } = nearestEdgeToPOI;

        const virtualNodeId = -9999;
  
        // node virtual ke graph (sementara)
        graph[virtualNodeId] = [
          { node: from_node, weight: dist_to_from },
          { node: to_node, weight: dist_to_to }
        ];
  
        // arah balik
        if (!graph[from_node]) graph[from_node] = [];
        if (!graph[to_node]) graph[to_node] = [];
  
        graph[from_node].push({ node: virtualNodeId, weight: dist_to_from });
        graph[to_node].push({ node: virtualNodeId, weight: dist_to_to });
  
        // simpan virtual edge info 
        virtualEdge = {
          from_node: lastNodeId,
          to_node: virtualNodeId,
          distance: Math.min(dist_to_from, dist_to_to),
          geometry: {
            type: "LineString",
            coordinates: [
              [
                coords.find(c => c.node_id === lastNodeId).longitude,
                coords.find(c => c.node_id === lastNodeId).latitude
              ],
              [nearest_lon, nearest_lat]
            ]
          }
        };
      }
  
      // Bentuk segmen hasil jalur utama
      const edgeSegments = [];
      for (let i = 0; i < path.length - 1; i++) {
        const fromNode = path[i];
        const toNode = path[i + 1];
  
        const edgeData = edges.find(e =>
          (e.from_node === fromNode && e.to_node === toNode) ||
          (e.from_node === toNode && e.to_node === fromNode)
        );
  
        const fromCoord = coords.find(c => c.node_id === fromNode);
        const tooCoord = coords.find(c => c.node_id === toNode);
  
        if (fromCoord && tooCoord && edgeData) {
          edgeSegments.push({
            from_node: fromNode,
            to_node: toNode,
            distance: edgeData.distance,
            geometry: {
              type: "LineString",
              coordinates: [
                [fromCoord.longitude, fromCoord.latitude],
                [tooCoord.longitude, tooCoord.latitude]
              ]
            }
          });
        }
      }
  
      // Tambahkan virtual edge terakhir (ke depan POI)
      if (virtualEdge) edgeSegments.push(virtualEdge);
  
      res.json({
        success: true,
        message: "Shortest path found",
        total_distance: totalDistance + (virtualEdge ? virtualEdge.distance : 0),
        path_nodes: path.concat(virtualEdge ? [-999] : []),
        geojson: edgeSegments
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  };
  
  
  

module.exports = {snapToNearest, shortestPath};