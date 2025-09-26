// fichaje-api/routes/usuarios.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const verificarToken = require('../middleware/auth');

// ------- al inicio del fichero usuarios.js ---------
// Asegura columnas típicas (estado, nif) si faltan
async function ensureUsersCols() {
  try {
    const [cols] = await db.query(`SHOW COLUMNS FROM usuarios`);
    const names = cols.map(c => c.Field);

    if (!names.includes('estado')) {
      await db.query(`ALTER TABLE usuarios ADD COLUMN estado TINYINT(1) NOT NULL DEFAULT 1`);
      console.log('[migración] usuarios.estado creado');
    }
    if (!names.includes('nif')) {
      await db.query(`ALTER TABLE usuarios ADD COLUMN nif VARCHAR(20) NOT NULL`);
      console.log('[migración] usuarios.nif creado (NOT NULL)');
    }
  } catch (e) {
    console.error('ensureUsersCols()', e);
  }
}
ensureUsersCols().catch(console.error);


// Asegura columnas típicas (id, username, nombre, email, telefono, rol, password, estado, nif)
async function ensureUsersCols() {
  await db.query(`
    ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS estado TINYINT(1) NOT NULL DEFAULT 1
  `).catch(()=>{});
}
ensureUsersCols().catch(console.error);

// LISTAR
router.get('/', verificarToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, username, nombre, email, telefono, rol, estado, nif
        FROM usuarios
       ORDER BY username
    `);
    res.json(rows);
  } catch (e) {
    console.error('GET /usuarios', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// CREAR
router.post('/', verificarToken, async (req, res) => {
  try {
    let {
      username, nombre, email, telefono, rol = 'empleado',
      password = '', estado = 1, nif = null
    } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'username y password son obligatorios' });
    }

    // === 👇 NIF obligatorio: si no viene en el body, usamos el de la sesión ===
    const sessionNif = (req.user && req.user.nif) ? String(req.user.nif).trim() : '';
    const nifFinal = String((nif ?? sessionNif) || '').trim();
    if (!nifFinal) {
      return res.status(400).json({ error: 'nif es obligatorio (multiempresa)' });
    }

    const [[dup]] = await db.query(
      `SELECT id FROM usuarios WHERE username=? LIMIT 1`,
      [username]
    );
    if (dup) return res.status(409).json({ error: 'Username ya existe' });

    const hash = await bcrypt.hash(String(password), 10);

    await db.query(
      `INSERT INTO usuarios (id, username, nombre, email, telefono, rol, password, estado, nif)
       VALUES (UUID(), ?,?,?,?,?,?,?,?)`,
      [
        String(username), String(nombre || ''), String(email || ''), String(telefono || ''),
        String(rol || 'empleado'), hash, Number(estado) ? 1 : 0, nifFinal
      ]
    );

    const [[nuevo]] = await db.query(
      `SELECT id, username, nombre, email, telefono, rol, estado, nif
         FROM usuarios
        WHERE username=? LIMIT 1`,
      [username]
    );
    res.status(201).json(nuevo);
  } catch (e) {
    console.error('POST /usuarios', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ACTUALIZAR (PATCH todo en uno)
router.patch('/:id', verificarToken, async (req, res) => {
  try {
    const id = String(req.params.id);
    const {
      username, nombre, email, telefono, rol, estado, password, nif
    } = req.body || {};

    const [[exists]] = await db.query(`SELECT id FROM usuarios WHERE id=?`, [id]);
    if (!exists) return res.status(404).json({ error: 'No existe' });

    const sets = [];
    const vals = [];
    const setIf = (col, v) => { sets.push(`${col}=?`); vals.push(v); };

    if (username != null) setIf('username', String(username));
    if (nombre   != null) setIf('nombre', String(nombre));
    if (email    != null) setIf('email', String(email));
    if (telefono != null) setIf('telefono', String(telefono));
    if (rol      != null) setIf('rol', String(rol));
    if (estado   != null) setIf('estado', Number(estado) ? 1 : 0);
    if (nif      != null) setIf('nif', String(nif));

    if (password) {
      const hash = await bcrypt.hash(String(password), 10);
      setIf('password', hash);
    }

    if (!sets.length) return res.json({ ok: true });
    vals.push(id);
    await db.query(`UPDATE usuarios SET ${sets.join(', ')} WHERE id=?`, vals);

    const [[u]] = await db.query(
      `SELECT id, username, nombre, email, telefono, rol, estado, nif FROM usuarios WHERE id=?`,
      [id]
    );
    res.json(u);
  } catch (e) {
    console.error('PATCH /usuarios/:id', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ELIMINAR
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const id = String(req.params.id);
    const [r] = await db.query(`DELETE FROM usuarios WHERE id=?`, [id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'No existe' });
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /usuarios/:id', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
