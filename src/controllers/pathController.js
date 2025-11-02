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

    const fLat = parseFloat(from_lat), fLon = parseFloat(from_lon);
    const tLat = parseFloat(to_lat), tLon = parseFloat(to_lon);

    // 1. Temukan "snap-to-edge" untuk TITIK AWAL dan TITIK AKHIR
    const nearestEdgeFrom = await edgeModel.findNearestEdge(fLat, fLon);
    const nearestEdgeTo = await edgeModel.findNearestEdge(tLat, tLon);

    // Validasi snap
    if (!nearestEdgeFrom || !nearestEdgeTo) {
      return res.status(404).json({
        success: false,
        message: "No nearby edge found — coordinates too far from network"
      });
    }

    // (Opsional) Cek jika jarak snap terlalu jauh
    // if (nearestEdgeFrom.distance_to_snap > 50 || nearestEdgeTo.distance_to_snap > 50) { ... }

    // 2. Build graph (Sama seperti sebelumnya)
    const edges = await edgeModel.getAllEdges();
    const graph = {};
    edges.forEach(edge => {
      const a = Number(edge.from_node);
      const b = Number(edge.to_node);
      if (!graph[a]) graph[a] = [];
      if (!graph[b]) graph[b] = [];
      graph[a].push({ node: b, weight: edge.distance });
      graph[b].push({ node: a, weight: edge.distance });
    });

    // 3. Siapkan ID Virtual
    const virtualFromId = -1000;
    const virtualToId = -9999;

    // 4. Hubungkan VIRTUAL FROM ke kedua ujung edge terdekatnya
    graph[virtualFromId] = [
      { node: nearestEdgeFrom.from_node, weight: nearestEdgeFrom.dist_to_from },
      { node: nearestEdgeFrom.to_node, weight: nearestEdgeFrom.dist_to_to }
    ];
    if (!graph[nearestEdgeFrom.from_node]) graph[nearestEdgeFrom.from_node] = [];
    if (!graph[nearestEdgeFrom.to_node]) graph[nearestEdgeFrom.to_node] = [];
    graph[nearestEdgeFrom.from_node].push({ node: virtualFromId, weight: nearestEdgeFrom.dist_to_from });
    graph[nearestEdgeFrom.to_node].push({ node: virtualFromId, weight: nearestEdgeFrom.dist_to_to });

    // Simpan geometri untuk GeoJSON nanti
    const virtualFromEdge = [
      { via: nearestEdgeFrom.from_node, distance: nearestEdgeFrom.dist_to_from, coord: [nearestEdgeFrom.nearest_lon, nearestEdgeFrom.nearest_lat] },
      { via: nearestEdgeFrom.to_node, distance: nearestEdgeFrom.dist_to_to, coord: [nearestEdgeFrom.nearest_lon, nearestEdgeFrom.nearest_lat] }
    ];

    // 5. Hubungkan VIRTUAL TO ke kedua ujung edge terdekatnya
    graph[virtualToId] = [
      { node: nearestEdgeTo.from_node, weight: nearestEdgeTo.dist_to_from },
      { node: nearestEdgeTo.to_node, weight: nearestEdgeTo.dist_to_to }
    ];
    if (!graph[nearestEdgeTo.from_node]) graph[nearestEdgeTo.from_node] = [];
    if (!graph[nearestEdgeTo.to_node]) graph[nearestEdgeTo.to_node] = [];
    graph[nearestEdgeTo.from_node].push({ node: virtualToId, weight: nearestEdgeTo.dist_to_from });
    graph[nearestEdgeTo.to_node].push({ node: virtualToId, weight: nearestEdgeTo.dist_to_to });
    
    // Simpan geometri untuk GeoJSON nanti
    const virtualToEdge = [
      { via: nearestEdgeTo.from_node, distance: nearestEdgeTo.dist_to_from, coord: [nearestEdgeTo.nearest_lon, nearestEdgeTo.nearest_lat] },
      { via: nearestEdgeTo.to_node, distance: nearestEdgeTo.dist_to_to, coord: [nearestEdgeTo.nearest_lon, nearestEdgeTo.nearest_lat] }
    ];

    // 6. Jalankan Dijkstra HANYA SEKALI
    const { path, totalDistance } = dijkstra(graph, virtualFromId, virtualToId);

    if (!path || path.length < 2) {
      return res.status(404).json({ success: false, message: "No path found" });
    }

    // 7. Post-Processing & Bangun GeoJSON (Sekarang Simetris)
    const nodeIdsToFetch = path.filter(n => n !== virtualFromId && n !== virtualToId);
    const fullCoordsRaw = await nodeModel.getCoordinateById(nodeIdsToFetch);
    const coordMap = new Map();
    (fullCoordsRaw || []).forEach(c => coordMap.set(Number(c.node_id), { longitude: c.longitude, latitude: c.latitude }));
    const findCoord = (id) => coordMap.get(Number(id)) || null;

    const edgeSegments = [];

    for (let i = 0; i < path.length - 1; i++) {
      const fromNodeId = path[i];
      const toNodeId = path[i + 1];

      // virtualFrom -> real
      if (fromNodeId === virtualFromId) {
        const chosen = virtualFromEdge.find(v => Number(v.via) === Number(toNodeId));
        if (chosen) {
          edgeSegments.push({
            from_node: virtualFromId, to_node: toNodeId,
            distance: chosen.distance,
            geometry: {
              type: "LineString",
              coordinates: [ [chosen.coord[0], chosen.coord[1]], findCoord(toNodeId) ? [findCoord(toNodeId).longitude, findCoord(toNodeId).latitude] : chosen.coord ]
            }
          });
        }
        continue;
      }

      // real -> virtualFrom (simetris)
      if (toNodeId === virtualFromId) {
        const chosen = virtualFromEdge.find(v => Number(v.via) === Number(fromNodeId));
        if (chosen) {
          edgeSegments.push({
            from_node: fromNodeId, to_node: virtualFromId,
            distance: chosen.distance,
            geometry: {
              type: "LineString",
              coordinates: [ findCoord(fromNodeId) ? [findCoord(fromNodeId).longitude, findCoord(fromNodeId).latitude] : chosen.coord, [chosen.coord[0], chosen.coord[1]] ]
            }
          });
        }
        continue;
      }

      // real -> virtualTo
      if (toNodeId === virtualToId) {
        const chosen = virtualToEdge.find(v => Number(v.via) === Number(fromNodeId));
        if (chosen) {
          edgeSegments.push({
            from_node: fromNodeId, to_node: virtualToId,
            distance: chosen.distance,
            geometry: {
              type: "LineString",
              coordinates: [ findCoord(fromNodeId) ? [findCoord(fromNodeId).longitude, findCoord(fromNodeId).latitude] : chosen.coord, [chosen.coord[0], chosen.coord[1]] ]
            }
          });
        }
        continue;
      }
      
      // virtualTo -> real (simetris)
      if (fromNodeId === virtualToId) {
         const chosen = virtualToEdge.find(v => Number(v.via) === Number(toNodeId));
         if (chosen) {
           edgeSegments.push({
             from_node: virtualToId, to_node: toNodeId,
             distance: chosen.distance,
             geometry: {
               type: "LineString",
               coordinates: [ [chosen.coord[0], chosen.coord[1]], findCoord(toNodeId) ? [findCoord(toNodeId).longitude, findCoord(toNodeId).latitude] : chosen.coord ]
             }
           });
         }
         continue;
       }
      
      // normal real->real
      const fc = findCoord(fromNodeId);
      const tc = findCoord(toNodeId);
      const edgeData = edges.find(e =>
        (Number(e.from_node) === Number(fromNodeId) && Number(e.to_node) === Number(toNodeId)) ||
        (Number(e.from_node) === Number(toNodeId) && Number(e.to_node) === Number(fromNodeId))
      );

      if (fc && tc && edgeData) {
        edgeSegments.push({
          from_node: fromNodeId, to_node: toNodeId,
          distance: edgeData.distance,
          geometry: {
            type: "LineString",
            coordinates: [ [fc.longitude, fc.latitude], [tc.longitude, tc.latitude] ]
          }
        });
      }
    } // end for loop

    // 8. Mapping ID (Sama seperti sebelumnya, tapi lebih sederhana)
    const exactFrom = await nodeModel.findNodeByExactCoord(fLat, fLon);
    const exactTo = await nodeModel.findNodeByExactCoord(tLat, tLon);
    
    const dbNodeIds = await nodeModel.getExistingNodeIds(nodeIdsToFetch);
    const dbNodeSet = new Set(dbNodeIds.map(n => Number(n)));

    const mapNodeId = (id) => {
      if (id === virtualFromId) {
        // Gunakan from_node dari edge terdekat sebagai referensi
        return exactFrom ? Number(exactFrom.node_id) : virtualFromId;
      }
      if (id === virtualToId) {
        // Gunakan from_node dari edge terdekat sebagai referensi
        return exactTo ? Number(exactTo.node_id) : virtualToId;
      }
      return dbNodeSet.has(Number(id)) ? Number(id) : id;
    };

    const resolvedPath = path.map(id => mapNodeId(id));

    const geoJson = {
      type: "FeatureCollection",
      features: edgeSegments.map(seg => ({
        type: "Feature",
        properties: {
          from_node: mapNodeId(seg.from_node),
          to_node: mapNodeId(seg.to_node),
          distance: seg.distance
        },
        geometry: seg.geometry
      }))
    };

    // totalDistance sudah termasuk jarak snap yang dihitung Dijkstra
    return res.json({
      success: true,
      message: "Shortest path found",
      total_distance: totalDistance,
      path_nodes: resolvedPath,
      geojson: geoJson
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

  

module.exports = {snapToNearest, shortestPath};