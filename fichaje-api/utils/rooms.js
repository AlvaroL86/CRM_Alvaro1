// fichaje-api/utils/rooms.js
const db = require('../db');
const { randomUUID } = require('crypto');

const uuid = () => randomUUID().replace(/-/g, '');
const toKebab = (s = '') =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function getUserNif(userId) {
  const [[row]] = await db.query(`SELECT nif FROM usuarios WHERE id=? LIMIT 1`, [userId]);
  return row?.nif || null;
}

async function ensureGeneralIdForUser(userId) {
  const nif = await getUserNif(userId);
  if (!nif) throw new Error('nif_missing');

  const slug = 'general';
  const [[exist]] = await db.query(
    `SELECT id FROM chat_rooms WHERE nif=? AND slug=? LIMIT 1`, [nif, slug]
  );

  let roomId = exist?.id;
  if (!roomId) {
    roomId = uuid();
    await db.query(
      `INSERT INTO chat_rooms (id, nombre, tipo, nif, slug, created_at)
       VALUES (?, 'General', 'general', ?, ?, NOW())`,
      [roomId, nif, slug]
    );
  }

  await db.query(
    `INSERT IGNORE INTO chat_room_members (room_id, user_id, rol, created_at)
     VALUES (?, ?, 'miembro', NOW())`,
    [roomId, userId]
  );

  return roomId;
}

async function ensureGroup(nif, nombre /* descripcion ignorada */) {
  const base = toKebab(nombre || 'grupo');
  const slug = `g:${base}`;

  const [[exist]] = await db.query(
    `SELECT id, nombre FROM chat_rooms WHERE nif=? AND slug=? LIMIT 1`,
    [nif, slug]
  );
  if (exist) return { id: exist.id, nombre: exist.nombre };

  const id = uuid();
  await db.query(
    `INSERT INTO chat_rooms (id, nombre, tipo, nif, slug, created_at)
     VALUES (?, ?, 'grupo', ?, ?, NOW())`,
    [id, nombre, nif, slug]
  );
  return { id, nombre };
}

async function ensurePrivateRoom(nif, userA, userB) {
  const [a, b] = [String(userA), String(userB)].sort();
  const slug = `p:${a}:${b}`;

  const [[exist]] = await db.query(
    `SELECT id, nombre FROM chat_rooms WHERE nif=? AND slug=? LIMIT 1`,
    [nif, slug]
  );
  if (exist) return exist.id;

  const id = uuid();
  await db.query(
    `INSERT INTO chat_rooms (id, nombre, tipo, nif, slug, created_at)
     VALUES (?, 'Privado', 'privado', ?, ?, NOW())`,
    [id, nif, slug]
  );

  await db.query(
    `INSERT IGNORE INTO chat_room_members (room_id, user_id, rol, created_at)
     VALUES (?, ?, 'miembro', NOW()), (?, ?, 'miembro', NOW())`,
    [id, a, id, b]
  );

  return id;
}

async function resolveRoomIdForUser(userId, room) {
  // ✅ aquí estaba el bug: hay que pasar userId, NO el NIF
  if (room === 'general') {
    return await ensureGeneralIdForUser(userId);
  }

  const [[ok]] = await db.query(
    `SELECT 1 AS ok FROM chat_room_members WHERE room_id=? AND user_id=? LIMIT 1`,
    [room, userId]
  );
  if (!ok) throw new Error('no_member');
  return room;
}

module.exports = {
  getUserNif,
  ensureGeneralIdForUser,
  ensureGroup,
  ensurePrivateRoom,
  resolveRoomIdForUser,
};
