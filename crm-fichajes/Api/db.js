const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',      // pon la contraseña si tu MySQL la tiene
  database: 'fichaje_crm',
  port: 3307          // importante para XAMPP
});

module.exports = pool;
