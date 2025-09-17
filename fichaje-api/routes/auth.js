// fichaje-api/routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const verificarToken = require('../middleware/auth');

// Debe coincidir con el que usa el middleware para verificar
const JWT_SECRET = process.env.JWT_SECRET || 'secretito';

// Opcional: logs de depuración si exportas DEBUG_AUTH=1
const DEBUG = process.env.DEBUG_AUTH === '1';
const dlog = (...a) => DEBUG && console.log('[auth]', ...a);

// bcryptjs a veces falla con $2b$/$2y$ -> los normalizamos a $2a$
function normalizeBcryptHash(h) {
  if (!h || typeof h !== 'string') return h;
  if (h.startsWith('$2y$')) return '$2a$' + h.slice(4);
  if (h.startsWith('$2b$')) return '$2a$' + h.slice(4);
  return h;
}
function looksLikeBcrypt(h) {
  return typeof h === 'string' && h.startsWith('$2') && h.length >= 50;
}

/* ===================== LOGIN ===================== */
// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');

    if (!username || !password) {
      return res.status(400).json({ error: 'Faltan credenciales' });
    }

    const [rows] = await db.query(
      `SELECT id, username, nombre, email, telefono, rol, password, nif
         FROM usuarios
        WHERE username = ?
        LIMIT 1`,
      [username]
    );
    if (!rows.length) {
      dlog('user not found:', username);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const u = rows[0];
    const stored = String(u.password || '');

    let ok = false;
    if (looksLikeBcrypt(stored)) {
      const nh = normalizeBcryptHash(stored);
      ok = await bcrypt.compare(password, nh);
    } else {
      // Fallback por si la contraseña quedó en texto plano
      ok = password === stored;
    }

    if (!ok) {
      dlog('wrong password for', username);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: u.id, username: u.username, rol: u.rol, nif: u.nif || null },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    // no bloquea
    db.query('UPDATE usuarios SET last_seen = NOW() WHERE id=?', [u.id]).catch(() => {});

    return res.json({
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
    return res.status(500).json({ error: 'Error interno' });
  }
});

/* ===================== QUIÉN SOY ===================== */
// GET /auth/me
router.get('/me', verificarToken, async (req, res) => {
  try {
    const [[u]] = await db.query(
      `SELECT id, username, nombre, email, telefono, rol, nif
         FROM usuarios
        WHERE id = ?
        LIMIT 1`,
      [req.usuario.id]
    );
    return res.json(u || null);
  } catch (e) {
    console.error('GET /auth/me', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// Alias usado por algunos componentes
// GET /auth/whoami
router.get('/whoami', verificarToken, async (req, res) => {
  try {
    const [[u]] = await db.query(
      `SELECT id, username, nombre, email, telefono, rol, nif
         FROM usuarios
        WHERE id = ?
        LIMIT 1`,
      [req.usuario.id]
    );
    return res.json(u || null);
  } catch (e) {
    console.error('GET /auth/whoami', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
