// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const db = require('./db');
const authMW = require('./middleware/auth');

const app = express();

/* ---------- CORS ---------- */
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => (!origin || allowedOrigins.includes(origin)) ? cb(null, true) : cb(new Error('CORS: origin not allowed')),
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json());

/* ---------- rutas ---------- */
app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/auth', require('./routes/auth'));
app.use('/clientes',  authMW, require('./routes/clientes'));
app.use('/usuarios',  authMW, require('./routes/usuarios'));
app.use('/ausencias', authMW, require('./routes/ausencias'));
app.use('/fichajes',  authMW, require('./routes/fichajes'));
app.use('/tickets',   authMW, require('./routes/tickets'));

/* NUEVO: roles (para UsersRoles.jsx) */
app.use('/roles',     authMW, require('./routes/roles'));

/* Chat REST */
app.use('/chat',      authMW, require('./routes/chat'));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ---------- HTTP + Socket.IO ---------- */
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET','POST','PUT','DELETE'] }
});
app.set('io', io);

/* ---------- Chat sockets ---------- */
const { randomUUID } = require('crypto');
const { resolveRoomIdForUser, ensureGeneralIdForUser } = require('./utils/rooms');

const online = new Map(); // userId -> { id, nombre, socketId }

io.on('connection', (socket) => {
  // handshake de presencia
  socket.on('auth:hello', (u) => {
    if (!u?.id) return;
    socket.data.user = { id: u.id, nombre: u.nombre || '' };
    online.set(u.id, { id: u.id, nombre: socket.data.user.nombre, socketId: socket.id });
    io.emit('presence:list', Array.from(online.values()));
  });

  // Unirse a sala (acepta slug o id)
  socket.on('chat:join', async ({ room }) => {
    const user = socket.data.user;
    if (!user?.id) return;
    try {
      const roomId = await resolveRoomIdForUser(user.id, room);
      socket.join(roomId);
      socket.emit('chat:joined', { room, roomId });
    } catch (_) {}
  });

  // Enviar a sala "general" o a una sala concreta (slug o id)
  socket.on('chat:send', async ({ room = 'general', text }) => {
    const from = socket.data.user;
    if (!from || !text?.trim()) return;
    try {
      const roomId = await resolveRoomIdForUser(from.id, room);
      const now = new Date();
      const id = randomUUID();
      // Guardamos en CUERPO (coherente con tu BD)
      await db.query(
        'INSERT INTO chat_messages (id, room_id, user_id, cuerpo, tipo, created_at) VALUES (?,?,?,?,?,?)',
        [id, roomId, from.id, text.trim(), 'texto', now]
      );
      const msg = { id, room_id: roomId, text: text.trim(), from, created_at: now.toISOString() };
      io.to(roomId).emit('chat:message', msg);
    } catch (e) {
      console.warn('chat save fail:', e.message);
    }
  });

  // Variante explícita con roomId
  socket.on('chat:send-room', async ({ roomId, message }) => {
    const from = socket.data.user || message?.from;
    if (!from || !message?.text?.trim()) return;
    try {
      // si te pasan slug por error, lo resolvemos
      const rid = await resolveRoomIdForUser(from.id, roomId);
      const now = new Date();
      const id = message.id || randomUUID();
      await db.query(
        'INSERT INTO chat_messages (id, room_id, user_id, cuerpo, tipo, created_at) VALUES (?,?,?,?,?,?)',
        [id, rid, from.id, message.text.trim(), 'texto', now]
      );
      const msg = { id, room_id: rid, text: message.text.trim(), from, created_at: now.toISOString() };
      io.to(rid).emit('chat:message', msg);
    } catch (e) {
      console.warn('chat save fail:', e.message);
    }
  });

  socket.on('disconnect', () => {
    const u = socket.data.user;
    if (u) {
      online.delete(u.id);
      io.emit('presence:list', Array.from(online.values()));
    }
  });
});

/* ---------- Ajuste zona horaria ---------- */
(async () => {
  try { await db.query("SET time_zone = 'SYSTEM'"); }
  catch (e) { console.warn("No se pudo fijar time_zone:", e.message); }
})();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ API http://localhost:${PORT}`));

module.exports = app;
