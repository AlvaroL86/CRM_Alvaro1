// fichaje-api/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const db = require('./db');

const app = express();

/* -------- CORS -------- */
const ALLOWED = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => (!origin || ALLOWED.includes(origin)) ? cb(null, true) : cb(new Error('CORS: origin not allowed')),
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* -------- Auth MW (debe ir ANTES de montar rutas que lo usan) -------- */
const authMW = require('./middleware/auth');

/* -------- Rutas REST -------- */
app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/auth',      require('./routes/auth'));
app.use('/clientes',  authMW, require('./routes/clientes'));
app.use('/usuarios',  authMW, require('./routes/usuarios'));
app.use('/fichajes',  authMW, require('./routes/fichajes'));
app.use('/roles',     authMW, require('./routes/roles'));

// Chat REST (histórico)
const chatRoutes = require('./routes/chat');
app.use('/chat', authMW, chatRoutes);

/* -------- HTTP + Socket.IO -------- */
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ALLOWED, methods: ['GET','POST','PUT','DELETE'] }
});
app.set('io', io);

/* -------- Utilidades chat -------- */
const online = new Map(); // userId -> { id, nombre, socketId }

function dmRoomId(a, b) {
  const [x, y] = [String(a), String(b)].sort();
  return `dm:${x}:${y}`;
}

async function saveMessage(room, from, text, at) {
  try {
    await db.query(
      'INSERT INTO chat_messages (room_id, user_id, text, created_at) VALUES (?,?,?,?)',
      [room, from?.id ?? null, text, new Date(at || Date.now())]
    );
  } catch (e) {
    console.warn('chat save fail:', e.message);
  }
}

/* -------- Socket.IO -------- */
io.on('connection', (socket) => {
  // Identificación/presencia
  socket.on('auth:hello', (user) => {
    if (!user?.id) return;
    socket.data.user = { id: String(user.id), nombre: user.nombre || '' };
    online.set(socket.data.user.id, { id: socket.data.user.id, nombre: socket.data.user.nombre, socketId: socket.id });
    io.emit('presence:list', Array.from(online.values()));
  });

  // Unirse/dejar rooms
  socket.on('chat:join', (room) => {
    const roomId = typeof room === 'string' ? room : room?.roomId;
    if (!roomId) return;
    socket.join(roomId);
  });
  socket.on('chat:leave', (room) => {
    const roomId = typeof room === 'string' ? room : room?.roomId;
    if (!roomId) return;
    socket.leave(roomId);
  });

  // Envío (general, grupos, DMs)
  socket.on('chat:send', async ({ room, text }) => {
    const from = socket.data.user;
    if (!from || !room || !text?.trim()) return;
    const msg = {
      id: Date.now(),
      room_id: room,
      text: text.trim(),
      from,
      created_at: new Date().toISOString(),
    };

    await saveMessage(room, from, msg.text, msg.created_at);
    io.to(room).emit('chat:message', msg);

    // Si es DM, avisa al otro aunque no esté en la room
    if (room.startsWith('dm:')) {
      const parts = room.split(':'); // dm:id1:id2
      const otherId = parts[1] === from.id ? parts[2] : parts[1];
      const rec = online.get(otherId);
      if (rec?.socketId) {
        io.to(rec.socketId).emit('chat:dm-notify', {
          room, from, preview: msg.text, at: msg.created_at,
        });
      }
    }
  });

  // Desconexión
  socket.on('disconnect', () => {
    const u = socket.data.user;
    if (u) {
      online.delete(u.id);
      io.emit('presence:list', Array.from(online.values()));
    }
  });
});

/* -------- Ajuste zona horaria DB -------- */
(async () => {
  try {
    await db.query("SET time_zone = 'SYSTEM'");
    console.log("DB time_zone = SYSTEM");
  } catch (e) {
    console.warn("No se pudo fijar time_zone:", e.message);
  }
})();

/* -------- Arranque -------- */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ API escuchando en http://localhost:${PORT}`);
});
