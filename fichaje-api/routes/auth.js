// routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const verificarToken = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'secretito';

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Faltan credenciales' });
    }

    const [rows] = await db.query(
      'SELECT id, username, nombre, email, telefono, rol, password, nif FROM usuarios WHERE username=? LIMIT 1',
      [username]
    );
    if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });

    const u = rows[0];
    const ok = await bcrypt.compare(password, u.password);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign(
      { id: u.id, username: u.username, rol: u.rol, nif: u.nif || null },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    try { await db.query('UPDATE usuarios SET last_seen = NOW() WHERE id=?', [u.id]); } catch {}

    res.json({
      token,
      user: {
        id: u.id,
        username: u.username,
        nombre: u.nombre,
        email: u.email,
        telefono: u.telefono,
        rol: u.rol,
        nif: u.nif || null,
      },
    });
  } catch (e) {
    console.error('POST /auth/login', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /auth/me  -> devuelve el usuario actual (necesita Authorization: Bearer <token>)
router.get('/me', verificarToken, async (req, res) => {
  try {
    const [[u]] = await db.query(
      'SELECT id, username, nombre, email, telefono, rol, nif FROM usuarios WHERE id=? LIMIT 1',
      [req.usuario.id]
    );
    res.json(u || null);
  } catch (e) {
    console.error('GET /auth/me', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
