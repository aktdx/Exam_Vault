import pg from 'pg';
const pool = new pg.Pool({
  host: process.env.SQL_HOST, user: process.env.SQL_USER, password: process.env.SQL_PASSWORD, database: process.env.SQL_DB_NAME
});
pool.query('SELECT id, file_url FROM question_papers LIMIT 5').then(res => {
  console.log(res.rows); pool.end();
});
