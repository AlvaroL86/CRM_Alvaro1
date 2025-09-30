// fichaje-api/routes/chat.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// crea tablas si no existen (idempotente)
async function ensure() {
  await db.query(`CREATE TABLE IF NOT EXISTS chat_rooms(
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id VARCHAR(36) NULL,
    is_group TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await db.query(`CREATE TABLE IF NOT EXISTS chat_room_members(
    room_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role ENUM('owner','admin','member') DEFAULT 'member',
    PRIMARY KEY(room_id,user_id),
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await db.query(`CREATE TABLE IF NOT EXISTS chat_messages(
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    room_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(36) NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX(room_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}
ensure().catch(console.error);

// GET /chat/messages?room=general&limit=200&before=2025-09-29T23:59:59.000Z
router.get('/messages', async (req, res) => {
  const room = (req.query.room || 'general').trim();
  const limit = Math.min(parseInt(req.query.limit || '200', 10), 500);
  const before = req.query.before;

  const sql = `
    SELECT id, room_id, user_id, text, created_at
    FROM chat_messages
    WHERE room_id = ?
    ${before ? 'AND created_at < ?' : ''}
    ORDER BY created_at DESC
    LIMIT ?
  `;
  const params = before ? [room, before, limit] : [room, limit];

  try {
    const [rows] = await db.query(sql, params);
    rows.reverse(); // ascendente para el UI
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
