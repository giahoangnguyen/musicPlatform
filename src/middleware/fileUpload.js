const fs = require('fs');
const path = require('path');
const multer = require('multer');

const BASE = process.env.UPLOAD_DIR || 'uploads';
const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

const makeStorage = (sub) => multer.diskStorage({
  destination: (_req, _file, cb) => { const dir = path.join(BASE, sub); ensureDir(dir); cb(null, dir); },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '_').slice(0, 64);
    cb(null, `${Date.now()}_${name}${ext.toLowerCase()}`);
  }
});

const uploadAvatar = multer({ storage: makeStorage('avatars'), limits: { fileSize: 5 * 1024 * 1024 } });
const uploadCover  = multer({ storage: makeStorage('covers'),  limits: { fileSize: 10 * 1024 * 1024 } });
const uploadAudio  = multer({ storage: makeStorage('audio'),   limits: { fileSize: 100 * 1024 * 1024 } });
const uploadMultipleImages = multer({ storage: makeStorage('images'), limits: { fileSize: 10 * 1024 * 1024 } });

module.exports = { uploadAvatar, uploadCover, uploadAudio, uploadMultipleImages };
