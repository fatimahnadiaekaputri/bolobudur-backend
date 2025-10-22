const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    }
  },

  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false},
    },
    pool: {
      min: 2, 
      max: 10,
      idleTimeoutMillis: 30000,
      createTimeoutMillis: 10000,
      acquireTimeoutMillis: 10000},
    migrations: {
      tableName: 'knex_migrations'
    }
  }
};