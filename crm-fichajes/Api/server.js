const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/authRoutes');
const fichajeRoutes = require('./routes/fichajeRoutes');

app.use('/api', authRoutes);
app.use('/api/fichajes', fichajeRoutes);

app.listen(3000, () => {
  console.log('Servidor iniciado en el puerto 3000');
});