const express = require('express');
const router = express.Router();
const db = require('../db');
const verificarToken = require('./middleware/auth'); // ← correcto



// Obtener ausencias del usuario autenticado
router.get('/', verificarToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM ausencias WHERE user_id = ?',
      [req.usuario.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener ausencias:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Registrar nueva ausencia
router.post('/', verificarToken, async (req, res) => {
  const { tipo, motivo, fecha_inicio, fecha_fin } = req.body;
  const user_id = req.usuario.id; // 👈 nombre correcto

  try {
    const query = `
      INSERT INTO ausencias (user_id, tipo, motivo, fecha_inicio, fecha_fin)
      VALUES (?, ?, ?, ?, ?)
    `;
    await db.query(query, [user_id, tipo, motivo, fecha_inicio, fecha_fin]); // 👈 aquí igual
    res.status(201).json({ mensaje: 'Ausencia registrada correctamente' });
  } catch (error) {
    console.error('❌ Error al registrar ausencia:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Actualizar una ausencia existente
router.put('/:id', verificarToken, async (req, res) => {
  const { tipo, motivo, fecha_inicio, fecha_fin } = req.body;
  const user_id = req.usuario.id;
  const ausencia_id = req.params.id;

  try {
    const query = `
      UPDATE ausencias
      SET tipo = ?, motivo = ?, fecha_inicio = ?, fecha_fin = ?
      WHERE id = ? AND user_id = ?
    `;
    await db.query(query, [tipo, motivo, fecha_inicio, fecha_fin, ausencia_id, user_id]);
    res.json({ mensaje: 'Ausencia actualizada correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar ausencia:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Eliminar una ausencia
router.delete('/:id', verificarToken, async (req, res) => {
  const user_id = req.usuario.id;
  const ausencia_id = req.params.id;

  try {
    const query = `DELETE FROM ausencias WHERE id = ? AND user_id = ?`;
    await db.query(query, [ausencia_id, user_id]);
    res.json({ mensaje: 'Ausencia eliminada correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar ausencia:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
