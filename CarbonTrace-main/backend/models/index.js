'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    define: dbConfig.define,
    pool: dbConfig.pool,
  }
);

const db = {};

// Auto-load model files from this directory
const basename = path.basename(__filename);
fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// Run associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Sync PostgreSQL auto-increment sequences with max(id) to fix sequence desync from seeders
if (dbConfig.dialect === 'postgres') {
  const syncSequences = async () => {
    try {
      const tables = [
        'government_users', 'ngo_users', 'panchayat_users',
        'land_requests', 'land_documents', 'registered_lands',
        'ndvi_records', 'carbon_credit_issuances', 'ngo_payments'
      ];
      for (const table of tables) {
        await sequelize.query(
          `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1));`
        ).catch(() => {});
      }
    } catch { /* ignore */ }
  };
  syncSequences();
}

module.exports = db;
