const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.login = async (req, res) => {
  const { username, password } = req.body;

  console.log(`Intentando Login con: ${username}`);

  try {
    const [rows] = await db.execute('SELECT * FROM usuarios WHERE username = ?', [username]);

    if (rows.length === 0) {
      console.log("Usuario no encontrado");
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    const user = rows[0];

    console.log('Password recibido:', password);
    console.log('Password en BD:', user.password);

    const match = await bcrypt.compare(password, user.password);
    console.log('¿Coincide?', match);

    if (!match) return res.status(401).json({ message: 'Contraseña incorrecta' });

    const token = jwt.sign({
      id: user.id,
      username: user.username,
      role: user.rol,
      nif: user.nif
    }, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({ token, user: { id: user.id, username: user.username, role: user.rol, nif: user.nif } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error del servidor' });
  }
};
