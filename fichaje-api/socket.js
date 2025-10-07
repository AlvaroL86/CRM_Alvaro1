// fichaje-api/socket.js
const jwt = require('jsonwebtoken');
const db = require('./db');
const { getUserNif, resolveRoomId, getGeneralRoomId } = require('./utils/rooms');

function getUserFromToken(token) {
  if (!token) return null;
  try {
    const p = jwt.verify(token, process.env.JWT_SECRET || 'miclavesecreta123');
    return { id: p?.id || p?.user?.id || null };
  } catch { return null; }
}

function initSocket(server) {
  const { Server } = require('socket.io');
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', async (socket) => {
    // 1) auth inicial (handshake)
    const token = socket.handshake?.auth?.token || socket.handshake?.query?.token;
    const baseUser = getUserFromToken(token);
    if (baseUser?.id) {
      const [rows] = await db.query(`SELECT id, nombre, nif FROM usuarios WHERE id=? LIMIT 1`, [baseUser.id]);
      socket.user = rows[0] || { id: baseUser.id, nombre: null, nif: null };
    } else {
      socket.user = null;
    }

    // 2) auth:hello mejora datos
    socket.on('auth:hello', async (u) => {
      try {
        if (!socket.user?.id && u?.id) socket.user = { id: u.id, nombre: u.nombre || null, nif: null };
        if (!socket.user?.nif && socket.user?.id) {
          const nif = await getUserNif(socket.user.id);
          socket.user.nif = nif || null;
        }
        // join a General
        if (socket.user?.nif) {
          const generalId = await getGeneralRoomId(socket.user.nif);
          socket.join(generalId);
        }
        // presencia
        io.emit('presence:list', Array.from(io.sockets.sockets.values()).map(s => ({
          id: s.user?.id, nombre: s.user?.nombre, nif: s.user?.nif
        })).filter(x => x.id));
      } catch {}
    });

    // 3) unirse a sala por alias o id
    socket.on('chat:join', async ({ room }) => {
      try {
        if (!socket.user?.id) return;
        const nif = socket.user?.nif || await getUserNif(socket.user.id);
        if (!nif) return;
        const roomId = await resolveRoomId(room || 'general', nif);
        socket.join(roomId);
      } catch {}
    });
    socket.on('chat:leave', async ({ room }) => {
      try {
        if (!socket.user?.id) return;
        const nif = socket.user?.nif || await getUserNif(socket.user.id);
        if (!nif) return;
        const roomId = await resolveRoomId(room || 'general', nif);
        socket.leave(roomId);
      } catch {}
    });

    // 4) enviar mensaje
    socket.on('chat:send', async ({ room = 'general', text = '', tipo = null, file_url = null }) => {
      try {
        const t = String(text || '').trim();
        if (!t || !socket.user?.id) return;
        const nif = socket.user?.nif || await getUserNif(socket.user.id);
        if (!nif) return;

        const roomId = await resolveRoomId(room, nif);
        const [ins] = await db.query(
          `INSERT INTO chat_messages (room_id, user_id, text, tipo, file_url, created_at)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [roomId, socket.user.id, t, tipo, file_url]
        );
        const [rows] = await db.query(
          `SELECT id, room_id, user_id, text, tipo, file_url, created_at
           FROM chat_messages WHERE id=? LIMIT 1`, [ins.insertId]
        );

        const msg = rows[0];
        io.to(roomId).emit('chat:message', {
          id: msg.id,
          room_id: msg.room_id,
          user_id: msg.user_id,
          text: msg.text,
          tipo: msg.tipo,
          file_url: msg.file_url,
          created_at: msg.created_at,
        });
      } catch (e) {
        console.error('socket chat:send error', e.message);
      }
    });

    socket.on('disconnect', () => {
      io.emit('presence:list', Array.from(io.sockets.sockets.values()).map(s => ({
        id: s.user?.id, nombre: s.user?.nombre, nif: s.user?.nif
      })).filter(x => x.id));
    });
  });

  return io;
}

module.exports = { initSocket };
