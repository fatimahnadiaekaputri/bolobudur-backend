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

module.exports = {createNode, getAll, findNearestNode, getCoordinateById}