import fs from 'fs';
import path from 'path';
import pool from './pool';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  console.log('Running database migrations...');
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', '001_initial.sql'), 'utf-8');
  try {
    await pool.query(sql);
    console.log('Migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
