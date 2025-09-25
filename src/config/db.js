const knex = require('knex');
const config = require('./knex')

const db = knex(config[process.env.NODE_ENV]);
module.exports = db;
