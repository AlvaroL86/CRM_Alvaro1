// fichaje-api/routes/clientes.js
const router = require('express').Router();
const db = require('../db');
const verificar = require('../middleware/auth');

// Helpers de validación/saneo
const clean = (v) => {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t.length ? t : null; // "" -> null
};
const emailOk  = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const phoneOk  = (v) => !v || /^\+?\d{6,15}$/.test(v);

// Listar (mismo NIF)
router.get('/', verificar, async (req, res) => {
  try {
    const { nif } = req.usuario;
    const [rows] = await db.query(
      `SELECT id, empresa_nombre, email, telefono, estado, fecha_registro
         FROM clientes
        WHERE nif = ?
        ORDER BY empresa_nombre ASC`,
      [nif]
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /clientes', e);
    res.status(500).json({ error: 'Error interno en listado de clientes' });
  }
});

// Crear
router.post('/', verificar, async (req, res) => {
  try {
    const { nif } = req.usuario;

    // saneo + trim
    const empresa_nombre = clean(req.body?.empresa_nombre);
    const email = clean(req.body?.email);
    const telefono = clean(req.body?.telefono);

    if (!empresa_nombre) {
      return res.status(400).json({ error: 'empresa_nombre requerido' });
    }
    if (!emailOk(email)) {
      return res.status(400).json({ error: 'email no válido' });
    }
    if (!phoneOk(telefono)) {
      return res.status(400).json({ error: 'telefono no válido' });
    }

    // Igual que tu versión: generamos UUID en MySQL
    const [[idRow]] = await db.query(`SELECT UUID() AS id`);

    await db.query(
      `INSERT INTO clientes (id, empresa_nombre, email, telefono, estado, fecha_registro, nif)
       VALUES (?, ?, ?, ?, 1, NOW(), ?)`,
      [idRow.id, empresa_nombre, email, telefono, nif]
    );

    res.status(201).json({ ok: true, id: idRow.id });
  } catch (e) {
    // Posibles errores típicos: clave duplicada por UNIQUE(empresa_nombre,nif), etc.
    console.error('POST /clientes', e);
    const msg =
      e?.code === 'ER_DUP_ENTRY'
        ? 'Ya existe un cliente con ese nombre para tu empresa'
        : 'Error interno al crear el cliente';
    res.status(500).json({ error: msg });
  }
});

module.exports = router;
