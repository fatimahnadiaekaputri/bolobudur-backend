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

    if (!fromNode || !toNode || fromNode.distance > 50 || toNode.distance > 50) {
      return res.status(404).json({
        success: false,
        message: "No nearby node found — check if coordinates are too far from the network"
      });
    }

    const edges = await edgeModel.getAllEdges();

    // Build graph
    const graph = {};
    edges.forEach(edge => {
      if (!graph[edge.from_node]) graph[edge.from_node] = [];
      if (!graph[edge.to_node]) graph[edge.to_node] = [];

      graph[edge.from_node].push({ node: edge.to_node, weight: edge.distance });
      graph[edge.to_node].push({ node: edge.from_node, weight: edge.distance });
    });

    // --- virtual edge from start ---
    const nearestEdgeFrom = await edgeModel.findNearestEdge(
      parseFloat(from_lat),
      parseFloat(from_lon),
      fromNode.node_id
    );

    let virtualFromEdge = null;
    let virtualFromId = -1000;
    // store nearest point for later coordinate stitching
    let virtualFromNearest = null;

    if (nearestEdgeFrom) {
      const {
        from_node,
        to_node,
        nearest_lon,
        nearest_lat,
        dist_to_from,
        dist_to_to
      } = nearestEdgeFrom;

      graph[virtualFromId] = [
        { node: from_node, weight: dist_to_from },
        { node: to_node, weight: dist_to_to }
      ];

      if (!graph[from_node]) graph[from_node] = [];
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
            [parseFloat(from_lon), parseFloat(from_lat)], // user -> nearest point
            [nearest_lon, nearest_lat]
          ]
        }
      };

      virtualFromNearest = {
        nearest_lon,
        nearest_lat,
        attached_node: from_node // the real node this virtual edge attaches to
      };
    }

    // --- virtual edge to destination ---
    const nearestEdgeTo = await edgeModel.findNearestEdge(
      parseFloat(to_lat),
      parseFloat(to_lon),
      toNode.node_id
    );

    let virtualToEdge = null;
    let virtualToId = -9999;
    let virtualToNearest = null;

    if (nearestEdgeTo) {
      const {
        from_node,
        to_node,
        nearest_lon,
        nearest_lat,
        dist_to_from,
        dist_to_to
      } = nearestEdgeTo;

      graph[virtualToId] = [
        { node: from_node, weight: dist_to_from },
        { node: to_node, weight: dist_to_to }
      ];

      if (!graph[from_node]) graph[from_node] = [];
      if (!graph[to_node]) graph[to_node] = [];

      graph[from_node].push({ node: virtualToId, weight: dist_to_from });
      graph[to_node].push({ node: virtualToId, weight: dist_to_to });

      // note: attach virtualTo to the 'to_node' side for consistency with earlier code
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

      virtualToNearest = {
        nearest_lon,
        nearest_lat,
        attached_node: to_node // the real node this virtual edge attaches to
      };
    }

    const startNodeId = virtualFromEdge ? virtualFromId : parseInt(fromNode.node_id);
    const endNodeId = virtualToEdge ? virtualToId : parseInt(toNode.node_id);

    const { path, totalDistance } = dijkstra(graph, startNodeId, endNodeId);

    if (!path || path.length < 2) {
      return res.status(404).json({
        success: false,
        message: "No path found between points"
      });
    }

    const coords = await nodeModel.getCoordinateById(path); // array of { node_id, latitude, longitude }

    // Build edgeSegments but stitch coordinates if adjacent to virtual edges
    const edgeSegments = [];
    for (let i = 0; i < path.length - 1; i++) {
      const fromNodeId = path[i];
      const toNodeId = path[i + 1];

      // find edge metadata (real edges only)
      const edgeData = edges.find(e =>
        (e.from_node === fromNodeId && e.to_node === toNodeId) ||
        (e.from_node === toNodeId && e.to_node === fromNodeId)
      );

      const fromCoord = coords.find(c => parseInt(c.node_id) === fromNodeId);
      const toCoord = coords.find(c => parseInt(c.node_id) === toNodeId);

      // Skip if neither edgeData nor virtual adjacency match (but usually fine)
      if (!edgeData || !fromCoord || !toCoord) {
        // If this segment involves a virtual node directly (e.g., virtualFromId -> realNode),
        // it will be handled by virtualFromEdge/virtualToEdge added later. Continue.
        continue;
      }

      // Determine actual start and end coordinates, but override when needed:
      let startLon = parseFloat(fromCoord.longitude);
      let startLat = parseFloat(fromCoord.latitude);
      let endLon = parseFloat(toCoord.longitude);
      let endLat = parseFloat(toCoord.latitude);

      // If this segment starts at the node that virtualFrom attaches to, replace start with nearest point
      if (virtualFromNearest && fromNodeId === virtualFromNearest.attached_node) {
        // We expect virtualFromEdge was unshifted earlier; we want the segment after virtualFrom to start from nearest point
        startLon = parseFloat(virtualFromNearest.nearest_lon);
        startLat = parseFloat(virtualFromNearest.nearest_lat);
      }

      // If this segment ends at the node that virtualTo attaches to, replace end with nearest point
      if (virtualToNearest && toNodeId === virtualToNearest.attached_node) {
        endLon = parseFloat(virtualToNearest.nearest_lon);
        endLat = parseFloat(virtualToNearest.nearest_lat);
      }

      edgeSegments.push({
        from_node: fromNodeId,
        to_node: toNodeId,
        distance: edgeData.distance,
        geometry: {
          type: "LineString",
          coordinates: [
            [startLon, startLat],
            [endLon, endLat]
          ]
        }
      });
    }

    // Now add virtual edge at start & end (so order is correct)
    if (virtualFromEdge) edgeSegments.unshift(virtualFromEdge);
    if (virtualToEdge) edgeSegments.push(virtualToEdge);

    // Build geojson
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