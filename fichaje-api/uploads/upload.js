const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const uploader = multer({ storage });

// recuerda que ya tienes: app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.post('/upload', authMW, uploader.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file requerido' });
  const url = `/uploads/${req.file.filename}`;
  const type = (req.file.mimetype || '').startsWith('audio/')
    ? 'audio'
    : (req.file.mimetype || '').startsWith('image/')
      ? 'image'
      : 'file';
  res.json({ url, filename: req.file.originalname, type });
});
