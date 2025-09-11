const express = require('express');
const router = express.Router();
const db = require('../db');
const verificarToken = require('../middleware/auth');

// Métricas para tarjetas del dashboard
router.get('/metrics', verificarToken, async (req, res) => {
  try {
    const { rol, nif, id } = req.usuario;

    // Total usuarios de mi empresa
    const [[u]] = await db.query(`SELECT COUNT(*) as total FROM usuarios WHERE nif=? AND estado=1`, [nif]);

    // Tickets abiertos de mi empresa
    const [[t]] = await db.query(`SELECT COUNT(*) as abiertos FROM tickets WHERE nif=? AND estado IN ('abierto','en_progreso')`, [nif]);

    // Ausencias pendientes de mi empresa (si admin/supervisor) o mías
    let aQuery = `SELECT COUNT(*) as pend FROM ausencias WHERE estado='pendiente' AND nif=?`;
    let aParams = [nif];
    if (!['admin','supervisor'].includes(rol)) {
      aQuery = `SELECT COUNT(*) as pend FROM ausencias WHERE estado='pendiente' AND user_id=?`;
      aParams = [id];
    }
    const [[a]] = await db.query(aQuery, aParams);

    // Empleados en estado "trabajando" (último fichaje = entrada/vuelta) por empresa
    const [rows] = await db.query(
      `SELECT f.user_id, f.tipo FROM fichajes f
       JOIN (SELECT user_id, MAX(fecha_hora) as fmax FROM fichajes WHERE nif=? GROUP BY user_id) x
            ON x.user_id=f.user_id AND x.fmax=f.fecha_hora
       WHERE f.tipo IN ('entrada','vuelta')`, [nif]
    );
    const activos = rows.length;

    res.json({
      usuarios_activos: u.total,
      tickets_abiertos: t.abiertos,
      ausencias_pendientes: a.pend,
      trabajando: activos
    });
  } catch (e) {
    console.error('❌ GET /admin/metrics', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
