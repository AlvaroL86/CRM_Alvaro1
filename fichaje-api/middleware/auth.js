// fichaje-api/middleware/auth.js
const { verify } = require('../lib/jwt');
const db = require('../db');

async function touchLastSeen(userId) {
  try {
    if (!userId) return;
    await db.query(`UPDATE usuarios SET last_seen = NOW() WHERE id=?`, [userId]);
  } catch (e) {
    if (e?.code !== 'ER_BAD_FIELD_ERROR') {
      console.warn('touchLastSeen warn:', e.code || e.message);
    }
  }
}

module.exports = async function verificarToken(req, res, next) {
  try {
    const auth = req.headers['authorization'] || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const token = bearer || req.query?.token || req.body?.token;
    if (!token) return res.status(401).json({ error: 'No autorizado' });

    // 1) Verifica token (misma secret que en login)
    const payload = verify(token); // { id, username, rol, nif? }

    // 2) Asegura NIF (muchas rutas lo usan)
    let nif = payload.nif || null;
    if (!nif && payload.id) {
      try {
        const [[row]] = await db.query('SELECT nif FROM usuarios WHERE id=? LIMIT 1', [payload.id]);
        nif = row?.nif || null;
      } catch {}
    }

    req.usuario = {
      id: payload.id,
      username: payload.username,
      rol: payload.rol,
      nif,
    };

    // 3) Presencia (no bloquea)
    touchLastSeen(req.usuario.id);

    next();
  } catch (e) {
    console.error('Auth middleware error:', e.message);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
