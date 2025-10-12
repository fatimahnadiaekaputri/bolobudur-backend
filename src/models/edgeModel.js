const db = require('../config/db');
const { haversineDistance } = require('../utils/haversine');

const createEdge = async (from_node, to_node) => {
  // Ambil koordinat kedua node
  const [fromNode] = await db('node').where({ node_id: from_node }).select('latitude', 'longitude');
  const [toNode] = await db('node').where({ node_id: to_node }).select('latitude', 'longitude');

  if (!fromNode || !toNode) {
    throw new Error('Invalid from_id or to_id: Node not found');
  }

  // Hitung jarak Haversine
  const distance = haversineDistance(
    fromNode.latitude,
    fromNode.longitude,
    toNode.latitude,
    toNode.longitude
  );

  // Bentuk LINESTRING
  const linestring = `LINESTRING(${fromNode.longitude} ${fromNode.latitude}, ${toNode.longitude} ${toNode.latitude})`;

  // Insert ke tabel edge
  const [newEdge] = await db('edge')
    .insert({
      from_node,
      to_node,
      distance,
      geom: db.raw(`ST_GeomFromText(?, 4326)`, [linestring]),
    })
    .returning('*');

  return newEdge;
};

module.exports = { createEdge };
