// fichaje-api/routes/usuarios.js
const express = require('express');
const router = require('express').Router ? require('express').Router() : express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const verificarToken = require('../middleware/auth'); // Tu middleware devuelve una función

/* ───────────────────────── Helpers ───────────────────────── */
function onlyAdminOrSupervisor(req, res) {
  const rol = (req.usuario?.rol || '').toLowerCase();
  if (!['admin', 'supervisor'].includes(rol)) {
    res.status(403).json({ error: 'No autorizado' });
    return false;
  }
  return true;
}

// Protege TODO el router con JWT (aunque ya lo montes con auth en index.js,
// aquí no molesta y garantiza protección si alguien monta la ruta sin auth).
router.use(verificarToken);

/* ───────────────────────── Listar usuarios ───────────────────────── */
// GET /usuarios
router.get('/', async (req, res) => {
  if (!onlyAdminOrSupervisor(req, res)) return;
  try {
    const { nif } = req.usuario;
    const [rows] = await db.query(
      `SELECT id, username, nombre, email, telefono, rol, estado, avatar_url
         FROM usuarios
        WHERE nif = ?
        ORDER BY nombre`,
      [nif]
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /usuarios', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

/* ───────────────────────── Crear usuario ───────────────────────── */
// POST /usuarios (solo admin/supervisor)
router.post('/', async (req, res) => {
  if (!onlyAdminOrSupervisor(req, res)) return;
  try {
    const { nif } = req.usuario;
    const { username, nombre='', email='', telefono=null, rol='empleado', password='cambiar123' } = req.body || {};
    if (!username) return res.status(400).json({ error: 'username requerido' });

    // Unicidades globales (según tu esquema)
    const [[u1]] = await db.query(`SELECT COUNT(*) c FROM usuarios WHERE username = ?`, [username]);
    if (u1.c) return res.status(409).json({ error: 'username ya existe' });
    if (email) {
      const [[u2]] = await db.query(`SELECT COUNT(*) c FROM usuarios WHERE email = ?`, [email]);
      if (u2.c) return res.status(409).json({ error: 'email ya existe' });
    }

    const [[idRow]] = await db.query('SELECT UUID() AS id');
    const id = idRow.id;
    const hash = await require('bcryptjs').hash(password, 10);

    await db.query(
      `INSERT INTO usuarios (id, username, nombre, email, nif, telefono, rol, estado, fecha_registro, password)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), ?)`,
      [id, username, nombre, email || null, nif, telefono, rol.toLowerCase(), hash]
    );

    res.status(201).json({ id });
  } catch (e) {
    console.error('POST /usuarios', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

/* ─────────────────────── Cambiar SOLO el rol ─────────────────────── */
// PUT /usuarios/:id/rol   { rol }
router.put('/:id/rol', async (req, res) => {
  if (!onlyAdminOrSupervisor(req, res)) return;
  try {
    const { id } = req.params;
    const { nif } = req.usuario;
    const rol = String(req.body?.rol || 'empleado').toLowerCase();

    await db.query(
      `UPDATE usuarios SET rol = ? WHERE id = ? AND nif = ?`,
      [rol, id, nif]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error('PUT /usuarios/:id/rol', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

/* ─────────────────────── Editar usuario (full) ───────────────────── */
// PUT /usuarios/:id
router.put('/:id', async (req, res) => {
  if (!onlyAdminOrSupervisor(req, res)) return;
  try {
    const { id } = req.params;
    const { nif } = req.usuario;
    const { nombre, email, telefono, rol, estado, password } = req.body || {};

    // Si trae password, la cambiamos
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await db.query(
        `UPDATE usuarios
            SET nombre = ?, email = ?, telefono = ?, rol = ?, estado = ?, password = ?
          WHERE id = ? AND nif = ?`,
        [
          nombre || null,
          email || null,
          telefono || null,
          (rol || 'empleado').toLowerCase(),
          estado ? 1 : 0,
          hash,
          id,
          nif,
        ]
      );
    } else {
      await db.query(
        `UPDATE usuarios
            SET nombre = ?, email = ?, telefono = ?, rol = ?, estado = ?
          WHERE id = ? AND nif = ?`,
        [
          nombre || null,
          email || null,
          telefono || null,
          (rol || 'empleado').toLowerCase(),
          estado ? 1 : 0,
          id,
          nif,
        ]
      );
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('PUT /usuarios/:id', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

/* ─────────────────────── Desactivar usuario ──────────────────────── */
// DELETE /usuarios/:id
router.delete('/:id', async (req, res) => {
  if (!onlyAdminOrSupervisor(req, res)) return;
  try {
    const { id } = req.params;
    const { nif } = req.usuario;
    await db.query(`UPDATE usuarios SET estado = 0 WHERE id = ? AND nif = ?`, [id, nif]);
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /usuarios/:id', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

/* ───────────────────── Subida de avatar (perfil) ─────────────────── */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'avatars');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${req.usuario.id}${ext || '.png'}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('FORMATO_NO_VALIDO'));
  },
});

// POST /usuarios/avatar   (el usuario actual se sube su propio avatar)
router.post('/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Falta archivo' });
    const rel = `/uploads/avatars/${req.file.filename}`;
    await db.query(
      `UPDATE usuarios SET avatar_url = ? WHERE id = ? AND nif = ?`,
      [rel, req.usuario.id, req.usuario.nif]
    );
    res.json({ avatar_url: rel });
  } catch (e) {
    console.error('POST /usuarios/avatar', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
// GET /usuarios/search?q=...   (mismos NIF)
router.get("/search", verificarToken, async (req, res) => {
  try {
    const { nif } = req.usuario;
    const q = (req.query.q || "").trim();
    const like = `%${q}%`;
    const [rows] = await db.query(
      `SELECT id, username, nombre, email
         FROM usuarios
        WHERE nif=? AND (
          username LIKE ? OR nombre LIKE ? OR email LIKE ?
        )
        ORDER BY nombre ASC
        LIMIT 20`,
      [nif, like, like, like]
    );
    res.json(rows);
  } catch (e) {
    console.error("GET /usuarios/search", e);
    res.status(500).json({ error: "Error interno" });
  }
});
// fichaje-api/routes/usuarios.js  (añade al final)
router.get('/invitables', verificarToken, async (req, res) => {
  try {
    const { nif, id:userId } = req.usuario;
    const q = (req.query.q || '').trim();
    const like = `%${q}%`;

    const [rows] = await db.query(
      `SELECT id,
              COALESCE(nombre, username, email) AS label,
              username,
              email
         FROM usuarios
        WHERE nif = ?
          AND id <> ?
          AND ( ? = '' OR nombre LIKE ? OR username LIKE ? OR email LIKE ? )
        ORDER BY nombre, username
        LIMIT 50`,
      [nif, userId, q, like, like, like]
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /usuarios/invitables', e);
    res.status(500).json({ error: 'Error interno' });
  }
});