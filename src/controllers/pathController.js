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

    // Validasi node
    if (!fromNode || !toNode || fromNode.distance > 50 || toNode.distance > 50) {
      return res.status(404).json({
        success: false,
        message: "No nearby node found — coordinates too far from network"
      });
    }

    const edges = await edgeModel.getAllEdges();

    // Bentuk graph dua arah
    const graph = {};
    edges.forEach(edge => {
      if (!graph[edge.from_node]) graph[edge.from_node] = [];
      if (!graph[edge.to_node]) graph[edge.to_node] = [];
      graph[edge.from_node].push({ node: edge.to_node, weight: edge.distance });
      graph[edge.to_node].push({ node: edge.from_node, weight: edge.distance });
    });

    // virtual edge untuk titik awal ke nearest node
    const virtualFromId = -1000;
    const nearestNodeFromCoord = await nodeModel.getCoordinateById([fromNode.node_id]);
    const fromNodeLat = nearestNodeFromCoord[0].latitude;
    const fromNodeLon = nearestNodeFromCoord[0].longitude;

    graph[virtualFromId] = [{ node: fromNode.node_id, weight: fromNode.distance }];
    if (!graph[fromNode.node_id]) graph[fromNode.node_id] = [];
    graph[fromNode.node_id].push({ node: virtualFromId, weight: fromNode.distance });

    const virtualFromEdge = {
      from_node: virtualFromId,
      to_node: fromNode.node_id,
      distance: fromNode.distance,
      geometry: {
        type: "LineString",
        coordinates: [
          [parseFloat(from_lon), parseFloat(from_lat)],
          [fromNodeLon, fromNodeLat]
        ]
      }
    };

    // virtual edge untuk ke nearest node titik tujuan
    const { path: prePath } = dijkstra(graph, fromNode.node_id, toNode.node_id);
    const coords = await nodeModel.getCoordinateById(prePath);
    const lastNodeId = prePath[prePath.length - 1];

    const nearestEdgeToPOI = await edgeModel.findNearestEdge(
      parseFloat(to_lat),
      parseFloat(to_lon),
      lastNodeId
    );

    let virtualToEdge = null;
    const virtualToId = -9999;

    if (nearestEdgeToPOI) {
      const {
        from_node,
        to_node,
        nearest_lon,
        nearest_lat,
        dist_to_from,
        dist_to_to
      } = nearestEdgeToPOI;

      graph[virtualToId] = [
        { node: from_node, weight: dist_to_from },
        { node: to_node, weight: dist_to_to }
      ];
      if (!graph[from_node]) graph[from_node] = [];
      if (!graph[to_node]) graph[to_node] = [];

      graph[from_node].push({ node: virtualToId, weight: dist_to_from });
      graph[to_node].push({ node: virtualToId, weight: dist_to_to });

      virtualToEdge = {
        from_node: lastNodeId,
        to_node: virtualToId,
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

   
    const { path, totalDistance } = dijkstra(graph, virtualFromId, virtualToId);

    if (path.length < 2) {
      return res.status(404).json({ success: false, message: "No path found" });
    }

    const fullCoords = await nodeModel.getCoordinateById(path);
    const edgeSegments = [];

    for (let i = 0; i < path.length - 1; i++) {
      const fromNodeId = path[i];
      const toNodeId = path[i + 1];
      const edgeData = edges.find(e =>
        (e.from_node === fromNodeId && e.to_node === toNodeId) ||
        (e.from_node === toNodeId && e.to_node === fromNodeId)
      );

      const fromCoord = fullCoords.find(c => c.node_id === fromNodeId);
      const toCoord = fullCoords.find(c => c.node_id === toNodeId);

      if (fromCoord && toCoord && edgeData) {
        edgeSegments.push({
          from_node: fromNodeId,
          to_node: toNodeId,
          distance: edgeData.distance,
          geometry: {
            type: "LineString",
            coordinates: [
              [fromCoord.longitude, fromCoord.latitude],
              [toCoord.longitude, toCoord.latitude]
            ]
          }
        });
      }
    }

    
    if (virtualFromEdge) edgeSegments.unshift(virtualFromEdge);
    if (virtualToEdge) edgeSegments.push(virtualToEdge);

    
    const geoJson = {
      type: "FeatureCollection",
      features: edgeSegments.map(seg => ({
        type: "Feature",
        properties: {
          from_node: seg.from_node,
          to_node: seg.to_node,
          distance: seg.distance
        },
        geometry: seg.geometry
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
    res.status(500).json({ success: false, message: "Server error" });
  }
};

  

module.exports = {snapToNearest, shortestPath};