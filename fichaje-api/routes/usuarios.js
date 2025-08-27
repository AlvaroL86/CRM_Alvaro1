const express = require('express');
const router = express.Router();
const db = require('../db');
const verificarToken = require('./middleware/auth'); // ✅ solo esta
const moment = require('moment');

// 1. Obtener todos los usuarios (solo admin)
router.get('/', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso restringido a administradores' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id, username, nombre, email, rol FROM usuarios'
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// 2. Obtener usuario por ID (opcional)
router.get('/:id', verificarToken, async (req, res) => {
  const usuario_id = req.params.id;

  try {
    const [rows] = await db.query(
      'SELECT id, username, nombre, email, rol FROM usuarios WHERE id = ?',
      [usuario_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('❌ Error al obtener usuario:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// 3. Obtener usuarios actualmente trabajando (último fichaje = entrada)
router.get('/online', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso restringido a administradores' });
  }

  try {
    const [usuarios] = await db.query('SELECT id, username FROM usuarios');
    const online = [];

    for (const usuario of usuarios) {
      const [ultimo] = await db.query(
        `SELECT tipo, fecha_hora
         FROM fichajes
         WHERE usuario_id = ?
         ORDER BY fecha_hora DESC
         LIMIT 1`,
        [usuario.id]
      );

      if (ultimo.length > 0 && ultimo[0].tipo === 'entrada') {
        online.push({
          usuario: usuario.username,
          entrada_hora: moment(ultimo[0].fecha_hora).format('HH:mm'),
          estado: 'trabajando'
        });
      }
    }

    res.json(online);

  } catch (error) {
    console.error('❌ Error al obtener usuarios online:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
