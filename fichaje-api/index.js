// index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const db = require("./db");
const authMW = require("./middleware/auth");
const { randomUUID } = require("crypto");
const { resolveRoomIdForUser, ensureGeneralIdForUser } = require("./utils/rooms");

const app = express();

/* ---------- CORS ---------- */
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) =>
      !origin || allowedOrigins.includes(origin)
        ? cb(null, true)
        : cb(new Error("CORS: origin not allowed")),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
// Evita el error de path-to-regexp con '*'
app.options(/.*/, cors());

app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

/* ---------- Rutas ---------- */
app.use("/auth", require("./routes/auth"));
app.use("/clientes", authMW, require("./routes/clientes"));
app.use("/usuarios", authMW, require("./routes/usuarios"));
app.use("/ausencias", authMW, require("./routes/ausencias"));
app.use("/fichajes", authMW, require("./routes/fichajes"));
app.use("/tickets", authMW, require("./routes/tickets"));
app.use("/roles", authMW, require("./routes/roles"));
app.use("/chat", require("./routes/chat")); // rutas de chat (incluye /chat/upload)

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ---------- HTTP + Socket.IO ---------- */
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});
app.set("io", io);

/* ---------- Presencia + chat sockets ---------- */
const online = new Map(); // userId -> { id, nombre, nif, socketId }

io.on("connection", (socket) => {
  socket.on("auth:hello", async (u) => {
    if (!u?.id) return;
    socket.data.user = { id: u.id, nombre: u.nombre || "", nif: u.nif || null };
    online.set(u.id, {
      id: u.id,
      nombre: socket.data.user.nombre,
      nif: socket.data.user.nif,
      socketId: socket.id,
    });

    try {
      const roomId = await ensureGeneralIdForUser(u.id);
      socket.join(roomId);
      socket.emit("chat:joined", { room: "general", roomId });
    } catch {}

    io.emit("presence:list", Array.from(online.values()));
  });

  // Unirse a una sala por alias o id
  socket.on("chat:join", async ({ room }) => {
    const user = socket.data.user;
    if (!user?.id) return;
    try {
      const roomId = await resolveRoomIdForUser(user.id, room);
      socket.join(roomId);
      socket.emit("chat:joined", { room, roomId });
    } catch (e) {
      console.warn("chat:join error", e.message);
    }
  });

  /**
   * Enviar mensaje (alias o id). Ahora acepta:
   * - texto normal
   * - mensajes con adjunto: { tipo, file_url } (imagen, audio, archivo, video)
   */
  socket.on("chat:send", async ({ room = "general", text, tipo, file_url }) => {
    const from = socket.data.user;
    if (!from?.id) return;
    const payloadText = (text || "").trim();
    const hasFile = !!file_url;
    if (!payloadText && !hasFile) return;

    try {
      const roomId = await resolveRoomIdForUser(from.id, room);
      const now = new Date();
      const id = randomUUID().replace(/-/g, "");
      const finalTipo = hasFile ? (tipo || "archivo") : "texto";

      await db.query(
        "INSERT INTO chat_messages (id, room_id, user_id, cuerpo, tipo, file_url, created_at) VALUES (?,?,?,?,?,?,?)",
        [id, roomId, from.id, payloadText || null, finalTipo, file_url || null, now]
      );

      const msg = {
        id,
        room_id: roomId,
        user_id: from.id,
        text: payloadText,
        tipo: finalTipo,
        file_url: file_url || null,
        created_at: now.toISOString(),
        from: { id: from.id, nombre: from.nombre },
      };
      io.to(roomId).emit("chat:message", msg);
    } catch (e) {
      console.warn("socket chat:send error:", e.message);
    }
  });

  /**
   * Enviar indicando room ya resuelta (o slug/id). También acepta adjuntos.
   */
  socket.on("chat:send-room", async ({ roomId, message }) => {
    const from = socket.data.user || message?.from;
    if (!from?.id) return;

    const payloadText = (message?.text || "").trim();
    const hasFile = !!message?.file_url;
    if (!payloadText && !hasFile) return;

    try {
      const rid = await resolveRoomIdForUser(from.id, roomId);
      const now = new Date();
      const id = message.id || randomUUID().replace(/-/g, "");
      const finalTipo = hasFile ? (message.tipo || "archivo") : "texto";

      await db.query(
        "INSERT INTO chat_messages (id, room_id, user_id, cuerpo, tipo, file_url, created_at) VALUES (?,?,?,?,?,?,?)",
        [id, rid, from.id, payloadText || null, finalTipo, message.file_url || null, now]
      );

      const msg = {
        id,
        room_id: rid,
        user_id: from.id,
        text: payloadText,
        tipo: finalTipo,
        file_url: message.file_url || null,
        created_at: now.toISOString(),
        from: { id: from.id, nombre: from.nombre },
      };
      io.to(rid).emit("chat:message", msg);
    } catch (e) {
      console.warn("socket chat:send-room error:", e.message);
    }
  });

  socket.on("disconnect", () => {
    const u = socket.data.user;
    if (u) {
      online.delete(u.id);
      io.emit("presence:list", Array.from(online.values()));
    }
  });
});

/* ---------- Zona horaria SQL ---------- */
(async () => {
  try {
    await db.query("SET time_zone = 'SYSTEM'");
  } catch (e) {
    console.warn("No se pudo fijar time_zone:", e.message);
  }
})();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ API http://localhost:${PORT}`));

module.exports = app;
