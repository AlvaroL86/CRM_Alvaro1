// fichaje-api/routes/clientes.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const verificarToken = require('../middleware/auth');

// Asegurar columnas mínimas
async function ensureClientesTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id        CHAR(36) PRIMARY KEY,
      empresa   VARCHAR(120) NOT NULL,
      contacto  VARCHAR(120) NOT NULL,
      email     VARCHAR(255) NULL,
      telefono  VARCHAR(30)  NOT NULL,
      estado    TINYINT(1)   NOT NULL DEFAULT 1,
      nif       VARCHAR(20)  NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  // Índices de unicidad
  await db.query(`CREATE INDEX IF NOT EXISTS idx_clientes_nif ON clientes(nif)`);
  // Nota: si quieres unicidad global de teléfono, quítale IF NOT EXISTS y crea UNIQUE sin nif
  await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_clientes_nif_telefono ON clientes(nif, telefono)`);
}
ensureClientesTable().catch(console.error);

// LISTAR (por NIF de sesión)
router.get('/', verificarToken, async (req, res) => {
  try {
    const sessionNif = req.user?.nif ? String(req.user.nif).trim() : '';
    if (!sessionNif) return res.status(400).json({ error: 'nif_obligatorio' });

    const [rows] = await db.query(
      `SELECT id, empresa, contacto, email, telefono, estado, nif
         FROM clientes WHERE nif=? ORDER BY created_at DESC`, [sessionNif]
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /clientes', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// CREAR
router.post('/', verificarToken, async (req, res) => {
  try {
    const sessionNif = req.user?.nif ? String(req.user.nif).trim() : '';
    if (!sessionNif) return res.status(400).json({ error: 'nif_obligatorio' });

    const { empresa, contacto, email = null, telefono, estado = 1 } = req.body || {};
    if (!empresa || !contacto || !telefono) {
      return res.status(400).json({ error: 'campos_obligatorios' });
    }

    // Unicidad por (nif, telefono)
    const [[dupT]] = await db.query(
      `SELECT id FROM clientes WHERE nif=? AND telefono=? LIMIT 1`, [sessionNif, String(telefono)]
    );
    if (dupT) return res.status(409).json({ error: 'telefono_duplicado' });

    if (email) {
      const [[dupE]] = await db.query(
        `SELECT id FROM clientes WHERE nif=? AND email=? LIMIT 1`, [sessionNif, String(email)]
      );
      if (dupE) return res.status(409).json({ error: 'email_duplicado' });
    }

    await db.query(
      `INSERT INTO clientes (id, empresa, contacto, email, telefono, estado, nif)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
      [String(empresa), String(contacto), email ? String(email) : null, String(telefono), Number(estado)?1:0, sessionNif]
    );

    const [[cli]] = await db.query(
      `SELECT id, empresa, contacto, email, telefono, estado, nif
         FROM clientes WHERE nif=? AND telefono=? LIMIT 1`, [sessionNif, String(telefono)]
    );
    res.status(201).json(cli);
  } catch (e) {
    console.error('POST /clientes', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ACTUALIZAR
router.patch('/:id', verificarToken, async (req, res) => {
  try {
    const id = String(req.params.id);
    const sessionNif = req.user?.nif ? String(req.user.nif).trim() : '';
    if (!sessionNif) return res.status(400).json({ error: 'nif_obligatorio' });

    const { empresa, contacto, email, telefono, estado } = req.body || {};

    // Unicidad
    if (telefono != null) {
      const [[dupT]] = await db.query(
        `SELECT id FROM clientes WHERE nif=? AND telefono=? AND id<>? LIMIT 1`, [sessionNif, String(telefono), id]
      );
      if (dupT) return res.status(409).json({ error: 'telefono_duplicado' });
    }
    if (email != null && email !== "") {
      const [[dupE]] = await db.query(
        `SELECT id FROM clientes WHERE nif=? AND email=? AND id<>? LIMIT 1`, [sessionNif, String(email), id]
      );
      if (dupE) return res.status(409).json({ error: 'email_duplicado' });
    }

    const sets = [], vals = [];
    const setIf = (col, v) => { sets.push(`${col}=?`); vals.push(v); };

    if (empresa   != null) setIf('empresa', String(empresa));
    if (contacto  != null) setIf('contacto', String(contacto));
    if (email     != null) setIf('email', email === "" ? null : String(email));
    if (telefono  != null) setIf('telefono', String(telefono));
    if (estado    != null) setIf('estado', Number(estado)?1:0);

    if (!sets.length) return res.json({ ok: true });

    vals.push(id);
    await db.query(`UPDATE clientes SET ${sets.join(', ')} WHERE id=?`, vals);

    const [[out]] = await db.query(
      `SELECT id, empresa, contacto, email, telefono, estado, nif FROM clientes WHERE id=?`, [id]
    );
    res.json(out);
  } catch (e) {
    console.error('PATCH /clientes/:id', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ELIMINAR
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const id = String(req.params.id);
    const [r] = await db.query(`DELETE FROM clientes WHERE id=?`, [id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'no_existe' });
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /clientes/:id', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// IMPORT masivo
router.post('/import', verificarToken, async (req, res) => {
  try {
    const sessionNif = req.user?.nif ? String(req.user.nif).trim() : '';
    if (!sessionNif) return res.status(400).json({ error: 'nif_obligatorio' });

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    let inserted = 0, updated = 0, duplicated = 0;

    for (const r of items) {
      const empresa  = String(r.empresa || "").trim();
      const contacto = String(r.contacto || "").trim();
      const email    = String(r.email || "").trim();
      const telefono = String(r.telefono || "").trim();
      const estado   = Number(r.estado) ? 1 : 0;

      if (!empresa || !contacto || !telefono) { duplicated++; continue; }

      const [[existTel]] = await db.query(
        `SELECT id FROM clientes WHERE nif=? AND telefono=? LIMIT 1`, [sessionNif, telefono]
      );

      if (existTel) {
        await db.query(
          `UPDATE clientes SET empresa=?, contacto=?, email=?, estado=? WHERE id=?`,
          [empresa, email || null, email ? email : null, estado, existTel.id]
        );
        updated++;
      } else {
        await db.query(
          `INSERT INTO clientes (id, empresa, contacto, email, telefono, estado, nif)
           VALUES (UUID(), ?,?,?,?,?,?)`,
          [empresa, contacto, email || null, telefono, estado, sessionNif]
        );
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
