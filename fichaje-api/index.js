const express = require('express');
const cors = require('cors');
const verificarToken = require('./routes/middleware/auth');
require('dotenv').config();

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Rutas
const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const fichajesRoutes = require('./routes/fichajes');
const ausenciasRoutes = require('./routes/ausencias');

// Ruta pública
app.use('/auth', authRoutes);

// Rutas protegidas (la protección ya está dentro de cada archivo de ruta)
app.use('/usuarios', usuariosRoutes);
app.use('/fichajes', fichajesRoutes);
app.use('/ausencias', ausenciasRoutes);

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API REST escuchando en http://localhost:${PORT}`);
});
