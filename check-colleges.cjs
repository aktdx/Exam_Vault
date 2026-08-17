require('dotenv').config();
const pg = require('pg');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query('SELECT * FROM colleges').then(r => { console.log(JSON.stringify(r.rows)); pool.end(); }).catch(e => { console.error(e.message); pool.end(); });
