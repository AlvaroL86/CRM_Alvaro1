// routes/fichajes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, (req, res) => {
  res.json({ message: 'Fichajes obtenidos correctamente', user: req.user });
});

router.post('/', authMiddleware, (req, res) => {
  const { tipo } = req.body;
  res.json({ message: 'Fichaje registrado', tipo, user: req.user });
});

module.exports = router;
