// fichaje-api/utils/rooms.js
const db = require('../db');
const { randomUUID } = require('crypto');

/** ---------- helpers ---------- */
function id64() {
  // id corto compatible para varchar(64)
  return randomUUID().replace(/-/g, '');
}

/** Devuelve el NIF del usuario */
async function getUserNif(userId) {
  const [rows] = await db.query('SELECT nif FROM usuarios WHERE id=? LIMIT 1', [userId]);
  return rows?.[0]?.nif || null;
}

/** Asegura y devuelve el id de la sala "General" para un NIF */
async function getGeneralRoomId(nif) {
  // 1) intentar encontrarla
  const [rows] = await db.query(
    `SELECT id FROM chat_rooms
     WHERE (nif = ? OR (? IS NULL AND nif IS NULL))
       AND (tipo='general' OR slug='general' OR nombre='General')
     ORDER BY created_at ASC
     LIMIT 1`,
    [nif || null, nif || null]
  );
  if (rows.length) return rows[0].id;

  // 2) crear si no existe
  const id = id64();
  await db.query(
    `INSERT INTO chat_rooms (id, nombre, tipo, nif, slug, created_at)
     VALUES (?, 'General', 'general', ?, 'general', NOW())`,
    [id, nif || null]
  );
  return id;
}

/**
 * Resuelve un alias/slug/id a id real para un NIF (tenant).
 * - 'general' | 'General' -> id de la general
 * - id existente -> ese id
 * - slug existente -> su id
 * Si no existe, cae a la general.
 */
async function resolveRoomId(roomOrAlias, nif) {
  const v = String(roomOrAlias || '').trim();
  if (!v || /^general$/i.test(v)) return getGeneralRoomId(nif);

  // ¿es un id exacto?
  const [[rowById]] = await db.query(`SELECT id FROM chat_rooms WHERE id=? LIMIT 1`, [v]);
  if (rowById?.id) return rowById.id;

  // ¿es un slug/nombre?
  const [rows] = await db.query(
    `SELECT id FROM chat_rooms
     WHERE (nif = ? OR (? IS NULL AND nif IS NULL))
       AND (slug = ? OR nombre = ?)
     LIMIT 1`,
    [nif || null, nif || null, v.toLowerCase(), v]
  );
  if (rows.length) return rows[0].id;

  // fallback: general
  return getGeneralRoomId(nif);
}

/** --------- compat (por si algo del front viejo lo usa) --------- */
async function ensureGeneralIdForUser(userId) {
  const nif = await getUserNif(userId);
  if (!nif) throw new Error('nif-not-found');
  return getGeneralRoomId(nif);
}

async function resolveRoomIdForUser(userId, room) {
  const nif = await getUserNif(userId);
  if (!nif) throw new Error('nif-not-found');
  return resolveRoomId(room, nif);
}

module.exports = {
  // principales
  getGeneralRoomId,
  resolveRoomId,
  // compat
  ensureGeneralIdForUser,
  resolveRoomIdForUser,
};
