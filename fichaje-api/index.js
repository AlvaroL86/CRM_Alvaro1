// index.js (BACKEND ARRANCABLE + AUTH COMO FUNCIÓN + LOG DE MONTAJE)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const db = require('./db');

// Tu middleware auth EXPORTA UNA FUNCIÓN (module.exports = async (req,res,next)=>{})
const authMW = require('./middleware/auth');

const app = express();

/* -------------------- CORS con varios orígenes -------------------- */
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Permite llamadas server-to-server (sin Origin) y desde orígenes permitidos
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS: origin not allowed'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: false, // usamos Bearer token, no cookies
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use('/auth', require('./routes/auth'));
app.use('/usuarios', require('./routes/usuarios'));

// estáticos de uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* -------------------- Helpers de carga/monte -------------------- */
function safeRequire(modulePath, mountPoint) {
  try {
    const mod = require(modulePath);
    const type = typeof mod;
    console.log(`[require] ${mountPoint}: ${type}`);
    return mod;
  } catch (e) {
    console.error(`❌ Error require ${mountPoint} (${modulePath}):`, e.message);
    return null;
  }
}

function mount(pathname, ...handlers) {
  try {
    console.log(`-> Mounting ${pathname} ...`);
    handlers.forEach((h, idx) => {
      if (typeof h !== 'function') {
        throw new Error(`Handler #${idx + 1} for ${pathname} is not a function (type=${typeof h})`);
      }
    });
    app.use(pathname, ...handlers);
    console.log(`✅ Mounted ${pathname}`);
  } catch (e) {
    console.error(`❌ Failed to mount ${pathname}: ${e.message}`);
    console.error(e.stack);
  }
}

/* -------------------- Rutas API -------------------- */
app.get('/health', (_req, res) => res.json({ ok: true }));

// Carga módulos de rutas
const authRoute      = safeRequire('./routes/auth', '/auth');
const clientesRoute  = safeRequire('./routes/clientes', '/clientes');
const usuariosRoute  = safeRequire('./routes/usuarios', '/usuarios');
const ausenciasRoute = safeRequire('./routes/ausencias', '/ausencias');
const fichajesRoute  = safeRequire('./routes/fichajes', '/fichajes');
const ticketsRoute   = safeRequire('./routes/tickets', '/tickets');
const chatRoute      = safeRequire('./routes/chat', '/chat');

// Montaje (usa authMW donde toque)
if (authRoute)      mount('/auth', authRoute);
if (clientesRoute)  mount('/clientes',  authMW, clientesRoute);
if (usuariosRoute)  mount('/usuarios',  authMW, usuariosRoute);
if (ausenciasRoute) mount('/ausencias', authMW, ausenciasRoute);
if (fichajesRoute)  mount('/fichajes',  authMW, fichajesRoute);
if (ticketsRoute)   mount('/tickets',   authMW, ticketsRoute);
if (chatRoute)      mount('/chat',      authMW, chatRoute);

/* -------------------- HTTP + Socket.IO -------------------- */
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Exponer io a las rutas Express (p.ej. /chat/messages emite al room)
app.set('io', io);

/* -------------------- PRESENCIA + CHAT (compat) -------------------- */
const online = new Map(); // userId -> { id, nombre, socketId }
const history = new Map(); // room -> [{userId,name,text,ts}]

function pushHistory(room, msg) {
  if (!history.has(room)) history.set(room, []);
  const arr = history.get(room);
  arr.push(msg);
  if (arr.length > 200) arr.shift();
}

io.on('connection', (socket) => {
  /* ===== Protocolo NUEVO ===== */
  socket.on('auth:hello', (user) => {
    if (!user?.id) return;
    socket.data.user = { id: user.id, nombre: user.nombre || '' };
    online.set(user.id, { id: user.id, nombre: socket.data.user.nombre, socketId: socket.id });
    io.emit('presence:list', Array.from(online.values()));
  });

  socket.on('chat:join', (payload) => {
    const roomId = typeof payload === 'string' ? payload : payload?.roomId || 'general';
    socket.join(roomId);
    const hist = history.get(roomId) || [];
    hist.forEach((m) => {
      socket.emit('chat:message', {
        id: m.ts,
        room_id: roomId,
        text: m.text,
        from: { id: m.userId, nombre: m.name },
        created_at: m.ts,
      });
    });
  });

  socket.on('chat:leave', ({ roomId }) => {
    if (roomId) socket.leave(roomId);
  });

  // Fallback (no escribe DB, solo broadcast + memoria para pruebas)
  socket.on('chat:send', ({ room = 'general', text }) => {
    const from = socket.data.user;
    if (!from || !text?.trim()) return;
    const msg = {
      id: Date.now(),
      room_id: room,
      text: text.trim(),
      from,
      created_at: new Date().toISOString(),
    };
    pushHistory(room, { userId: from.id, name: from.nombre, text: msg.text, ts: msg.created_at });
    io.to(room).emit('chat:message', msg);
  });

  /* ===== Compat: Protocolo ANTIGUO ===== */
  socket.on('register', ({ userId, name }) => {
    if (!userId) return;
    socket.data.user = { id: userId, nombre: name || '' };
    online.set(userId, { id: userId, nombre: name || '', socketId: socket.id });
    io.emit('online-users', Array.from(online.values()).map(u => ({ userId: u.id, name: u.nombre })));
  });

  socket.on('join', (roomId = 'general') => {
    socket.join(roomId);
    const hist = history.get(roomId) || [];
    hist.forEach((m) => socket.emit('mensaje', { payload: m, roomId }));
  });

  socket.on('mensaje', ({ roomId = 'general', payload }) => {
    const p = payload || {};
    if (!p.text?.trim()) return;
    const u = socket.data.user || { id: p.userId, nombre: p.name };
    const msg = {
      userId: u.id,
      name: u.nombre,
      text: p.text.trim(),
      ts: new Date().toISOString(),
    };
    pushHistory(roomId, msg);
    io.to(roomId).emit('mensaje', { roomId, payload: msg });
  });

  // Compat eventos alternativos
  socket.on('chat:join-room', ({ roomId }) => {
    const room = roomId || 'general';
    socket.join(room);
    const hist = history.get(room) || [];
    hist.forEach((m) => {
      socket.emit('chat:message', {
        id: m.ts,
        room_id: room,
        text: m.text,
        from: { id: m.userId, nombre: m.name },
        created_at: m.ts,
      });
    });
  });

  socket.on('chat:send-room', ({ roomId = 'general', message }) => {
    if (!message?.text?.trim()) return;
    const from = socket.data.user || message.from || { id: null, nombre: '' };
    const msg = {
      id: message.id || Date.now(),
      room_id: roomId,
      text: message.text.trim(),
      from,
      created_at: message.at || new Date().toISOString(),
    };
    pushHistory(roomId, { userId: from.id, name: from.nombre, text: msg.text, ts: msg.created_at });
    io.to(roomId).emit('chat:message', msg);
  });

  socket.on('chat:room-created', (payload) => {
    socket.broadcast.emit('chat:room-created', payload);
  });

  /* ===== Desconexión ===== */
  socket.on('disconnect', () => {
    const u = socket.data.user;
    if (u) {
      online.delete(u.id);
      io.emit('presence:list', Array.from(online.values()));
      io.emit('online-users', Array.from(online.values()).map(x => ({ userId: x.id, name: x.nombre })));
    }
  });
});

/* Endpoint histórico (para el front antiguo / compat) */
app.get('/chat/messages/:room', (req, res) => {
  const room = req.params.room || 'general';
  res.json(history.get(room) || []);
});

/* -------------------- Ajuste zona horaria DB -------------------- */
(async () => {
  try {
    await db.query("SET time_zone = 'SYSTEM'");
    console.log("DB time_zone = SYSTEM");
  } catch (e) {
    console.warn("No se pudo fijar time_zone:", e.message);
  }
})();

/* -------------------- Arranque -------------------- */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ API escuchando en http://localhost:${PORT}`);
});
app.get('/health', async (_req, res) => {
  try {
    const [[row]] = await db.query('SELECT DATABASE() AS db, @@port AS port');
    res.json({ ok: true, db: row.db, port: row.port });
  } catch (e) {
    res.status(500).json({ ok:false, error: e.message });
  }
});