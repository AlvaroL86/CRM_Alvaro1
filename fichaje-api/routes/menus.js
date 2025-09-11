// fichaje-api/routes/menus.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const verificarToken = require('../middleware/auth');

// GET: menús + permisos de un usuario
router.get('/permisos/:userId', verificarToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const [menus] = await db.query(`SELECT * FROM menu_items ORDER BY orden, id`);
    const [perms] = await db.query(`SELECT * FROM user_menu_permissions WHERE user_id=?`, [userId]);
    res.json({ menus, permisos: perms });
  } catch (e) {
    console.error('❌ GET /menus/permisos/:userId', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST: guardar permisos
router.post('/permisos/:userId', verificarToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { permisos } = req.body; // [{menu_key, can_view, can_edit}]
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      for (const p of permisos) {
        await conn.query(
          `INSERT INTO user_menu_permissions (user_id, menu_key, can_view, can_edit)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE can_view=VALUES(can_view), can_edit=VALUES(can_edit)`,
          [userId, p.menu_key, p.can_view ? 1 : 0, p.can_edit ? 1 : 0]
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('❌ POST /menus/permisos/:userId', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
