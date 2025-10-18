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
        const {from, to} = req.query;
        const edges = await edgeModel.getAllEdges();

        const graph = {};
        edges.forEach(edge => {
            if (!graph[edge.from_node]) graph[edge.from_node] = [];
            graph[edge.from_node].push({ node: edge.to_node, weight: edge.distance });
        });

        const { path, totalDistance } = dijkstra(graph, parseInt(from), parseInt(to));

        const coords = await nodeModel.getCoordinateById(path);

        const edgeSegments = [];
        for (let i = 0; i < path.length - 1; i++) {
            const fromNode = path[i];
            const toNode = path[i+1];

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
                        type: 'LineString',
                        coordinates: [
                            [fromCoord.longitude, fromCoord.latitude],
                            [tooCoord.longitude, tooCoord.latitude]
                        ]
                    }
                });
            }
        }

        res.json({
            success: true,
            message: 'Shortest path found',
            total_distance: totalDistance,
            path_nodes: path,
            geojson: edgeSegments
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({success: false, message: 'Server error'});
    }
};

module.exports = {snapToNearest, shortestPath};