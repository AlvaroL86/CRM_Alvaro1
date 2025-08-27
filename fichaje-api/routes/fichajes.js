const express = require('express');
const router = express.Router();
const db = require('../db');
const verificarToken = require('./middleware/auth'); // ← correcto
const moment = require('moment');


// Obtener fichajes (admin ve todos, usuario solo los suyos)
router.get('/', verificarToken, async (req, res) => {
  try {
    let query;
    let params = [];

    if (req.usuario.rol === 'admin') {
      query = 'SELECT * FROM fichajes ORDER BY fecha_hora DESC';
    } else {
      query = 'SELECT * FROM fichajes WHERE usuario_id = ? ORDER BY fecha_hora DESC';
      params = [req.usuario.id];
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('❌ Error al obtener fichajes:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Registrar un nuevo fichaje
router.post('/', verificarToken, async (req, res) => {
  const { tipo, motivo, fecha_hora, duracion } = req.body;
  const usuario_id = req.usuario.id;

  try {
    const query = `
      INSERT INTO fichajes (usuario_id, tipo, motivo, fecha_hora, duracion)
      VALUES (?, ?, ?, ?, ?)
    `;
    await db.query(query, [usuario_id, tipo, motivo, fecha_hora, duracion]);
    res.status(201).json({ mensaje: 'Fichaje registrado correctamente' });
  } catch (error) {
    console.error('❌ Error al registrar fichaje:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Calcular tiempo total trabajado (sumando entrada/salida)
router.get('/tiempo-trabajado', verificarToken, async (req, res) => {
  const usuario_id = req.usuario.id;

  try {
    const [fichajes] = await db.query(
      `SELECT tipo, fecha_hora
       FROM fichajes
       WHERE usuario_id = ?
       ORDER BY fecha_hora ASC`,
      [usuario_id]
    );

    let totalMinutos = 0;
    let entradaActual = null;

    for (const ficha of fichajes) {
      if (ficha.tipo === 'entrada') {
        entradaActual = moment(ficha.fecha_hora);
      } else if (ficha.tipo === 'salida' && entradaActual) {
        const salida = moment(ficha.fecha_hora);
        const minutos = salida.diff(entradaActual, 'minutes');
        totalMinutos += minutos;
        entradaActual = null;
      }
    }

    const horas = Math.floor(totalMinutos / 60);
    const minutosRestantes = totalMinutos % 60;

    res.json({
      usuario_id,
      tiempo_total: `${horas}h ${minutosRestantes}min`,
      minutos_totales: totalMinutos
    });

  } catch (error) {
    console.error('❌ Error al calcular tiempo trabajado:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
router.get('/estado-actual', verificarToken, async (req, res) => {
  const usuario_id = req.usuario.id;

  try {
    const [result] = await db.query(
      `SELECT tipo, fecha_hora
       FROM fichajes
       WHERE usuario_id = ?
       ORDER BY fecha_hora DESC
       LIMIT 1`,
      [usuario_id]
    );

    if (result.length === 0) {
      return res.json({ estado: 'sin actividad' });
    }

    const ultimo = result[0];

    let estado;
    switch (ultimo.tipo) {
      case 'entrada':
        estado = 'trabajando';
        break;
      case 'pausa':
        estado = 'pausa';
        break;
      case 'vuelta':
        estado = 'descanso terminado';
        break;
      case 'salida':
        estado = 'fuera';
        break;
      default:
        estado = 'desconocido';
    }

    res.json({
      estado,
      ultima_accion: ultimo.tipo,
      fecha_hora: ultimo.fecha_hora
    });

  } catch (error) {
    console.error('❌ Error al obtener estado actual:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});
router.get('/tiempo-hoy', verificarToken, async (req, res) => {
  const usuario_id = req.usuario.id;

  try {
    // Obtener fichajes de hoy ordenados por fecha
    const [fichajes] = await db.query(
      `SELECT tipo, fecha_hora
       FROM fichajes
       WHERE usuario_id = ?
       AND DATE(fecha_hora) = CURDATE()
       ORDER BY fecha_hora ASC`,
      [usuario_id]
    );

    let totalMinutos = 0;
    let entradaActual = null;

    for (const ficha of fichajes) {
      if (ficha.tipo === 'entrada') {
        entradaActual = moment(ficha.fecha_hora);
      } else if (ficha.tipo === 'salida' && entradaActual) {
        const salida = moment(ficha.fecha_hora);
        const minutos = salida.diff(entradaActual, 'minutes');
        totalMinutos += minutos;
        entradaActual = null;
      }
    }

    const horas = Math.floor(totalMinutos / 60);
    const minutosRestantes = totalMinutos % 60;

    res.json({
      fecha: moment().format('YYYY-MM-DD'),
      tiempo_trabajado: `${horas}h ${minutosRestantes}min`,
      minutos_totales: totalMinutos
    });

  } catch (error) {
    console.error('❌ Error al calcular tiempo trabajado hoy:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});
router.get('/resumen-admin', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso restringido a administradores' });
  }

  try {
    // 1. Obtener todos los usuarios
    const [usuarios] = await db.query('SELECT id, username FROM usuarios');

    const resumen = [];

    for (const usuario of usuarios) {
      const userId = usuario.id;

      // 2. Último fichaje
      const [ultimoFichaje] = await db.query(
        `SELECT tipo, fecha_hora
         FROM fichajes
         WHERE usuario_id = ?
         ORDER BY fecha_hora DESC
         LIMIT 1`,
        [userId]
      );

      // 3. Fichajes de hoy
      const [fichajesHoy] = await db.query(
        `SELECT tipo, fecha_hora
         FROM fichajes
         WHERE usuario_id = ?
         AND DATE(fecha_hora) = CURDATE()
         ORDER BY fecha_hora ASC`,
        [userId]
      );

      // Calcular tiempo trabajado hoy
      let totalMinutos = 0;
      let entradaActual = null;

      for (const ficha of fichajesHoy) {
        if (ficha.tipo === 'entrada') {
          entradaActual = moment(ficha.fecha_hora);
        } else if (ficha.tipo === 'salida' && entradaActual) {
          const salida = moment(ficha.fecha_hora);
          totalMinutos += salida.diff(entradaActual, 'minutes');
          entradaActual = null;
        }
      }

      // Determinar estado actual
      let estado = 'sin actividad';
      if (ultimoFichaje.length > 0) {
        switch (ultimoFichaje[0].tipo) {
          case 'entrada': estado = 'trabajando'; break;
          case 'pausa': estado = 'en pausa'; break;
          case 'vuelta': estado = 'descanso terminado'; break;
          case 'salida': estado = 'fuera'; break;
          default: estado = 'desconocido';
        }
      }

      resumen.push({
        usuario: usuario.username,
        estado,
        ultimo_fichaje: ultimoFichaje[0]?.fecha_hora || null,
        tiempo_trabajado_hoy: `${Math.floor(totalMinutos / 60)}h ${totalMinutos % 60}min`
      });
    }

    res.json(resumen);

  } catch (error) {
    console.error('❌ Error en resumen admin:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});
