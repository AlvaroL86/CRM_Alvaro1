// fichaje-api/routes/ausencias.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const verificarToken = require('../middleware/auth');

// LISTAR mis ausencias
router.get('/', verificarToken, async (req, res) => {
  try {
    const { id } = req.usuario;
    const [rows] = await db.query(
      `SELECT id, tipo, motivo, fecha_inicio, fecha_fin, estado
         FROM ausencias
        WHERE user_id=?
        ORDER BY fecha_inicio DESC`,
      [id]
    );
    res.json(rows);
  } catch (e) {
    console.error('❌ GET /ausencias', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// CREAR ausencia (insert)
router.post('/', verificarToken, async (req, res) => {
  try {
    const { id: user_id, nif } = req.usuario;
    const { tipo, motivo, fecha_inicio, fecha_fin } = req.body;

    if (!tipo || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ error: 'tipo, fecha_inicio y fecha_fin son obligatorios' });
    }

    const ausId = (await db.query(`SELECT UUID() AS id`))[0][0].id;

    await db.query(
      `INSERT INTO ausencias (id, user_id, tipo, motivo, fecha_inicio, fecha_fin, estado, nif)
       VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?)`,
      [ausId, user_id, tipo, motivo || null, fecha_inicio, fecha_fin, nif]
    );

    res.status(201).json({ id: ausId });
  } catch (e) {
    console.error('❌ POST /ausencias', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// LISTAR ausencias de la empresa (admin/supervisor)
router.get('/empresa', verificarToken, async (req, res) => {
  try {
    const { rol, nif } = req.usuario;
    if (!['admin','supervisor'].includes(rol)) return res.status(403).json({ error: 'No autorizado' });

    const [rows] = await db.query(
      `SELECT a.id, a.tipo, a.motivo, a.fecha_inicio, a.fecha_fin, a.estado,
              u.nombre AS empleado, u.username
         FROM ausencias a
         JOIN usuarios u ON u.id=a.user_id
        WHERE a.nif=?
        ORDER BY a.fecha_inicio DESC`,
      [nif]
    );
    res.json(rows);
  } catch (e) {
    console.error('❌ GET /ausencias/empresa', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// CAMBIAR estado (admin/supervisor)
router.put('/:id/estado', verificarToken, async (req, res) => {
  try {
    const { rol, nif } = req.usuario;
    if (!['admin','supervisor'].includes(rol)) return res.status(403).json({ error: 'No autorizado' });

    const { id } = req.params;
    const { estado } = req.body; // 'aprobada' | 'rechazada'
    if (!['aprobada','rechazada'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const [ok] = await db.query(`SELECT id FROM ausencias WHERE id=? AND nif=?`, [id, nif]);
    if (!ok.length) return res.status(404).json({ error: 'Ausencia no encontrada' });

    await db.query(`UPDATE ausencias SET estado=? WHERE id=?`, [estado, id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('❌ PUT /ausencias/:id/estado', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
