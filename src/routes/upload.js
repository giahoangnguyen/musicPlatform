const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const UploadController = require('../controllers/uploadController');
const { authenticateToken } = require('../middleware/auth');
// mirror TS middleware names/behavior
const { uploadAvatar, uploadCover, uploadAudio, uploadMultipleImages } = require('../middleware/fileUpload');

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
});
const serveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/upload/avatar  (form-data: avatar)
router.post('/avatar', authenticateToken, uploadLimiter, uploadAvatar.single('avatar'), UploadController.uploadUserAvatar);

// POST /api/upload/artist/:artistId/image   (form-data: image)
router.post('/artist/:artistId/image', authenticateToken, uploadLimiter, uploadCover.single('image'), UploadController.uploadArtistImage);

// POST /api/upload/artist/:artistId/background   (form-data: background)
router.post('/artist/:artistId/background', authenticateToken, uploadLimiter, uploadCover.single('background'), UploadController.uploadArtistBackground);

// POST /api/upload/album/:albumId/cover   (form-data: cover)
router.post('/album/:albumId/cover', authenticateToken, uploadLimiter, uploadCover.single('cover'), UploadController.uploadAlbumCover);

// POST /api/upload/playlist/:playlistId/cover   (form-data: cover)
router.post('/playlist/:playlistId/cover', authenticateToken, uploadLimiter, uploadCover.single('cover'), UploadController.uploadPlaylistCover);

// POST /api/upload/track/:trackId/audio   (form-data: audio)
router.post('/track/:trackId/audio', authenticateToken, uploadLimiter, uploadAudio.single('audio'), UploadController.uploadTrackAudio);

// POST /api/upload/track/:trackId/image   (form-data: image)
router.post('/track/:trackId/image', authenticateToken, uploadLimiter, uploadCover.single('image'), UploadController.uploadTrackImage);

// POST /api/upload/images  (form-data: images[]) — up to 5
router.post('/images', authenticateToken, uploadLimiter, uploadMultipleImages.array('images', 5), UploadController.uploadMultipleImages);

// GET /api/upload/serve/:type/:filename  (public, rate-limited)
router.get('/serve/:type/:filename', serveLimiter, UploadController.serveFile);

// GET /api/upload/info/:type/:filename   (authed)
router.get('/info/:type/:filename', authenticateToken, UploadController.getFileInfo);

// DELETE /api/upload/:type/:filename     (admin in TS comments; auth applied here)
router.delete('/:type/:filename', authenticateToken, uploadLimiter, UploadController.deleteUploadedFile);

module.exports = router;
