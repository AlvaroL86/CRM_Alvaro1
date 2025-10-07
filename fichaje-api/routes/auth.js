// fichaje-api/routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const verificarToken = require('../middleware/auth');

const JWT_SECRET = (process.env.JWT_SECRET || 'secretito').trim();
const DEV_MASTER_PASS = (process.env.DEV_MASTER_PASS || '').trim();

// ¿Parece un hash bcrypt válido?
const isBcryptHash = (s = '') => /^\$2[aby]\$/.test(s) && s.length >= 50;

/* ============ LOGIN ============ */
router.post('/login', async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const passwordRaw = String(req.body?.password ?? ''); // tal cual, sin trim

    if (!username || !passwordRaw) {
      return res.status(400).json({ error: 'Faltan credenciales' });
    }

    const [[u]] = await db.query(
      `SELECT id, username, nombre, email, telefono, rol, password, nif
         FROM usuarios
        WHERE username = ?
        LIMIT 1`,
      [username]
    );
    if (!u) return res.status(401).json({ error: 'Credenciales inválidas' });

    let ok = false;

    if (DEV_MASTER_PASS && passwordRaw === DEV_MASTER_PASS) {
      ok = true;
    } else {
      const stored = String(u.password || '');
      if (isBcryptHash(stored)) {
        ok = await bcrypt.compare(passwordRaw, stored);
        if (!ok && /\s$/.test(passwordRaw)) {
          ok = await bcrypt.compare(passwordRaw.replace(/\s+$/, ''), stored);
        }
      } else {
        ok = passwordRaw === stored || passwordRaw.replace(/\s+$/, '') === stored;
      }
    }

    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign(
      { id: u.id, username: u.username, rol: u.rol, nif: u.nif || null },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

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
    return res.status(500).json({ error: 'Error interno' }); // <-- siempre responde
  }
});

/* ============ QUIÉN SOY ============ */
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

// Alias
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

/* ============ PATCH /me ============ */
router.patch('/me', verificarToken, async (req, res) => {
  try {
    const uid = req.user.id;
    const { nombre, email, telefono, password } = req.body || {};

    if (email) {
      const [[dupE]] = await db.query(
        `SELECT id FROM usuarios WHERE email=? AND id<>? LIMIT 1`, [String(email), uid]
      );
      if (dupE) return res.status(409).json({ error: 'email_duplicado' });
    }
    if (telefono) {
      const [[dupT]] = await db.query(
        `SELECT id FROM usuarios WHERE telefono=? AND id<>? LIMIT 1`, [String(telefono), uid]
      );
      if (dupT) return res.status(409).json({ error: 'telefono_duplicado' });
    }

    const sets = [];
    const vals = [];
    const setIf = (col, v) => { sets.push(`${col}=?`); vals.push(v); };

    if (nombre   != null) setIf('nombre', String(nombre));
    if (email    != null) setIf('email', String(email));
    if (telefono != null) setIf('telefono', String(telefono));

    if (password) {
      const hash = await bcrypt.hash(String(password), 10);
      setIf('password', hash);
    }

    if (!sets.length) return res.json({ ok: true });

    vals.push(uid);
    await db.query(`UPDATE usuarios SET ${sets.join(', ')} WHERE id=?`, vals);

    const [[out]] = await db.query(
      `SELECT id, username, nombre, email, telefono, rol, estado, nif FROM usuarios WHERE id=?`, [uid]
    );
    res.json(out);
  } catch (e) {
    console.error('PATCH /auth/me', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
