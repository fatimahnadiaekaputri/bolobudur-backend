const db = require('../config/db');

const createNode = async (node) => {
    return await db('node').insert(node).returning('*');
}

const getAll = async () => {
    return db('node').select('*');
}

async function findNearestNode(lat,lon) {
    return await db('node').select(
        'node_id',
        'label',
        db.raw(`
            ST_Distance(
                geography(ST_MakePoint(longitude, latitude)),
                geography(ST_MakePoint(?, ?))
            ) AS distance`, [lon, lat])
    )
    .orderBy('distance', 'asc')
    .first();
}

async function getCoordinateById(nodeId) {
    return await db('node')
        .whereIn('node_id', nodeId)
        .select('node_id', 'longitude', 'latitude');
}

async function getExistingNodeIds(ids) {
    const rows = await db('node')
      .whereIn('node_id', ids)
      .select('node_id');
  
    return rows.map(r => r.node_id);
  }

  async function findNodeByExactCoord(lat, lon) {
    // tolerance to avoid floating precision: use 1e-9 deg (~1e-4 m) — adjust if needed
    const EPS = 1e-9;
    const row = await db('node')
      .whereRaw('ABS(latitude - ?) < ? AND ABS(longitude - ?) < ?', [lat, EPS, lon, EPS])
      .first();
  
    return row || null;
  }

  async function findNearestFloor(lat, lon) {
    try {
      const pLon = parseFloat(lon);
      const pLat = parseFloat(lat);
      const query = db.raw(`
        SELECT floor
        FROM node
        ORDER BY geom <-> ST_SetSRID(ST_MakePoint(?, ?), 4326)
        LIMIT 1
      `, [pLon, pLat]);
      const { rows } = await query;
      if (rows.length === 0) return null;
      return rows[0].floor;
    } catch (err) { 
      console.error("[nodeModel.findNearestFloor] error:", {
        lat,
        lon,
        message: err.message,
        stack: err.stack,
      });
      throw err;
    } 
  }

module.exports = {createNode, getAll, findNearestNode, getCoordinateById, getExistingNodeIds, findNodeByExactCoord, findNearestFloor}