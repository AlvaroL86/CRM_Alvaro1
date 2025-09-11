// fichaje-api/routes/upload.js
const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const verificar = require('../middleware/auth');

const dir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e6)}${ext}`);
  }
});
const upload = multer({ storage });

router.post('/', verificar, upload.single('file'), async (req, res) => {
  const f = req.file;
  if (!f) return res.status(400).json({ error: 'file requerido' });
  const url = `/uploads/${f.filename}`;
  const type = f.mimetype.startsWith('image/') ? 'file' : (f.mimetype.startsWith('audio/') ? 'file' : 'file');
  res.json({ url, type, filename: f.originalname });
});

module.exports = router;
