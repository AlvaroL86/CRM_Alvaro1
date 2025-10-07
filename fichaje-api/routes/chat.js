const express = require('express');
const router = express.Router();
const db = require('../db');
const authMW = require('../middleware/auth');
const { randomUUID } = require('crypto');

const {
  getUserNif,
  ensureGroup,
  resolveRoomIdForUser,
} = require('../utils/rooms');

/* Online últimos 10 min */
router.get('/online', authMW, async (req, res) => {
  try {
    const nif = await getUserNif(req.user.id);
    const [rows] = await db.query(
      `SELECT id, COALESCE(nombre, username, email) AS nombre
         FROM usuarios
        WHERE nif=? AND last_seen > (NOW() - INTERVAL 10 MINUTE)`,
      [nif]
    );
    res.json(rows || []);
  } catch (e) {
    console.error('GET /chat/online', e);
    res.json([]);
  }
});

/* Listar rooms */
router.get('/rooms', authMW, async (req, res) => {
  try {
    const nif = await getUserNif(req.user.id);
    const type = String(req.query.type || '').toLowerCase();

    if (type === 'grupos') {
      const [rows] = await db.query(
        `SELECT id, nombre, slug, created_at
           FROM chat_rooms
          WHERE nif=? AND tipo='grupo'
          ORDER BY created_at DESC`, [nif]
      );
      return res.json(rows);
    }

    if (type === 'privados') {
      const [rows] = await db.query(
        `SELECT r.id, COALESCE(u.nombre, u.email, u.id) AS nombre
           FROM chat_rooms r
           JOIN chat_room_members m1 ON m1.room_id=r.id AND m1.user_id=?
           JOIN chat_room_members m2 ON m2.room_id=r.id AND m2.user_id<>?
      LEFT JOIN usuarios u ON u.id=m2.user_id
          WHERE r.nif=? AND r.tipo='privado'
          GROUP BY r.id
          ORDER BY r.created_at DESC`,
        [req.user.id, req.user.id, nif]
      );
      return res.json(rows);
    }

    res.json([]);
  } catch (e) {
    console.error('GET /chat/rooms', e);
    res.status(500).json({ error: 'Error al cargar salas' });
  }
});

/* Crear grupo */
router.post('/rooms', authMW, async (req, res) => {
  try {
    const nif = await getUserNif(req.user.id);
    const nombre = String(req.body?.nombre || '').trim();
    const members = Array.isArray(req.body?.members) ? req.body.members : [];
    if (!nombre) return res.status(400).json({ error: 'nombre_obligatorio' });

    const { id } = await ensureGroup(nif, nombre);

    const values = [
      [id, req.user.id, 'admin'],
      ...members.filter(x => x && x !== req.user.id).map(uid => [id, uid, 'miembro'])
    ];
    if (values.length) {
      await db.query(
        `INSERT IGNORE INTO chat_room_members (room_id, user_id, rol, created_at)
         VALUES ${values.map(()=>'(?,?,?,NOW())').join(',')}`,
        values.flat()
      );
    }

    res.status(201).json({ id, nombre, tipo: 'grupo' });
  } catch (e) {
    console.error('POST /chat/rooms', e);
    res.status(500).json({ error: 'No se pudo crear el grupo' });
  }
});

/* Eliminar grupo (admin) */
router.delete('/rooms/:id', authMW, async (req, res) => {
  try {
    const id = String(req.params.id);
    const [[ok]] = await db.query(
      `SELECT r.id
         FROM chat_rooms r
         JOIN chat_room_members m ON m.room_id=r.id
        WHERE r.id=? AND r.tipo='grupo' AND m.user_id=? AND m.rol='admin'
        LIMIT 1`,
      [id, req.user.id]
    );
    if (!ok) return res.status(403).json({ error: 'no_admin' });

    await db.query(`DELETE FROM chat_messages WHERE room_id=?`, [id]);
    await db.query(`DELETE FROM chat_room_members WHERE room_id=?`, [id]);
    await db.query(`DELETE FROM chat_rooms WHERE id=?`, [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /chat/rooms/:id', e);
    res.status(500).json({ error: 'No se pudo eliminar' });
  }
});

/* Abrir/asegurar privado */
router.post('/rooms/private', authMW, async (req, res) => {
  try {
    const me = req.user.id;
    const other = String(req.body?.userId || '').trim();
    if (!other) return res.status(400).json({ error: 'userId_obligatorio' });
    if (other === me) return res.status(400).json({ error: 'no_self' });

    const [[yo]] = await db.query(`SELECT id,nif,nombre FROM usuarios WHERE id=? LIMIT 1`, [me]);
    const [[el]] = await db.query(`SELECT id,nombre,email FROM usuarios WHERE id=? LIMIT 1`, [other]);
    if (!yo || !el) return res.status(404).json({ error: 'usuario_no_encontrado' });

    const [a, b] = [me, other].sort();
    const slug = `p:${a}:${b}`;

    const [[exist]] = await db.query(
      `SELECT id,nombre FROM chat_rooms WHERE nif=? AND slug=? LIMIT 1`, [yo.nif, slug]
    );

    let roomId = exist?.id;
    let visible = exist?.nombre;

    if (!roomId) {
      roomId = randomUUID().replace(/-/g,'');
      visible = el?.nombre || el?.email || 'Privado';
      await db.query(
        `INSERT INTO chat_rooms (id, nombre, slug, tipo, nif, created_at)
         VALUES (?, ?, ?, 'privado', ?, NOW())`,
        [roomId, visible, slug, yo.nif]
      );
      await db.query(
        `INSERT IGNORE INTO chat_room_members (room_id, user_id, rol, created_at)
         VALUES (?,?,'miembro',NOW()), (?,?,'miembro',NOW())`,
        [roomId, me, roomId, other]
      );
    }

    res.json({ id: roomId, nombre: visible, tipo: 'privado' });
  } catch (e) {
    console.error('POST /chat/rooms/private', e);
    res.status(500).json({ error: 'No se pudo abrir el privado' });
  }
});

/* Historial */
router.get('/messages', authMW, async (req, res) => {
  try {
    const userId = req.user.id;
    const room = req.query.room || 'general';
    const limit = Math.min(parseInt(req.query.limit || '200', 10), 500);
    const before = req.query.before ? new Date(req.query.before) : null;

    const roomId = await resolveRoomIdForUser(userId, room);

    let sql = `
      SELECT m.id, m.room_id, m.user_id,
             COALESCE(m.cuerpo, m.text) AS text,
             m.tipo, m.file_url, m.created_at,
             COALESCE(u.nombre, u.email, m.user_id) AS from_nombre
        FROM chat_messages m
   LEFT JOIN usuarios u ON u.id = m.user_id
       WHERE m.room_id = ?`;
    const params = [roomId];

    if (before && !isNaN(before.getTime())) { sql += ' AND m.created_at < ?'; params.push(before); }
    sql += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(limit);

    const [rows] = await db.query(sql, params);
    rows.reverse();

    res.json(rows.map(r => ({
      id: r.id, room_id: r.room_id, user_id: r.user_id,
      text: r.text, tipo: r.tipo, file_url: r.file_url,
      created_at: r.created_at, from: { id: r.user_id, nombre: r.from_nombre },
    })));
  } catch (e) {
    console.error('GET /chat/messages', e);
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
});

/* Miembros del grupo */
router.get('/room/:id/members', authMW, async (req, res) => {
  try {
    const roomId = String(req.params.id);
    const [rows] = await db.query(
      `SELECT m.user_id, m.rol, u.nombre, u.email
         FROM chat_room_members m
    LEFT JOIN usuarios u ON u.id=m.user_id
        WHERE m.room_id=?
     ORDER BY m.rol DESC, u.nombre ASC`, [roomId]
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /chat/room/:id/members', e);
    res.status(500).json({ error: 'Error miembros' });
  }
});

/* Invitar a grupo (admin) */
router.post('/room/:id/invite', authMW, async (req, res) => {
  try {
    const roomId = String(req.params.id);
    const userIds = Array.isArray(req.body?.userIds) ? req.body.userIds : [];

    const [[adm]] = await db.query(
      `SELECT 1 AS ok FROM chat_room_members WHERE room_id=? AND user_id=? AND rol='admin' LIMIT 1`,
      [roomId, req.user.id]
    );
    if (!adm) return res.status(403).json({ error: 'no_admin' });

    if (!userIds.length) return res.json({ ok: true, added: 0 });

    const values = userIds.map(uid => [roomId, uid, 'miembro']);
    await db.query(
      `INSERT IGNORE INTO chat_room_members (room_id, user_id, rol, created_at)
       VALUES ${values.map(()=>'(?,?,?,NOW())').join(',')}`,
      values.flat()
    );

    res.json({ ok: true, added: values.length });
  } catch (e) {
    console.error('POST /chat/room/:id/invite', e);
    res.status(500).json({ error: 'No se pudo invitar' });
  }
});

/* Cambiar rol (admin/miembro) */
router.patch('/room/:id/members/:userId', authMW, async (req, res) => {
  try {
    const roomId = String(req.params.id);
    const target = String(req.params.userId);
    const rol = req.body?.rol === 'admin' ? 'admin' : 'miembro';

    const [[adm]] = await db.query(
      `SELECT 1 AS ok FROM chat_room_members WHERE room_id=? AND user_id=? AND rol='admin' LIMIT 1`,
      [roomId, req.user.id]
    );
    if (!adm) return res.status(403).json({ error: 'no_admin' });

    await db.query(
      `UPDATE chat_room_members SET rol=? WHERE room_id=? AND user_id=?`,
      [rol, roomId, target]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error('PATCH /chat/room/:id/members/:userId', e);
    res.status(500).json({ error: 'No se pudo actualizar el rol' });
  }
});

/* Listar usuarios (mismo NIF). Si no hay ninguno, fallback a todos (excepto yo). */
router.get('/users', authMW, async (req, res) => {
  try {
    const nif = await getUserNif(req.user.id);
    const q = String(req.query.q || '').trim();

    let sql = `SELECT id, nombre, email FROM usuarios WHERE nif=?`;
    const params = [nif];
    if (q) { sql += ` AND (nombre LIKE ? OR email LIKE ?)`; params.push(`%${q}%`, `%${q}%`); }
    sql += ` ORDER BY nombre ASC LIMIT 100`;
    let [rows] = await db.query(sql, params);

    if (!rows.length) {
      let sql2 = `SELECT id, nombre, email FROM usuarios WHERE id<>?`;
      const params2 = [req.user.id];
      if (q) { sql2 += ` AND (nombre LIKE ? OR email LIKE ?)`; params2.push(`%${q}%`, `%${q}%`); }
      sql2 += ` ORDER BY nombre ASC LIMIT 100`;
      [rows] = await db.query(sql2, params2);
    }
    res.json(rows);
  } catch (e) {
    console.error('GET /chat/users', e);
    res.status(500).json({ error: 'Error usuarios' });
  }
});

module.exports = router;
