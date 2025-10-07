const express = require('express');
const router = express.Router();
const db = require('../db');
const verificarToken = require('../middleware/auth');

/* ---------- Helpers de introspección ---------- */
async function getClientesColumns() {
  const [desc] = await db.query(`SHOW COLUMNS FROM clientes`);
  const cols = new Set(desc.map(c => c.Field));

  const pick = (...cands) => cands.find(c => cols.has(c)) || null;

  const map = {
    id:           pick('id'),
    empresa:      pick('empresa','nombre','razon_social','compania','company'),
    contacto:     pick('contacto','persona_contacto','contact','attn'),
    email:        pick('email','correo','mail'),
    telefono:     pick('telefono','tel','phone','movil','mobile'),
    estado:       pick('estado','status'),
    nif:         pick('nif','cif','empresa_nif'),
    created_at:   pick('created_at','fecha','updated_at','id') // como último recurso, id para ordenar estable
  };

  return { cols, map };
}

/* ---------- Crear tabla si NO existe (no altera si ya está) ---------- */
async function ensureClientesTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id         CHAR(36) PRIMARY KEY,
        empresa    VARCHAR(120) NOT NULL,
        contacto   VARCHAR(120) NOT NULL,
        email      VARCHAR(255) NULL,
        telefono   VARCHAR(30)  NOT NULL,
        estado     TINYINT(1)   NOT NULL DEFAULT 1,
        nif        VARCHAR(20)  NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (e) {
    console.warn('ensureClientesTable: skip', e.message);
  }

  // Crear índices si no existen (MySQL no soporta IF NOT EXISTS en CREATE INDEX en muchas versiones)
  try { await db.query(`CREATE INDEX idx_clientes_nif ON clientes(nif)`); } catch {}
  try { await db.query(`CREATE UNIQUE INDEX uq_clientes_nif_telefono ON clientes(nif, telefono)`); } catch {}
}
ensureClientesTable().catch(console.error);

/* ============================================================
   LISTAR (por NIF si la columna existe)
   GET /clientes
============================================================ */
router.get('/', verificarToken, async (req, res) => {
  try {
    const sessionNif = req.user?.nif ? String(req.user.nif).trim() : '';
    const { map } = await getClientesColumns();

    // SELECT defensivo
    const sel = [];
    sel.push(map.id       ? `${map.id} AS id`             : `NULL AS id`);
    sel.push(map.empresa  ? `${map.empresa} AS empresa`   : `NULL AS empresa`);
    sel.push(map.contacto ? `${map.contacto} AS contacto` : `NULL AS contacto`);
    sel.push(map.email    ? `${map.email} AS email`       : `NULL AS email`);
    sel.push(map.telefono ? `${map.telefono} AS telefono` : `NULL AS telefono`);
    sel.push(map.estado   ? `${map.estado} AS estado`     : `NULL AS estado`);
    sel.push(map.nif      ? `${map.nif} AS nif`           : `NULL AS nif`);

    let sql = `SELECT ${sel.join(', ')} FROM clientes`;
    const params = [];

    if (sessionNif && map.nif) { sql += ` WHERE ${map.nif}=?`; params.push(sessionNif); }
    sql += ` ORDER BY ${map.created_at || 'id'} DESC`;

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error('GET /clientes', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

/* ============================================================
   CREAR
   POST /clientes
============================================================ */
router.post('/', verificarToken, async (req, res) => {
  try {
    const sessionNif = req.user?.nif ? String(req.user.nif).trim() : '';
    if (!sessionNif) return res.status(400).json({ error: 'nif_obligatorio' });

    const { map } = await getClientesColumns();
    const { empresa, contacto, email = null, telefono, estado = 1 } = req.body || {};

    // Validaciones mínimas solo si esas columnas existen
    if ((map.empresa && !empresa) || (map.contacto && !contacto) || (map.telefono && !telefono)) {
      return res.status(400).json({ error: 'campos_obligatorios' });
    }

    // Unicidad por (nif, telefono) solo si existen ambas columnas
    if (map.nif && map.telefono && telefono) {
      const [[dupT]] = await db.query(
        `SELECT ${map.id || 'id'} AS id FROM clientes WHERE ${map.nif}=? AND ${map.telefono}=? LIMIT 1`,
        [sessionNif, String(telefono)]
      );
      if (dupT?.id) return res.status(409).json({ error: 'telefono_duplicado' });
    }

    if (email && map.nif && map.email) {
      const [[dupE]] = await db.query(
        `SELECT ${map.id || 'id'} AS id FROM clientes WHERE ${map.nif}=? AND ${map.email}=? LIMIT 1`,
        [sessionNif, String(email)]
      );
      if (dupE?.id) return res.status(409).json({ error: 'email_duplicado' });
    }

    // Construir INSERT dinámico
    const fields = ['id'];
    const marks  = ['UUID()'];
    const values = [];

    const push = (col, val) => { fields.push(col); marks.push('?'); values.push(val); };

    if (map.empresa  && empresa  != null) push(map.empresa,  String(empresa));
    if (map.contacto && contacto != null) push(map.contacto, String(contacto));
    if (map.email)                       push(map.email,    email ? String(email) : null);
    if (map.telefono && telefono != null) push(map.telefono, String(telefono));
    if (map.estado)                      push(map.estado,   Number(estado) ? 1 : 0);
    if (map.nif)                         push(map.nif,      sessionNif);

    const sql = `INSERT INTO clientes (${fields.join(',')}) VALUES (${marks.join(',')})`;
    await db.query(sql, values);

    // Recuperar recién creado
    let where = [];
    let params = [];
    if (map.nif && map.telefono && telefono) { where = [`${map.nif}=?`, `${map.telefono}=?`]; params = [sessionNif, String(telefono)]; }
    else if (map.nif && map.email && email)   { where = [`${map.nif}=?`, `${map.email}=?`];    params = [sessionNif, String(email)]; }
    else { where = []; params = []; }

    const sel = [
      map.id       ? `${map.id} AS id`             : `NULL AS id`,
      map.empresa  ? `${map.empresa} AS empresa`   : `NULL AS empresa`,
      map.contacto ? `${map.contacto} AS contacto` : `NULL AS contacto`,
      map.email    ? `${map.email} AS email`       : `NULL AS email`,
      map.telefono ? `${map.telefono} AS telefono` : `NULL AS telefono`,
      map.estado   ? `${map.estado} AS estado`     : `NULL AS estado`,
      map.nif      ? `${map.nif} AS nif`           : `NULL AS nif`,
    ].join(', ');

    const [rows] = await db.query(
      `SELECT ${sel} FROM clientes${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY ${map.created_at || 'id'} DESC LIMIT 1`,
      params
    );
    res.status(201).json(rows[0] || { ok: true });
  } catch (e) {
    console.error('POST /clientes', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

/* ============================================================
   ACTUALIZAR
   PATCH /clientes/:id
============================================================ */
router.patch('/:id', verificarToken, async (req, res) => {
  try {
    const id = String(req.params.id);
    const sessionNif = req.user?.nif ? String(req.user.nif).trim() : '';
    if (!sessionNif) return res.status(400).json({ error: 'nif_obligatorio' });

    const { map } = await getClientesColumns();
    const { empresa, contacto, email, telefono, estado } = req.body || {};

    // Unicidad (si hay nif y telefono)
    if (map.nif && map.telefono && telefono != null) {
      const [[dupT]] = await db.query(
        `SELECT ${map.id || 'id'} AS id FROM clientes WHERE ${map.nif}=? AND ${map.telefono}=? AND ${map.id || 'id'}<>? LIMIT 1`,
        [sessionNif, String(telefono), id]
      );
      if (dupT?.id) return res.status(409).json({ error: 'telefono_duplicado' });
    }
    if (map.nif && map.email && email != null && email !== "") {
      const [[dupE]] = await db.query(
        `SELECT ${map.id || 'id'} AS id FROM clientes WHERE ${map.nif}=? AND ${map.email}=? AND ${map.id || 'id'}<>? LIMIT 1`,
        [sessionNif, String(email), id]
      );
      if (dupE?.id) return res.status(409).json({ error: 'email_duplicado' });
    }

    const sets = [], vals = [];
    const setIf = (dbcol, v) => { sets.push(`${dbcol}=?`); vals.push(v); };

    if (map.empresa  && empresa  != null) setIf(map.empresa,  String(empresa));
    if (map.contacto && contacto != null) setIf(map.contacto, String(contacto));
    if (map.email    && email    != null) setIf(map.email,    email === "" ? null : String(email));
    if (map.telefono && telefono != null) setIf(map.telefono, String(telefono));
    if (map.estado   && estado   != null) setIf(map.estado,   Number(estado) ? 1 : 0);

    if (!sets.length) return res.json({ ok: true });

    vals.push(id);
    await db.query(`UPDATE clientes SET ${sets.join(', ')} WHERE ${map.id || 'id'}=?`, vals);

    const sel = [
      map.id       ? `${map.id} AS id`             : `NULL AS id`,
      map.empresa  ? `${map.empresa} AS empresa`   : `NULL AS empresa`,
      map.contacto ? `${map.contacto} AS contacto` : `NULL AS contacto`,
      map.email    ? `${map.email} AS email`       : `NULL AS email`,
      map.telefono ? `${map.telefono} AS telefono` : `NULL AS telefono`,
      map.estado   ? `${map.estado} AS estado`     : `NULL AS estado`,
      map.nif      ? `${map.nif} AS nif`           : `NULL AS nif`,
    ].join(', ');

    const [[out]] = await db.query(
      `SELECT ${sel} FROM clientes WHERE ${map.id || 'id'}=?`,
      [id]
    );
    res.json(out);
  } catch (e) {
    console.error('PATCH /clientes/:id', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

/* ============================================================
   ELIMINAR
   DELETE /clientes/:id
============================================================ */
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { map } = await getClientesColumns();
    const [r] = await db.query(`DELETE FROM clientes WHERE ${map.id || 'id'}=?`, [id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'no_existe' });
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /clientes/:id', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

/* ============================================================
   IMPORT MASIVO
   POST /clientes/import
============================================================ */
router.post('/import', verificarToken, async (req, res) => {
  try {
    const sessionNif = req.user?.nif ? String(req.user.nif).trim() : '';
    if (!sessionNif) return res.status(400).json({ error: 'nif_obligatorio' });

    const { map } = await getClientesColumns();
    const items = Array.isArray(req.body?.items) ? req.body.items : [];

    let inserted = 0, updated = 0, duplicated = 0;

    for (const r of items) {
      const empresa  = String(r.empresa  || "").trim();
      const contacto = String(r.contacto || "").trim();
      const email    = String(r.email    || "").trim();
      const telefono = String(r.telefono || "").trim();
      const estado   = Number(r.estado) ? 1 : 0;

      // Si existen esas columnas, exigimos datos; si no, seguimos.
      if ((map.empresa && !empresa) || (map.contacto && !contacto) || (map.telefono && !telefono)) {
        duplicated++; continue;
      }

      let existId = null;
      if (map.nif && map.telefono && telefono) {
        const [[existTel]] = await db.query(
          `SELECT ${map.id || 'id'} AS id FROM clientes WHERE ${map.nif}=? AND ${map.telefono}=? LIMIT 1`,
          [sessionNif, telefono]
        );
        existId = existTel?.id || null;
      }

      if (existId) {
        // UPDATE dinámico
        const sets = [], vals = [];
        const setIf = (col, v) => { sets.push(`${col}=?`); vals.push(v); };

        if (map.empresa)  setIf(map.empresa,  empresa || null);
        if (map.contacto) setIf(map.contacto, contacto || null);
        if (map.email)    setIf(map.email,    email || null);
        if (map.estado)   setIf(map.estado,   estado);

        vals.push(existId);
        await db.query(`UPDATE clientes SET ${sets.join(', ')} WHERE ${map.id || 'id'}=?`, vals);
        updated++;
      } else {
        // INSERT dinámico
        const fields = ['id'];
        const marks  = ['UUID()'];
        const vals   = [];
        const push = (col, v) => { fields.push(col); marks.push('?'); vals.push(v); };

        if (map.empresa)  push(map.empresa,  empresa || null);
        if (map.contacto) push(map.contacto, contacto || null);
        if (map.email)    push(map.email,    email || null);
        if (map.telefono) push(map.telefono, telefono || null);
        if (map.estado)   push(map.estado,   estado);
        if (map.nif)      push(map.nif,      sessionNif);

        await db.query(`INSERT INTO clientes (${fields.join(',')}) VALUES (${marks.join(',')})`, vals);
        inserted++;
      }
    }

    res.json({ ok: true, inserted, updated, duplicated });
  } catch (e) {
    console.error('POST /clientes/import', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
