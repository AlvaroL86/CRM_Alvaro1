const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const verificarToken = require('./middleware/auth');
const crypto = require('crypto')

// POST /auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const [rows] = await db.query(`SELECT * FROM usuarios WHERE username=? LIMIT 1`, [username]);
  if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });
  const u = rows[0];
  const ok = await bcrypt.compare(password, u.password);
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

  const token = jwt.sign({ id: u.id }, process.env.JWT_SECRET || 'secretito', { expiresIn: '12h' });
  res.json({
    token,
    user: { id: u.id, username: u.username, nombre: u.nombre, rol: u.rol, nif: u.nif }
  });
});

// GET /auth/me
router.get('/me', verificarToken, async (req, res) => {
  const { id } = req.usuario;
  const [rows] = await db.query(
    `SELECT id, username, nombre, email, telefono, rol, nif FROM usuarios WHERE id=?`,
    [id]
  );
  res.json(rows[0]);
});

// PUT /auth/profile
router.put('/profile', verificarToken, async (req, res) => {
  const { id } = req.usuario;
  const { nombre, email, telefono, password } = req.body;
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    await db.query(
      `UPDATE usuarios SET nombre=?, email=?, telefono=?, password=? WHERE id=?`,
      [nombre || null, email || null, telefono || null, hash, id]
    );
  } else {
    await db.query(
      `UPDATE usuarios SET nombre=?, email=?, telefono=? WHERE id=?`,
      [nombre || null, email || null, telefono || null, id]
    );
  }
  res.json({ ok: true });
});

module.exports = router;
// POST /auth/register-request
router.post('/register-request', async (req, res) => {
  try {
    const { nombre, apellidos, telefono, email } = req.body;
    if (!nombre || !apellidos || !telefono || !email) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }
    await db.query(
      `INSERT INTO register_requests (nombre, apellidos, telefono, email) VALUES (?,?,?,?)`,
      [nombre, apellidos, telefono, email]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('POST /auth/register-request', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /auth/forgot (genera token; el envío de email lo montamos después)
router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    const [u] = await db.query(`SELECT id FROM usuarios WHERE email=? LIMIT 1`, [email]);
    const token = crypto.randomBytes(32).toString('hex');

    await db.query(
      `INSERT INTO password_resets (user_id, email, token) VALUES (?,?,?)`,
      [u.length ? u[0].id : null, email, token]
    );

    // TODO: enviar email con enlace /reset?token=...
    res.json({ ok: true });
  } catch (e) {
    console.error('POST /auth/forgot', e);
    res.status(500).json({ error: 'Error interno' });
  }
});
