const db = require('../config/db');

const createNode = async (node) => {
    return await db('node').insert(node).returning('*');
}

const getAll = async () => {
    return db('node').select('*');
}

module.exports = {createNode, getAll}