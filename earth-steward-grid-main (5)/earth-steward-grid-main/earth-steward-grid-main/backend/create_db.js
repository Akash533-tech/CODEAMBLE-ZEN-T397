const { Client } = require('pg');

async function createDb() {
  const client = new Client({
    connectionString: 'postgres://postgres:kapil%407350@127.0.0.1:5432/postgres'
  });

  try {
    await client.connect();
    const res = await client.query("SELECT datname FROM pg_database WHERE datname = 'carbon_market'");
    if (res.rowCount === 0) {
      console.log('Database carbon_market does not exist, creating it...');
      await client.query('CREATE DATABASE carbon_market');
      console.log('Database created successfully.');
    } else {
      console.log('Database carbon_market already exists.');
    }
  } catch (error) {
    console.error('Error creating database:', error);
  } finally {
    await client.end();
  }
}

createDb();
