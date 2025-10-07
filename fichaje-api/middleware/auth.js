// middleware/auth.js
const jwt = require('jsonwebtoken');
const db = require('../db');

function getToken(req) {
  const h = req.headers['authorization'] || '';
  if (h.startsWith('Bearer ')) return h.slice(7).trim();
  return req.headers['x-access-token'] || req.headers['token'] || req.query?.token || req.body?.token || null;
}

async function getUserRow(id) {
  if (!id) return null;
  const [rows] = await db.query(
    `SELECT id, nombre, username, email, nif, rol
     FROM usuarios WHERE id=? LIMIT 1`, [id]
  );
  return rows[0] || null;
}

module.exports = async function authMW(req, res, next) {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    const p = jwt.verify(token, process.env.JWT_SECRET || 'miclavesecreta123');
    const uid = p?.id || p?.user?.id;
    let user = await getUserRow(uid);

    if (!user) {
      // fallback mínimo si el usuario no existe en BD
      user = {
        id: uid,
        nombre: p?.nombre || p?.user?.nombre || null,
        nif: p?.nif || p?.user?.nif || null,
        rol: p?.rol || p?.user?.rol || null,
      };
    }

    // compat: muchas rutas antiguas leen req.usuario
    req.user = user;
    req.usuario = user;

    return next();
  } catch (e) {
    return res.status(401).json({ error: 'unauthorized' });
  }
};
