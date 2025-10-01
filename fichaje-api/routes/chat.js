// fichaje-api/routes/chat.js
const express = require('express');
const router = express.Router();

const db = require('../db');
const authMW = require('../middleware/auth'); // tu ruta actual
const { resolveRoomId } = require('../utils/rooms');

// normaliza salida
function asContent(r) {
  return {
    id: r.id,
    room_id: r.room_id,
    user_id: r.user_id,
    text: r.text ?? r.cuerpo ?? '',
    tipo: r.tipo || null,
    file_url: r.file_url || null,
    created_at: r.created_at,
  };
}

/* =================== HISTÓRICO =================== */
// GET /chat/messages?room=general&limit=200&before=ISO
router.get('/messages', authMW, async (req, res) => {
  try {
    const user = req.user || {};
    const nif = user?.nif || null;

    const roomAlias = req.query.room || 'general';
    const limit = Math.min(parseInt(req.query.limit || '200', 10), 500);
    const before = req.query.before ? new Date(req.query.before) : null;

    const roomId = await resolveRoomId(roomAlias, nif);

    const params = [roomId];
    let sql = `
      SELECT id, room_id, user_id,
             COALESCE(text, cuerpo) AS text,
             tipo, file_url, created_at
      FROM chat_messages
      WHERE room_id = ?`;
    if (before && !isNaN(before.getTime())) {
      sql += ' AND created_at < ?';
      params.push(before);
    }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const [rows] = await db.query(sql, params);
    rows.reverse(); // cronológico ascendente
    res.json(rows.map(asContent));
  } catch (e) {
    console.error('GET /chat/messages error:', e);
    res.status(500).json({ error: e.message || 'Error al obtener mensajes' });
  }
});

/* =================== LISTA DE ROOMS =================== */
// GET /chat/rooms?type=guardados|privados|grupos|general (acepta sing/plural)
router.get('/rooms', authMW, async (req, res) => {
  try {
    const nif = req.user?.nif || null;
    const map = {
      guardado: 'guardados', guardados: 'guardados',
      privado: 'privados',   privados: 'privados',
      grupo: 'grupos',       grupos: 'grupos',
      general: 'general',
    };
    const raw = (req.query.type || '').toLowerCase();
    const type = map[raw] || raw || null;

    let sql = 'SELECT id, nombre, tipo FROM chat_rooms WHERE nif ' + (nif ? '= ?' : 'IS NULL');
    const params = nif ? [nif] : [];
    if (type) { sql += ' AND tipo=?'; params.push(type); }
    sql += ' ORDER BY nombre';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error('GET /chat/rooms error:', e);
    res.status(500).json({ error: e.message || 'Error al obtener salas' });
  }
});

/* =================== CREAR GRUPO =================== */
// POST /chat/rooms { nombre, descripcion? }
router.post('/rooms', authMW, async (req, res) => {
  try {
    const { nombre, descripcion } = req.body || {};
    const nif = req.user?.nif || null;
    if (!nombre?.trim()) return res.status(400).json({ error: 'Nombre requerido' });

    const id = require('crypto').randomUUID().replace(/-/g, '');
    await db.query(
      `INSERT INTO chat_rooms (id, nombre, tipo, nif, slug, created_at)
       VALUES (?, ?, 'grupos', ?, NULL, NOW())`,
      [id, nombre.trim(), nif]
    );
    res.status(201).json({ id, nombre, tipo: 'grupos', nif, descripcion: descripcion || '' });
  } catch (e) {
    console.error('POST /chat/rooms', e);
    res.status(500).json({ error: 'No se pudo crear el grupo' });
  }
});

module.exports = router;
