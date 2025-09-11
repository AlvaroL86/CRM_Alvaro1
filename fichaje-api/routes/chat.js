// fichaje-api/routes/chat.js
const router = require('express').Router();
const db = require('../db');
const verificar = require('../middleware/auth');

/* ───────────────────────────────────────────────
   Asegurar sala "General" por NIF
─────────────────────────────────────────────── */
async function ensureGeneral(nif) {
  const [rows] = await db.query(
    `SELECT id FROM chat_rooms WHERE nif=? AND tipo='general' LIMIT 1`,
    [nif]
  );
  if (rows.length) return rows[0].id;

  const [[idRow]] = await db.query(`SELECT UUID() AS id`);
  const roomId = idRow.id;

  await db.query(
    `INSERT INTO chat_rooms (id, nombre, tipo, nif, created_at)
     VALUES (?, 'General', 'general', ?, NOW())`,
    [roomId, nif]
  );
  return roomId;
}

/* ───────────────────────────────────────────────
   ONLINE: usuarios vistos últimos 2 minutos
   (si no existe last_seen, devolvemos [])
─────────────────────────────────────────────── */
router.get('/online', verificar, async (req, res) => {
  try {
    const { nif } = req.usuario;

    const [[{ has_col }]] = await db.query(
      `SELECT COUNT(*) AS has_col
         FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'usuarios'
          AND COLUMN_NAME = 'last_seen'`
    );

    if (!has_col) return res.json([]); // fallback silencioso

    const [rows] = await db.query(
      `SELECT id, username, nombre, email
         FROM usuarios
        WHERE nif=?
          AND last_seen IS NOT NULL
          AND last_seen > (NOW() - INTERVAL 2 MINUTE)
        ORDER BY nombre, username`,
      [nif]
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /chat/online', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

/* ───────────────────────────────────────────────
   GENERAL: devuelve (y asegura) la sala General
─────────────────────────────────────────────── */
router.get('/general', verificar, async (req, res) => {
  try {
    const { nif } = req.usuario;
    const id = await ensureGeneral(nif);
    res.json({ id, nombre: 'General', tipo: 'general' });
  } catch (e) {
    console.error('GET /chat/general', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

/* ───────────────────────────────────────────────
   LISTAR SALAS por tipo
   type = general | grupo | privado | guardado | ''(todas del usuario)
─────────────────────────────────────────────── */
router.get('/rooms', verificar, async (req, res) => {
  try {
    const { nif, id: userId } = req.usuario;
    const type = (req.query.type || '').trim();

    if (type === 'general') {
      const id = await ensureGeneral(nif);
      return res.json([{ id, nombre: 'General', tipo: 'general' }]);
    }

    let where = `r.nif=?`;
    const params = [nif];

    if (type) {
      where += ` AND r.tipo=?`;
      params.push(type);
    }

    const [rows] = await db.query(
      `SELECT r.id, r.nombre, r.tipo, r.created_at
         FROM chat_rooms r
    LEFT JOIN chat_members m ON m.room_id = r.id AND m.user_id = ?
        WHERE ${where}
          AND (r.tipo='general' OR r.tipo='guardado' OR m.user_id IS NOT NULL)
        GROUP BY r.id
        ORDER BY r.tipo, r.nombre`,
      [userId, ...params]
    );

    res.json(rows);
  } catch (e) {
    console.error('GET /chat/rooms', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

/* ───────────────────────────────────────────────
   HISTÓRICO (últimos 30 días) con paginado simple
   ?room=<roomId>&limit=50&before=ISO
─────────────────────────────────────────────── */
router.get('/history', verificar, async (req, res) => {
  try {
    const { nif } = req.usuario;
    const roomId = req.query.room || (await ensureGeneral(nif));
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const before = req.query.before ? new Date(req.query.before) : null;

    const params = [roomId];
    let where = `m.room_id=? AND m.created_at >= (NOW() - INTERVAL 30 DAY)`;
    if (before) { where += ` AND m.created_at < ?`; params.push(before); }

    const [rows] = await db.query(
      `SELECT m.id,
              m.room_id,
              m.user_id,
              COALESCE(u.nombre, u.username) AS nombre,
              m.cuerpo AS text,
              m.created_at
         FROM chat_messages m
    LEFT JOIN usuarios u ON u.id = m.user_id
        WHERE ${where}
        ORDER BY m.created_at DESC
        LIMIT ${limit}`,
      params
    );

    res.json({ roomId, messages: rows });
  } catch (e) {
    console.error('GET /chat/history', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

/* ───────────────────────────────────────────────
   CREAR SALA (grupo o privado)
─────────────────────────────────────────────── */
router.post('/rooms', verificar, async (req, res) => {
  try {
    const { nif, id: userId } = req.usuario;
    const { name, type = 'grupo', members = [] } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: 'name requerido' });

    const [[idRow]] = await db.query(`SELECT UUID() AS id`);
    const roomId = idRow.id;

    const tipo = type === 'privado' ? 'privado' : (type === 'general' ? 'general' : 'grupo');

    await db.query(
      `INSERT INTO chat_rooms (id, nombre, tipo, nif, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [roomId, name.trim(), tipo, nif]
    );

    // Creador + miembros (únicos). Si añades columna role en chat_members,
    // aquí podrías insertar role='admin' para el creador.
    const uniq = Array.from(new Set([userId, ...members])).filter(Boolean);
    for (const uid of uniq) {
      await db.query(
        `INSERT INTO chat_members (id, room_id, user_id, joined_at)
         VALUES (UUID(), ?, ?, NOW())`,
        [roomId, uid]
      );
    }

    res.status(201).json({ id: roomId });
  } catch (e) {
    console.error('POST /chat/rooms', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

/* ───────────────────────────────────────────────
   ENVIAR MENSAJE (REST) -> inserta y EMITE a la sala
   (incluye clientId para que el front quite su eco)
─────────────────────────────────────────────── */
router.post('/messages', verificar, async (req, res) => {
  try {
    const io = req.app.get('io'); // asegúrate de hacer app.set('io', io) en index.js
    const { id: userId, nif } = req.usuario;
    let { roomId, text, clientId } = req.body || {};

    if (!roomId) roomId = await ensureGeneral(nif);
    text = (text || '').trim();
    if (!text) return res.status(400).json({ error: 'text requerido' });

    const [[msgIdRow]] = await db.query(`SELECT UUID() AS id`);
    const msgId = msgIdRow.id;

    await db.query(
      `INSERT INTO chat_messages (id, room_id, user_id, cuerpo, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [msgId, roomId, userId, text]
    );

    const [[msg]] = await db.query(
      `SELECT m.id,
              m.room_id,
              m.user_id,
              COALESCE(u.nombre, u.username) AS nombre,
              m.cuerpo AS text,
              m.created_at
         FROM chat_messages m
    LEFT JOIN usuarios u ON u.id = m.user_id
        WHERE m.id=?`,
      [msgId]
    );

    const payload = { ...msg, clientId: clientId || null };
    if (io) io.to(roomId).emit('chat:message', payload);
    res.status(201).json(payload);
  } catch (e) {
    console.error('POST /chat/messages', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /chat/members?room=<roomId>  -> miembros con online boolean
router.get('/members', verificar, async (req, res) => {
  try {
    const { room: roomId } = req.query;
    if (!roomId) return res.status(400).json({ error: 'room requerido' });

    // ¿existe last_seen?
    const [[{ has_col }]] = await db.query(
      `SELECT COUNT(*) AS has_col
         FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'usuarios'
          AND COLUMN_NAME = 'last_seen'`
    );

    const [rows] = await db.query(
      `SELECT u.id, COALESCE(u.nombre,u.username) AS nombre,
              ${has_col ? "IF(u.last_seen IS NOT NULL AND u.last_seen > (NOW() - INTERVAL 2 MINUTE),1,0)" : "0"} AS online
         FROM chat_members m
         JOIN usuarios u ON u.id=m.user_id
        WHERE m.room_id=?`,
      [roomId]
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /chat/members', e);
    res.status(500).json({ error: 'Error interno' });
  }
});
module.exports = router;
