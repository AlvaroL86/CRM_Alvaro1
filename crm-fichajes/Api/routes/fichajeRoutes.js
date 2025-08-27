const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middlewares/authMiddleware");

// GET /api/fichajes - obtener todos los fichajes del usuario
router.get("/", authMiddleware, (req, res) => {
  const { nif } = req.user;

  db.query("SELECT * FROM fichajes WHERE nif = ?", [nif], (err, results) => {
    if (err) return res.status(500).json({ message: "Error en la base de datos" });
    res.json({ message: "Fichajes obtenidos correctamente", fichajes: results });
  });
});

// POST /api/fichajes - registrar nuevo fichaje
router.post("/", authMiddleware, (req, res) => {
  console.log("📌 Llamada recibida en POST /api/fichajes");

  const { tipo } = req.body;
  const { nif } = req.user;

  if (!tipo) return res.status(400).json({ message: "El campo 'tipo' es obligatorio" });

  db.query(
    "INSERT INTO fichajes (tipo, fecha_hora, nif) VALUES (?, NOW(), ?)",
    [tipo, nif],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Error al guardar fichaje" });
      res.json({
        message: "Fichaje registrado correctamente",
        fichaje: {
          id: result.insertId,
          tipo,
          fecha_hora: new Date(),
          nif
        }
      });
    }
  );
});

module.exports = router;
