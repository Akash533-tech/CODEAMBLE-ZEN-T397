const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const sql = fs.readFileSync(path.join(__dirname, 'src', 'db', 'migrations', '002_nft_columns.sql'), 'utf8');
// Strip BOM if present
const cleanSql = sql.replace(/^\uFEFF/, '');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(cleanSql)
  .then(() => {
    console.log('[Migration] 002_nft_columns applied successfully');
    pool.end();
  })
  .catch((e) => {
    console.error('[Migration] Error:', e.message);
    pool.end();
    process.exit(1);
  });
