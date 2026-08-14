require('dotenv').config();
const pg = require('pg');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query("INSERT INTO colleges (name, code) VALUES ('MMIT College', 'MMIT') ON CONFLICT (code) DO NOTHING RETURNING *")
  .then(r => { console.log('Done:', JSON.stringify(r.rows)); pool.end(); })
  .catch(e => { console.error(e.message); pool.end(); });
