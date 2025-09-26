// fichaje-api/db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crm_fichajes',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z', // evitamos conversiones raras; fijamos sesión luego
});

async function query(...args) { return pool.query(...args); }
async function ping() { return pool.query('SELECT 1'); }
async function setSessionTimeZone() {
  const tz = process.env.DB_TIMEZONE || 'SYSTEM';
  try {
    await pool.query('SET time_zone = ?', [tz]);
    console.log(`DB time_zone = ${tz}`);
  } catch (e) {
    console.warn('No se pudo fijar time_zone (continuo):', e.code || e.message);
  }
}

module.exports = { pool, query, ping, setSessionTimeZone };
