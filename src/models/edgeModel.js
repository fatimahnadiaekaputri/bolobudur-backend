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

async function getAllEdgesAsGeoJSON() {
  // Ambil data edge + konversi geometry ke GeoJSON
  const result = await db.raw(`
    SELECT 
      e.edge_id,
      e.type,
      n1.floor AS from_floor,
      n2.floor AS to_floor,
      ST_AsGeoJSON(e.geom) AS geometry
    FROM edge e
    JOIN node n1 ON e.from_node = n1.node_id
    JOIN node n2 ON e.to_node = n2.node_id
  `);

  // Raw query dari Knex+Postgres hasilnya ada di result.rows
  const edges = result.rows;

  // Konversi ke format GeoJSON FeatureCollection
  const features = edges.map(edge => ({
    type: "Feature",
    properties: {
      // Kalau typenya 'stair', name jadi 'stair'
      name: edge.type === 'stair' ? 'stair' : `Lantai ${edge.from_floor}`,
      floor: edge.type === 'stair' ? `${edge.from_floor} → ${edge.to_floor}` : edge.from_floor
    },
    geometry: JSON.parse(edge.geometry)
  }));

  return {
    type: "FeatureCollection",
    features
  };
}

async function getAllEdges() {
  return await db('edge').select('from_node', 'to_node', 'distance')
}

module.exports = { createEdge, getAllEdgesAsGeoJSON, getAllEdges };
