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
        return res.status(400).json({
          success: false,
          message: "Missing coordinates"
        });
      }
  
      const fromNode = await nodeModel.findNearestNode(parseFloat(from_lat), parseFloat(from_lon));
      const toNode = await nodeModel.findNearestNode(parseFloat(to_lat), parseFloat(to_lon));
  
      //  Fallback jika node tidak ditemukan atau terlalu jauh
      if (!fromNode || !toNode || fromNode.distance > 50 || toNode.distance > 50) {
        return res.status(404).json({
          success: false,
          message: "No nearby node found — check if coordinates are too far from the network"
        });
      }
  
      const edges = await edgeModel.getAllEdges();
  
      // Bentuk graph (dua arah)
      const graph = {};
      edges.forEach(edge => {
        if (!graph[edge.from_node]) graph[edge.from_node] = [];
        if (!graph[edge.to_node]) graph[edge.to_node] = [];
  
        graph[edge.from_node].push({ node: edge.to_node, weight: edge.distance });
        graph[edge.to_node].push({ node: edge.from_node, weight: edge.distance }); // arah balik
      });
  
      // virtual edge dari titik awal (from)
      const nearestEdgeFrom = await edgeModel.findNearestEdge(
        parseFloat(from_lat),
        parseFloat(from_lon),
        fromNode.node_id
      );
  
      let virtualFromEdge = null;
      if (nearestEdgeFrom) {
        const {
          from_node,
          to_node,
          nearest_lon,
          nearest_lat,
          dist_to_from,
          dist_to_to
        } = nearestEdgeFrom;
  
        const virtualFromId = -1000; 
  
        graph[virtualFromId] = [
          { node: from_node, weight: dist_to_from },
          { node: to_node, weight: dist_to_to }
        ];
        
  
        if (!graph[from_node]) graph[from_node] = []; // arah balik
        if (!graph[to_node]) graph[to_node] = [];
  
        graph[from_node].push({ node: virtualFromId, weight: dist_to_from });
        graph[to_node].push({ node: virtualFromId, weight: dist_to_to });
  
        virtualFromEdge = {
          from_node: virtualFromId,
          to_node: from_node,
          distance: dist_to_from,
          geometry: {
            type: "LineString",
            coordinates: [
              [parseFloat(from_lon), parseFloat(from_lat)],
              [nearest_lon, nearest_lat]
            ]
          }
        };
      }
  
      // virtual edge ke titik tujuan (to)
      const nearestEdgeTo = await edgeModel.findNearestEdge(
        parseFloat(to_lat),
        parseFloat(to_lon),
        toNode.node_id
      );
  
      let virtualToEdge = null;
      if (nearestEdgeTo) {
        const {
          from_node,
          to_node,
          nearest_lon,
          nearest_lat,
          dist_to_from,
          dist_to_to
        } = nearestEdgeTo;
  
        const virtualToId = -9999; 
  
        graph[virtualToId] = [
          { node: from_node, weight: dist_to_from },
          { node: to_node, weight: dist_to_to }
        ];
  
        if (!graph[from_node]) graph[from_node] = [];
        if (!graph[to_node]) graph[to_node] = [];
  
        graph[from_node].push({ node: virtualToId, weight: dist_to_from });
        graph[to_node].push({ node: virtualToId, weight: dist_to_to });
  
        virtualToEdge = {
          from_node: to_node,
          to_node: virtualToId,
          distance: dist_to_to,
          geometry: {
            type: "LineString",
            coordinates: [
              [nearest_lon, nearest_lat],
              [parseFloat(to_lon), parseFloat(to_lat)]
            ]
          }
        };
      }
  
      const startNodeId = virtualFromEdge ? -1000 : parseInt(fromNode.node_id);
      const endNodeId = virtualToEdge ? -9999 : parseInt(toNode.node_id);
  
      const { path, totalDistance } = dijkstra(graph, startNodeId, endNodeId);
  
      if (path.length < 2) {
        return res.status(404).json({
          success: false,
          message: "No path found between points"
        });
      }
  
      const coords = await nodeModel.getCoordinateById(path);
  
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
  
      // Tambahkan virtual edge awal dan akhir
      if (virtualFromEdge) edgeSegments.unshift(virtualFromEdge);
      if (virtualToEdge) edgeSegments.push(virtualToEdge);

      const geoJson = {
        type: "FeatureCollection",
        features: edgeSegments.map(segment => ({
          type: "Feature",
          properties: {
            from_node: segment.from_node,
            to_node: segment.to_node,
            distance: segment.distance
          },
          geometry: segment.geometry
        }))
      };
  
      res.json({
        success: true,
        message: "Shortest path found",
        total_distance:
          totalDistance +
          (virtualFromEdge ? virtualFromEdge.distance : 0) +
          (virtualToEdge ? virtualToEdge.distance : 0),
        path_nodes: path,
        geojson: geoJson
      });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: "Server error"
      });
    }
  };
  
  
  
  

module.exports = {snapToNearest, shortestPath};