// fichaje-api/lib/jwt.js
const jwt = require('jsonwebtoken');

const SECRET = (process.env.JWT_SECRET || 'secretito').trim();   // una sola fuente de verdad
const EXPIRES = process.env.JWT_EXPIRES || '12h';

module.exports = {
  SECRET,
  sign(payload, opts = {}) {
    return jwt.sign(payload, SECRET, { expiresIn: EXPIRES, ...opts });
  },
  verify(token) {
    return jwt.verify(token, SECRET);
  }
};
