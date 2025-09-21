// fichaje-api/routes/roles.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const verificarToken = require('../middleware/auth');

// Creamos tabla si no existe (permisos como JSON serializado)
async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS roles (
      slug        VARCHAR(50) PRIMARY KEY,
      nombre      VARCHAR(80) NOT NULL,
      descripcion VARCHAR(255) NULL,
      permisos    LONGTEXT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}
ensureTable().catch(console.error);

// Helpers
const normSlug = (s = '') =>
  String(s).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');

const parsePerms = (raw) => {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
};
const strPerms = (obj) => {
  try { return JSON.stringify(obj || {}); } catch { return '{}'; }
};

// LISTAR
router.get('/', verificarToken, async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT slug, nombre, descripcion, permisos FROM roles ORDER BY nombre`);
    const out = rows.map(r => ({
      slug: r.slug,
      nombre: r.nombre,
      descripcion: r.descripcion,
      permisos: parsePerms(r.permisos),
    }));
    res.json(out);
  } catch (e) {
    console.error('GET /roles', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// OBTENER UNO
router.get('/:slug', verificarToken, async (req, res) => {
  try {
    const slug = normSlug(req.params.slug);
    const [[r]] = await db.query(`SELECT slug, nombre, descripcion, permisos FROM roles WHERE slug=?`, [slug]);
    if (!r) return res.status(404).json({ error: 'No existe' });
    res.json({
      slug: r.slug,
      nombre: r.nombre,
      descripcion: r.descripcion,
      permisos: parsePerms(r.permisos),
    });
  } catch (e) {
    console.error('GET /roles/:slug', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// CREAR
router.post('/', verificarToken, async (req, res) => {
  try {
    const slug = normSlug(req.body?.slug);
    const nombre = String(req.body?.nombre || slug).trim();
    const descripcion = String(req.body?.descripcion || '').trim();
    const permisos = req.body?.permisos || {};

    if (!slug) return res.status(400).json({ error: 'slug requerido' });

    const [[dup]] = await db.query(`SELECT slug FROM roles WHERE slug=? LIMIT 1`, [slug]);
    if (dup) return res.status(409).json({ error: 'Ya existe un rol con ese slug' });

    await db.query(
      `INSERT INTO roles (slug,nombre,descripcion,permisos) VALUES (?,?,?,?)`,
      [slug, nombre, descripcion, strPerms(permisos)]
    );

    res.status(201).json({ slug, nombre, descripcion, permisos });
  } catch (e) {
    console.error('POST /roles', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ACTUALIZAR
router.put('/:slug', verificarToken, async (req, res) => {
  try {
    const slug = normSlug(req.params.slug);
    const nombre = String(req.body?.nombre || '').trim();
    const descripcion = String(req.body?.descripcion || '').trim();
    const permisos = req.body?.permisos || {};

    const [[r]] = await db.query(`SELECT slug FROM roles WHERE slug=?`, [slug]);
    if (!r) return res.status(404).json({ error: 'No existe' });

    await db.query(
      `UPDATE roles SET nombre=?, descripcion=?, permisos=? WHERE slug=?`,
      [nombre || slug, descripcion, strPerms(permisos), slug]
    );

    res.json({ slug, nombre: nombre || slug, descripcion, permisos });
  } catch (e) {
    console.error('PUT /roles/:slug', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ELIMINAR
router.delete('/:slug', verificarToken, async (req, res) => {
  try {
    const slug = normSlug(req.params.slug);
    const [r] = await db.query(`DELETE FROM roles WHERE slug=?`, [slug]);
    if (!r.affectedRows) return res.status(404).json({ error: 'No existe' });
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /roles/:slug', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
