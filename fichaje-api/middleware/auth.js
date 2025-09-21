// fichaje-api/middleware/auth.js
const jwt = require("jsonwebtoken");

const JWT_SECRET = (process.env.JWT_SECRET || "secretito").trim();

module.exports = function verificarToken(req, res, next) {
  try {
    const hdr = req.headers.authorization || "";
    const [, token] = hdr.split(" ");
    if (!token) return res.status(401).json({ error: "No autorizado" });

    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = payload;
    next();
  } catch (e) {
    console.error("Auth middleware error:", e.message);
    return res.status(401).json({ error: "No autorizado" });
  }
};
