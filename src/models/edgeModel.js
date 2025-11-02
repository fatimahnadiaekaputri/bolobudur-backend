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

async function findNearestEdge(lat, lon) {
  try {
    // Pastikan parameter adalah angka
    const pLon = parseFloat(lon);
    const pLat = parseFloat(lat);

    // Query ini mengasumsikan SRID 4326 (WGS 84)
    const query = db.raw(`
      WITH 
      -- 1. Buat titik geografi dari input user
      InputPoint AS (
        SELECT ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography AS geog_point,
               ST_SetSRID(ST_MakePoint(?, ?), 4326) AS geom_point
      ),
      -- 2. Temukan 1 edge terdekat (menggunakan operator <-> pada geometri)
      NearestEdge AS (
        SELECT 
          e.edge_id,
          e.from_node,
          e.to_node,
          e.geom, -- Asumsi kolom geometri Anda bernama 'geom' dan tipenya 'geometry'
          e.distance AS total_edge_distance -- Asumsi Anda punya kolom 'distance'
        FROM edge e, InputPoint ip
        ORDER BY e.geom <-> ip.geom_point
        LIMIT 1
      )
      -- 3. Hitung jarak 'split' di sepanjang garis
      SELECT 
        ne.edge_id,
        ne.from_node,
        ne.to_node,
        -- Titik terdekat di garis (titik snap)
        ST_X(ST_ClosestPoint(ne.geom, ip.geom_point)) AS nearest_lon,
        ST_Y(ST_ClosestPoint(ne.geom, ip.geom_point)) AS nearest_lat,
        
        -- Jarak dari titik snap ke 'from_node'
        ST_Length(
          ST_LineSubstring(
            ne.geom,
            0, -- Mulai dari awal garis (fraksi 0)
            ST_LineLocatePoint(ne.geom, ST_ClosestPoint(ne.geom, ip.geom_point)) -- Fraksi ke titik snap
          )::geography
        ) AS dist_to_from,
        
        -- Jarak dari titik snap ke 'to_node'
        ST_Length(
          ST_LineSubstring(
            ne.geom,
            ST_LineLocatePoint(ne.geom, ST_ClosestPoint(ne.geom, ip.geom_point)), -- Mulai dari titik snap
            1 -- Sampai akhir garis (fraksi 1)
          )::geography
        ) AS dist_to_to,

        -- Jarak user ke titik snap
        ST_Distance(ip.geog_point, ST_ClosestPoint(ne.geom, ip.geom_point)::geography) AS distance_to_snap

      FROM NearestEdge ne, InputPoint ip
    `, [pLon, pLat, pLon, pLat]);

    const { rows } = await query;
    if (rows.length === 0) {
      return null;
    }
    
    // Kembalikan objek yang bersih
    return {
      edge_id: rows[0].edge_id,
      from_node: Number(rows[0].from_node),
      to_node: Number(rows[0].to_node),
      nearest_lon: rows[0].nearest_lon,
      nearest_lat: rows[0].nearest_lat,
      dist_to_from: rows[0].dist_to_from, // Jarak split A
      dist_to_to: rows[0].dist_to_to,     // Jarak split B
      distance_to_snap: rows[0].distance_to_snap // Jarak user ke jalan
    };

  } catch (err) {
    console.error("Error in findNearestEdge:", err);
    throw err;
  }
}

module.exports = { createEdge, getAllEdgesAsGeoJSON, getAllEdges, findNearestEdge };
