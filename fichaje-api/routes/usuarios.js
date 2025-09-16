// routes/usuarios.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const verificarToken = require('../middleware/auth');

function onlyAdminOrSupervisor(req, res) {
  const rol = (req.usuario?.rol || '').toLowerCase();
  if (!['admin', 'supervisor'].includes(rol)) {
    res.status(403).json({ error: 'No autorizado' });
    return false;
  }
  return true;
}

// Todas las rutas de /usuarios requieren JWT
router.use(verificarToken);

// ---- LISTA ----
router.get('/', async (req, res) => {
  try {
    const rol = (req.usuario?.rol || '').toLowerCase();
    const nif = req.usuario?.nif || null;

    let sql = `
      SELECT id, username, nombre, email, telefono, rol, estado, avatar_url
      FROM usuarios
    `;
    const params = [];

    if (rol !== 'admin') {
      sql += ` WHERE nif = ? `;
      params.push(nif);
    }

    sql += ` ORDER BY nombre, username`;

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error('GET /usuarios', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ---- CREAR ----
router.post('/', async (req, res) => {
  if (!onlyAdminOrSupervisor(req, res)) return;
  try {
    const { nif } = req.usuario;
    const {
      username,
      nombre = null,
      email = null,
      telefono = null,
      rol = 'empleado',
      password = 'cambiar123',
      estado = 1,
    } = req.body || {};

    if (!username) return res.status(400).json({ error: 'username requerido' });

    const [[dupUser]] = await db.query(
      `SELECT COUNT(*) c FROM usuarios WHERE nif=? AND username=?`,
      [nif, username]
    );
    if (dupUser.c) return res.status(409).json({ error: 'username ya existe en la empresa' });

    if (email) {
      const [[dupEmail]] = await db.query(
        `SELECT COUNT(*) c FROM usuarios WHERE nif=? AND email=?`,
        [nif, email]
      );
      if (dupEmail.c) return res.status(409).json({ error: 'email ya existe en la empresa' });
    }

    const hash = await bcrypt.hash(String(password), 10);

    // si tu columna id es CHAR(36) con UUID y no AUTOINCREMENT, forzamos UUID()
    const [[uuidRow]] = await db.query('SELECT UUID() AS id');
    const id = uuidRow.id;

    await db.query(
      `INSERT INTO usuarios
        (id, username, nombre, email, telefono, rol, estado, password, nif, fecha_registro)
       VALUES (?,?,?,?,?,?,?,?,?, NOW())`,
      [id, username, nombre, email, telefono, String(rol).toLowerCase(), estado ? 1 : 0, hash, nif]
    );

    res.status(201).json({ id });
  } catch (e) {
    console.error('POST /usuarios', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ---- EDITAR ----
router.put('/:id', async (req, res) => {
  if (!onlyAdminOrSupervisor(req, res)) return;
  try {
    const { id } = req.params;
    const { nif } = req.usuario;
    const { nombre, email, telefono, rol, estado, password } = req.body || {};

    if (email) {
      const [[dup]] = await db.query(
        `SELECT COUNT(*) c FROM usuarios WHERE nif=? AND email=? AND id<>?`,
        [nif, email, id]
      );
      if (dup.c) return res.status(409).json({ error: 'email ya en uso en esta empresa' });
    }

    if (password) {
      const hash = await bcrypt.hash(String(password), 10);
      await db.query(
        `UPDATE usuarios
           SET nombre=?, email=?, telefono=?, rol=?, estado=?, password=?, updated_at=NOW()
         WHERE id=? AND nif=?`,
        [nombre || null, email || null, telefono || null, String(rol || 'empleado').toLowerCase(), estado ? 1 : 0, hash, id, nif]
      );
    } else {
      await db.query(
        `UPDATE usuarios
           SET nombre=?, email=?, telefono=?, rol=?, estado=?, updated_at=NOW()
         WHERE id=? AND nif=?`,
        [nombre || null, email || null, telefono || null, String(rol || 'empleado').toLowerCase(), estado ? 1 : 0, id, nif]
      );
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('PUT /usuarios/:id', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ---- CAMBIAR ROL ----
router.put('/:id/rol', async (req, res) => {
  if (!onlyAdminOrSupervisor(req, res)) return;
  try {
    const { id } = req.params;
    const { nif } = req.usuario;
    const rol = String(req.body?.rol || 'empleado').toLowerCase();

    await db.query(`UPDATE usuarios SET rol=?, updated_at=NOW() WHERE id=? AND nif=?`, [rol, id, nif]);
    res.json({ ok: true });
  } catch (e) {
    console.error('PUT /usuarios/:id/rol', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ---- DESACTIVAR ----
router.delete('/:id', async (req, res) => {
  if (!onlyAdminOrSupervisor(req, res)) return;
  try {
    const { id } = req.params;
    const { nif } = req.usuario;
    await db.query(`UPDATE usuarios SET estado=0, updated_at=NOW() WHERE id=? AND nif=?`, [id, nif]);
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /usuarios/:id', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
