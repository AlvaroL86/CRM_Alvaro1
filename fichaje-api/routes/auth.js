// routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const verificarToken = require('../middleware/auth');
const crypto = require('crypto');

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
      // ⬇⬇⬇ OPCIONAL: incluir nif para que el middleware no tenga que consultarlo
      { id: u.id, username: u.username, rol: u.rol, nif: u.nif },
      process.env.JWT_SECRET || 'secretito',
      { expiresIn: '12h' }
    );

    // (opcional) marca presencia al loguear
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
        nif: u.nif
      }
    });
  } catch (e) {
    console.error('POST /auth/login', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /auth/me
router.get('/me', verificarToken, async (req, res) => {
  const { id } = req.usuario;
  const [rows] = await db.query(
    'SELECT id, username, nombre, email, telefono, rol, nif FROM usuarios WHERE id=?',
    [id]
  );
  res.json(rows[0] || null);
});

// PUT /auth/profile
router.put('/profile', verificarToken, async (req, res) => {
  const { id } = req.usuario;
  const { nombre, email, telefono, password } = req.body || {};

  try {
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE usuarios SET nombre=?, email=?, telefono=?, password=? WHERE id=?',
        [nombre || null, email || null, telefono || null, hash, id]
      );
    } else {
      await db.query(
        'UPDATE usuarios SET nombre=?, email=?, telefono=? WHERE id=?',
        [nombre || null, email || null, telefono || null, id]
      );
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('PUT /auth/profile', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /auth/register-request
router.post('/register-request', async (req, res) => {
  try {
    const { nombre, apellidos, telefono, email } = req.body || {};
    if (!nombre || !apellidos || !telefono || !email) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }
    await db.query(
      'INSERT INTO register_requests (nombre, apellidos, telefono, email) VALUES (?,?,?,?)',
      [nombre, apellidos, telefono, email]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('POST /auth/register-request', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /auth/forgot
router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    const [u] = await db.query('SELECT id FROM usuarios WHERE email=? LIMIT 1', [email]);
    const token = crypto.randomBytes(32).toString('hex');
    await db.query(
      'INSERT INTO password_resets (user_id, email, token) VALUES (?,?,?)',
      [u.length ? u[0].id : null, email, token]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('POST /auth/forgot', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
