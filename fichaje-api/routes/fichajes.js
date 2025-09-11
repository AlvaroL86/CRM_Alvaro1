// routes/fichajes.js
// -----------------------------------------------------------
// Gestión de fichajes (entradas/pausas/vueltas/salidas)
// - Todas las escrituras usan la hora del servidor (NOW()).
// - Endpoints:
//   GET    /fichajes                → lista de fichajes (admin: todos de su NIF; user: solo los suyos)
//   POST   /fichajes                → inserta un fichaje (tipo y motivo). Fecha = NOW()
//   GET    /fichajes/tiempo-trabajado  → tiempo total acumulado (emparejando entrada/salida)
//   GET    /fichajes/estado-actual     → último estado del usuario autenticado
//   GET    /fichajes/tiempo-hoy        → tiempo trabajado SOLO hoy
//   GET    /fichajes/activo            → estado “running/paused/stop”, startedAt y pausedMs
//   GET    /fichajes/resumen-admin     → resumen por usuario (solo admins del mismo NIF)
// -----------------------------------------------------------

const express = require('express');
const router = express.Router();
const db = require('../db');
const verificarToken = require('../middleware/auth');
const moment = require('moment');

// -----------------------------------------------------------
// Utils comunes
// -----------------------------------------------------------

/**
 * Devuelve los últimos fichajes del usuario autenticado (máx 200),
 * restringidos por NIF y user_id.
 */
async function getUltimos(req) {
  const { nif, id: user_id } = req.usuario;
  const [rows] = await db.query(
    `SELECT tipo, motivo, fecha_hora
       FROM fichajes
      WHERE nif = ? AND user_id = ?
      ORDER BY fecha_hora DESC
      LIMIT 200`,
    [nif, user_id]
  );
  return rows;
}

/**
 * Busca hacia atrás la última 'entrada' o 'vuelta' para saber desde cuándo
 * se considera “en marcha” (running). Si no hay, devuelve null.
 */
function pickStartedAt(rows) {
  for (const r of rows) {
    const t = String(r.tipo || '').toLowerCase();
    if (t === 'entrada' || t === 'vuelta') return r.fecha_hora;
    if (t === 'salida') break; // si encontramos una salida previa, se corta el tramo
  }
  return null;
}

/**
 * Devuelve el tipo de la última acción (en minúsculas) o null.
 */
function lastAction(rows) {
  return rows?.[0]?.tipo ? String(rows[0].tipo).toLowerCase() : null;
}

/**
 * Calcula minutos acumulados emparejando 'entrada' con 'salida'
 * dentro de un array de fichajes ORDENADO ASC por fecha_hora.
 */
function calcularMinutosTrabajados(fichajesAsc) {
  let totalMinutos = 0;
  let entradaActual = null;

  for (const f of fichajesAsc) {
    const tipo = String(f.tipo || '').toLowerCase();
    if (tipo === 'entrada' || tipo === 'vuelta') {
      entradaActual = moment(f.fecha_hora);
    } else if ((tipo === 'salida' || tipo === 'pausa') && entradaActual) {
      const finTramo = moment(f.fecha_hora);
      const minutos = finTramo.diff(entradaActual, 'minutes');
      if (minutos > 0) totalMinutos += minutos;
      entradaActual = null;
    }
  }
  return totalMinutos;
}

// -----------------------------------------------------------
// GET /fichajes
// - Admin: ve TODOS los fichajes de su NIF (empresa).
// - Empleado: ve SOLO sus fichajes.
// -----------------------------------------------------------
router.get('/', verificarToken, async (req, res) => {
  try {
    const { rol, id: user_id, nif } = req.usuario;

    if (rol === 'admin') {
      // Admin ve SOLO su empresa (mismo NIF)
      const [rows] = await db.query(
        `SELECT user_id, tipo, motivo, fecha_hora, duracion, nif
           FROM fichajes
          WHERE nif = ?
          ORDER BY fecha_hora DESC`,
        [nif]
      );
      return res.json(rows);
    } else {
      // Empleado ve SOLO los suyos
      const [rows] = await db.query(
        `SELECT user_id, tipo, motivo, fecha_hora, duracion, nif
           FROM fichajes
          WHERE user_id = ?
          ORDER BY fecha_hora DESC`,
        [user_id]
      );
      return res.json(rows);
    }
  } catch (e) {
    console.error('❌ GET /fichajes', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// -----------------------------------------------------------
// POST /fichajes
// - Inserta un fichaje usando SIEMPRE la hora del servidor (NOW()).
// - Ignora cualquier fecha que mande el front.
// - Campos esperados en body: { tipo, motivo? , duracion? }
//   * tipo: 'entrada' | 'pausa' | 'vuelta' | 'salida' (validar en front)
// -----------------------------------------------------------
router.post('/', verificarToken, async (req, res) => {
  try {
    const { id: user_id, nif } = req.usuario;
    const { tipo, motivo = null, duracion = null } = req.body || {};

    if (!tipo) {
      return res.status(400).json({ error: 'El campo "tipo" es obligatorio' });
    }

    // Grabamos SIEMPRE con NOW() → evita desfases de reloj del cliente
    await db.query(
      `INSERT INTO fichajes (uuid, user_id, nif, tipo, motivo, fecha_hora, duracion)
       VALUES (UUID(), ?, ?, ?, ?, NOW(), ?)`,
      [user_id, nif, tipo, motivo, duracion]
    );

    res.status(201).json({ ok: true });
  } catch (e) {
    console.error('❌ POST /fichajes', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// -----------------------------------------------------------
/**
 * GET /fichajes/tiempo-trabajado
 * - Calcula el tiempo TOTAL (minutos) emparejando entrada/salida
 *   para el usuario autenticado (todas las fechas).
 */
// -----------------------------------------------------------
router.get('/tiempo-trabajado', verificarToken, async (req, res) => {
  const user_id = req.usuario.id;
  try {
    // Importante: la tabla tiene columna user_id (no usuario_id)
    const [fichajes] = await db.query(
      `SELECT tipo, fecha_hora
         FROM fichajes
        WHERE user_id = ?
        ORDER BY fecha_hora ASC`,
      [user_id]
    );

    const totalMinutos = calcularMinutosTrabajados(fichajes);
    const horas = Math.floor(totalMinutos / 60);
    const minutosRestantes = totalMinutos % 60;

    res.json({
      user_id,
      tiempo_total: `${horas}h ${minutosRestantes}min`,
      minutos_totales: totalMinutos
    });
  } catch (error) {
    console.error('❌ Error al calcular tiempo trabajado:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// -----------------------------------------------------------
// GET /fichajes/estado-actual
// - Devuelve estado textual del último fichaje del usuario:
//   'trabajando' (entrada), 'en pausa' (pausa), 'descanso terminado' (vuelta),
//   'fuera' (salida) o 'sin actividad' si no hay fichajes.
// -----------------------------------------------------------
router.get('/estado-actual', verificarToken, async (req, res) => {
  try {
    const { id: user_id } = req.usuario;
    const [rows] = await db.query(
      `SELECT tipo, fecha_hora
         FROM fichajes
        WHERE user_id = ?
        ORDER BY fecha_hora DESC
        LIMIT 1`,
      [user_id]
    );

    let estado = 'sin actividad';
    if (rows.length) {
      switch (String(rows[0].tipo).toLowerCase()) {
        case 'entrada': estado = 'trabajando'; break;
        case 'pausa':   estado = 'en pausa'; break;
        case 'vuelta':  estado = 'descanso terminado'; break;
        case 'salida':  estado = 'fuera'; break;
        default:        estado = rows[0].tipo;
      }
    }

    res.json({
      estado,
      ultima_accion: rows[0]?.tipo || null,
      fecha_hora: rows[0]?.fecha_hora || null
    });
  } catch (e) {
    console.error('❌ GET /fichajes/estado-actual', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// -----------------------------------------------------------
// GET /fichajes/tiempo-hoy
// - Igual que tiempo-trabajado pero restringido a la fecha actual (CURDATE()).
// -----------------------------------------------------------
router.get('/tiempo-hoy', verificarToken, async (req, res) => {
  const user_id = req.usuario.id;

  try {
    const [fichajes] = await db.query(
      `SELECT tipo, fecha_hora
         FROM fichajes
        WHERE user_id = ?
          AND DATE(fecha_hora) = CURDATE()
        ORDER BY fecha_hora ASC`,
      [user_id]
    );

    const totalMinutos = calcularMinutosTrabajados(fichajes);
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

// -----------------------------------------------------------
// GET /fichajes/activo
// - Devuelve:
//    { estado: 'running' | 'paused' | 'stop',
//      startedAt: fecha desde la última 'entrada'/'vuelta' (si aplica),
//      pausedMs: milisegundos transcurridos en la pausa actual (si está pausado),
//      running: boolean }
// - Útil para temporizador en el front.
// -----------------------------------------------------------
router.get('/activo', verificarToken, async (req, res) => {
  try {
    const rows = await getUltimos(req);       // últimos del usuario (mismo NIF)
    const last = lastAction(rows);

    // Mapeo a estados de máquina sencillos
    let estado = 'stop';
    if (last === 'pausa') estado = 'paused';
    if (last === 'entrada' || last === 'vuelta') estado = 'running';

    const startedAt = estado === 'stop' ? null : pickStartedAt(rows);

    // Si está en pausa, medimos cuánto lleva en la pausa actual
    let pausedMs = 0;
    if (estado === 'paused' && rows[0]?.fecha_hora) {
      const d = new Date(rows[0].fecha_hora).getTime();
      pausedMs = Date.now() - d;
    }

    res.json({ estado, startedAt, pausedMs, running: estado === 'running' });
  } catch (e) {
    console.error('❌ GET /fichajes/activo', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// -----------------------------------------------------------
// GET /fichajes/resumen-admin
// - Solo admins. Lista por usuario: estado actual, último fichaje y
//   tiempo trabajado HOY.
// - Filtrado por NIF del admin (empresa).
// -----------------------------------------------------------
router.get('/resumen-admin', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso restringido a administradores' });
  }

  try {
    const { nif } = req.usuario;

    // 1) Usuarios de la misma empresa (NIF)
    const [usuarios] = await db.query(
      'SELECT id, username FROM usuarios WHERE nif = ?',
      [nif]
    );

    const resumen = [];

    for (const usuario of usuarios) {
      const userId = usuario.id;

      // 2) Último fichaje del usuario
      const [ultimoFichaje] = await db.query(
        `SELECT tipo, fecha_hora
           FROM fichajes
          WHERE user_id = ?
          ORDER BY fecha_hora DESC
          LIMIT 1`,
        [userId]
      );

      // 3) Fichajes de HOY del usuario
      const [fichajesHoy] = await db.query(
        `SELECT tipo, fecha_hora
           FROM fichajes
          WHERE user_id = ?
            AND DATE(fecha_hora) = CURDATE()
          ORDER BY fecha_hora ASC`,
        [userId]
      );

      // 4) Cálculo de minutos de hoy
      const totalMinutos = calcularMinutosTrabajados(fichajesHoy);

      // 5) Estado a partir del último fichaje
      let estado = 'sin actividad';
      if (ultimoFichaje.length > 0) {
        switch (String(ultimoFichaje[0].tipo).toLowerCase()) {
          case 'entrada': estado = 'trabajando'; break;
          case 'pausa':   estado = 'en pausa'; break;
          case 'vuelta':  estado = 'descanso terminado'; break;
          case 'salida':  estado = 'fuera'; break;
          default:        estado = 'desconocido';
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

module.exports = router;
