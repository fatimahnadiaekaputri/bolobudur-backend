const db = require('../config/db');
const { haversineDistance, diagonalDistance } = require('../utils/calculation');

const createEdge = async (from_node, to_node, type, height) => {
  // Ambil koordinat kedua node
  const [fromNode] = await db('node').where({ node_id: from_node }).select('latitude', 'longitude');
  const [toNode] = await db('node').where({ node_id: to_node }).select('latitude', 'longitude');

  if (!fromNode || !toNode) {
    throw new Error('Invalid from_id or to_id: Node not found');
  }

  // Hitung jarak Haversine
  const baseDistance = haversineDistance(
    fromNode.latitude,
    fromNode.longitude,
    toNode.latitude,
    toNode.longitude
  );

  // Hitung total jarak
  const distance = type === 'stair'
    ? diagonalDistance(baseDistance, height)
    : baseDistance;

  // Bentuk LINESTRING
  const linestring = `LINESTRING(${fromNode.longitude} ${fromNode.latitude}, ${toNode.longitude} ${toNode.latitude})`;

  // Insert ke tabel edge
  const [newEdge] = await db('edge')
    .insert({
      from_node,
      to_node,
      distance,
      geom: db.raw(`ST_GeomFromText(?, 4326)`, [linestring]),
      type
    })
    .returning('*');

  return newEdge;
};

module.exports = { createEdge };
