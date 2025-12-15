const nodeModel = require('../models/nodeModel');
const edgeModel = require('../models/edgeModel');
const poiModel = require('../models/poiModel')
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

    const fLat = parseFloat(from_lat), fLon = parseFloat(from_lon);
    const tLat = parseFloat(to_lat), tLon = parseFloat(to_lon);

    // ----- [LOGIKA BARU: BEDA CARA CARI LANTAI] -----
    // 1. 'from_floor': "Tebak" lantai user dari NODE terdekat
    const fromFloor = await nodeModel.findNearestFloor(fLat, fLon);
    
    // 2. 'to_floor': "Cari" lantai tujuan dari POI terdekat (yang adalah POI itu sendiri)
    const toFloor = await poiModel.findNearestPoiFloor(tLat, tLon);

    // 3. Validasi
    if (fromFloor === null) {
      return res.status(404).json({ success: false, message: "Could not determine STARTING floor."});
    }
    if (toFloor === null) {
      return res.status(404).json({ success: false, message: "Could not determine DESTINATION floor from POI."});
    }
    // -------------------------------------------

    // 1. Temukan "snap-to-edge" MENGGUNAKAN LANTAI YANG BENAR
    const nearestEdgeFrom = await edgeModel.findNearestEdge(fLat, fLon, fromFloor);
    const nearestEdgeTo = await edgeModel.findNearestEdge(tLat, tLon, toFloor);

    // Validasi snap (ini sudah benar dari kode Anda)
    if (!nearestEdgeFrom) {
      return res.status(404).json({ success: false, message: `No nearby edge found on floor ${fromFloor} for START point`});
    }
    if (!nearestEdgeTo) {
      return res.status(404).json({ success: false, message: `No nearby edge found on floor ${toFloor} for END point`});
    }

    // --- SISA KODE ANDA SAMA PERSIS ---
    // (Tidak perlu diubah sama sekali)

    // 2. Build graph
    const edges = await edgeModel.getAllEdges();
    const graph = {};
    edges.forEach(edge => {
      const a = Number(edge.from_node);
      const b = Number(edge.to_node);
    
      if (!graph[a]) graph[a] = [];
      if (!graph[b]) graph[b] = [];
    

      let factor = 1;
      if (edge.type === 'stair') factor = 5;          // tangga = lebih berat
      else factor = 1;                                // road / default
    
      const weightedDistance = edge.distance * factor;
      // -------------------------------------------------------------
    
      graph[a].push({ node: b, weight: weightedDistance }); 
      graph[b].push({ node: a, weight: weightedDistance }); 
    });
    

    // 3. Siapkan ID Virtual
    const virtualFromId = -1000;
    const virtualToId = -9999;

    // 4. Hubungkan VIRTUAL FROM
    graph[virtualFromId] = [
      // ... (kode hubungkan virtual from Anda)
      { node: nearestEdgeFrom.from_node, weight: nearestEdgeFrom.dist_to_from },
      { node: nearestEdgeFrom.to_node, weight: nearestEdgeFrom.dist_to_to }
    ];
    if (!graph[nearestEdgeFrom.from_node]) graph[nearestEdgeFrom.from_node] = [];
    if (!graph[nearestEdgeFrom.to_node]) graph[nearestEdgeFrom.to_node] = [];
    graph[nearestEdgeFrom.from_node].push({ node: virtualFromId, weight: nearestEdgeFrom.dist_to_from });
    graph[nearestEdgeFrom.to_node].push({ node: virtualFromId, weight: nearestEdgeFrom.dist_to_to });

    const virtualFromEdge = [
      // ... (kode virtualFromEdge Anda)
      { via: nearestEdgeFrom.from_node, distance: nearestEdgeFrom.dist_to_from, coord: [nearestEdgeFrom.nearest_lon, nearestEdgeFrom.nearest_lat] },
      { via: nearestEdgeFrom.to_node, distance: nearestEdgeFrom.dist_to_to, coord: [nearestEdgeFrom.nearest_lon, nearestEdgeFrom.nearest_lat] }
    ];

    // 5. Hubungkan VIRTUAL TO
    graph[virtualToId] = [
      // ... (kode hubungkan virtual to Anda)
      { node: nearestEdgeTo.from_node, weight: nearestEdgeTo.dist_to_from },
      { node: nearestEdgeTo.to_node, weight: nearestEdgeTo.dist_to_to }
    ];
    if (!graph[nearestEdgeTo.from_node]) graph[nearestEdgeTo.from_node] = [];
    if (!graph[nearestEdgeTo.to_node]) graph[nearestEdgeTo.to_node] = [];
    graph[nearestEdgeTo.from_node].push({ node: virtualToId, weight: nearestEdgeTo.dist_to_from });
    graph[nearestEdgeTo.to_node].push({ node: virtualToId, weight: nearestEdgeTo.dist_to_to });
    
    const virtualToEdge = [
      // ... (kode virtualToEdge Anda)
      { via: nearestEdgeTo.from_node, distance: nearestEdgeTo.dist_to_from, coord: [nearestEdgeTo.nearest_lon, nearestEdgeTo.nearest_lat] },
      { via: nearestEdgeTo.to_node, distance: nearestEdgeTo.dist_to_to, coord: [nearestEdgeTo.nearest_lon, nearestEdgeTo.nearest_lat] }
    ];

    // 6. Jalankan Dijkstra HANYA SEKALI
    const { path, totalDistance } = dijkstra(graph, virtualFromId, virtualToId);

    if (!path || path.length < 2) {
      return res.status(404).json({ success: false, message: "No path found" });
    }

    // 7. Post-Processing & Bangun GeoJSON
    // ... (Loop for Anda sudah benar)
    const nodeIdsToFetch = path.filter(n => n !== virtualFromId && n !== virtualToId);
    const fullCoordsRaw = await nodeModel.getCoordinateById(nodeIdsToFetch);
    const coordMap = new Map();
    (fullCoordsRaw || []).forEach(c => coordMap.set(Number(c.node_id), { longitude: c.longitude, latitude: c.latitude }));
    const findCoord = (id) => coordMap.get(Number(id)) || null;

    const edgeSegments = [];
    for (let i = 0; i < path.length - 1; i++) {
        const fromNodeId = path[i];
        const toNodeId = path[i+1];
        if (fromNodeId === virtualFromId) {
            const chosen = virtualFromEdge.find(v => Number(v.via) === Number(toNodeId));
            if (chosen) edgeSegments.push({ from_node: virtualFromId, to_node: toNodeId, distance: chosen.distance, geometry: { type: "LineString", coordinates: [ [chosen.coord[0], chosen.coord[1]], findCoord(toNodeId) ? [findCoord(toNodeId).longitude, findCoord(toNodeId).latitude] : chosen.coord ] }});
            continue;
        }
        if (toNodeId === virtualFromId) {
            const chosen = virtualFromEdge.find(v => Number(v.via) === Number(fromNodeId));
            if (chosen) edgeSegments.push({ from_node: fromNodeId, to_node: virtualToId, distance: chosen.distance, geometry: { type: "LineString", coordinates: [ findCoord(fromNodeId) ? [findCoord(fromNodeId).longitude, findCoord(fromNodeId).latitude] : chosen.coord, [chosen.coord[0], chosen.coord[1]] ] }});
            continue;
        }
        if (toNodeId === virtualToId) {
            const chosen = virtualToEdge.find(v => Number(v.via) === Number(fromNodeId));
            if (chosen) edgeSegments.push({ from_node: fromNodeId, to_node: virtualToId, distance: chosen.distance, geometry: { type: "LineString", coordinates: [ findCoord(fromNodeId) ? [findCoord(fromNodeId).longitude, findCoord(fromNodeId).latitude] : chosen.coord, [chosen.coord[0], chosen.coord[1]] ] }});
            continue;
        }
        if (fromNodeId === virtualToId) {
            const chosen = virtualToEdge.find(v => Number(v.via) === Number(toNodeId));
            if (chosen) edgeSegments.push({ from_node: virtualToId, to_node: toNodeId, distance: chosen.distance, geometry: { type: "LineString", coordinates: [ [chosen.coord[0], chosen.coord[1]], findCoord(toNodeId) ? [findCoord(toNodeId).longitude, findCoord(toNodeId).latitude] : chosen.coord ] }});
            continue;
        }
        const fc = findCoord(fromNodeId);
        const tc = findCoord(toNodeId);
        const edgeData = edges.find(e => (Number(e.from_node) === Number(fromNodeId) && Number(e.to_node) === Number(toNodeId)) || (Number(e.from_node) === Number(toNodeId) && Number(e.to_node) === Number(fromNodeId)));
        if (fc && tc && edgeData) {
            edgeSegments.push({ from_node: fromNodeId, to_node: toNodeId, distance: edgeData.distance, geometry: { type: "LineString", coordinates: [ [fc.longitude, fc.latitude], [tc.longitude, tc.latitude] ] }});
        }
    }

    // 8. Mapping ID
    // ... (Kode mapping ID Anda sudah benar)
    const exactFrom = await nodeModel.findNodeByExactCoord(fLat, fLon);
    const exactTo = await nodeModel.findNodeByExactCoord(tLat, tLon);
    const dbNodeIds = await nodeModel.getExistingNodeIds(nodeIdsToFetch);
    const dbNodeSet = new Set(dbNodeIds.map(n => Number(n)));

    const mapNodeId = (id) => {
      if (id === virtualFromId) {
        return exactFrom ? Number(exactFrom.node_id) : virtualFromId;
      }
      if (id === virtualToId) {
        return exactTo ? Number(exactTo.node_id) : virtualToId;
      }
      return dbNodeSet.has(Number(id)) ? Number(id) : id;
    };

    const resolvedPath = path.map(id => mapNodeId(id));
    const geoJson = {
      type: "FeatureCollection",
      features: edgeSegments.map(seg => ({
        type: "Feature",
        properties: { from_node: mapNodeId(seg.from_node), to_node: mapNodeId(seg.to_node), distance: seg.distance },
        geometry: seg.geometry
      }))
    };

    let realDistance = 0;
        edgeSegments.forEach(seg => {
        realDistance += seg.distance;
    });

    // 9. Return (Kode Anda sudah benar)
    return res.json({
      success: true,
      message: "Shortest path found",
      total_distance: realDistance,
      path_nodes: resolvedPath,
      geojson: geoJson
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

  

module.exports = {snapToNearest, shortestPath};