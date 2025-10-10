const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const V = require('../utils/validation');
const c = require('../controllers/trackController');
const { authenticateToken, optionalAuth, requireAuth } = require('../middleware/auth');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /api/tracks  
function validateList(req, _res, next) {
  try {
    const { limit, offset } = V.pickPagination(req, { defaultLimit: 20, defaultOffset: 0 });
    const q = req.query.q != null ? V.assertString(req.query.q, 'q', { min: 1, max: 200 }) : undefined;
    const artistId = req.query.artistId != null ? V.assertId(req.query.artistId, 'artistId', { uuid: true }) : undefined;
    const albumId  = req.query.albumId  != null ? V.assertId(req.query.albumId,  'albumId',  { uuid: true }) : undefined;
    req.valid = { q, artistId, albumId, limit, offset };
    next();
  } catch (e) { next(e); }
}
router.get('/', generalLimiter, optionalAuth, validateList, c.list);

// GET /api/tracks/:id  
function validateId(req, _res, next) {
  try { req.valid = { id: V.assertId(req.params.id, 'id', { uuid: true }) }; next(); }
  catch (e) { next(e); }
}
router.get('/:id', generalLimiter, optionalAuth, validateId, c.getTrack);

// POST /api/tracks/:id/play  
router.post('/:id/play', generalLimiter, authenticateToken, requireAuth, validateId, c.play);

// Like / Unlike
router.post('/:id/like', generalLimiter, authenticateToken, requireAuth, validateId, c.like);
router.delete('/:id/like', generalLimiter, authenticateToken, requireAuth, validateId, c.unlike);

// Discovery 
router.get('/popular', generalLimiter, c.popular);
router.get('/trending', generalLimiter, c.trending);

// Admin CRUD 
function validateCreate(req, _res, next) {
  try {
    V.requireFields(req.body, ['title', 'duration', 'artist_id']);
    const out = {
      title: V.assertString(req.body.title, 'title', { min: 1, max: 255 }),
      duration: V.assertInt(req.body.duration, 'duration', { min: 0 }), // seconds (TS uses seconds)
      artist_id: V.assertId(req.body.artist_id, 'artist_id', { uuid: true }),
      album_id: req.body.album_id != null ? V.assertId(req.body.album_id, 'album_id', { uuid: true }) : undefined,
      audio_url: req.body.audio_url != null ? V.assertString(req.body.audio_url, 'audio_url', { min: 1, max: 2048 }) : undefined,
      image_url: req.body.image_url != null ? V.assertString(req.body.image_url, 'image_url', { min: 1, max: 2048 }) : undefined,
    };
    req.valid = out; next();
  } catch (e) { next(e); }
}
router.post('/', generalLimiter, authenticateToken /* + requireRole('admin') if you add roles */, validateCreate, c.create);

function validateUpdate(req, _res, next) {
  try {
    const out = { id: V.assertId(req.params.id, 'id', { uuid: true }) };
    if (req.body.title != null) out.title = V.assertString(req.body.title, 'title', { min: 1, max: 255 });
    if (req.body.duration != null) out.duration = V.assertInt(req.body.duration, 'duration', { min: 0 });
    if (req.body.artist_id != null) out.artist_id = V.assertId(req.body.artist_id, 'artist_id', { uuid: true });
    if (req.body.album_id  != null) out.album_id  = V.assertId(req.body.album_id,  'album_id',  { uuid: true });
    if (req.body.audio_url != null) out.audio_url = V.assertString(req.body.audio_url, 'audio_url', { min: 1, max: 2048 });
    if (req.body.image_url != null) out.image_url = V.assertString(req.body.image_url, 'image_url', { min: 1, max: 2048 });
    req.valid = out; next();
  } catch (e) { next(e); }
}
router.get('/popular', generalLimiter, c.popular);
router.get('/trending', generalLimiter, c.trending);

// collection browse/search
router.get('/', generalLimiter, optionalAuth, validateList, c.list);

/** ---------- PARAM ROUTES AFTER ---------- **/
router.get('/:id', generalLimiter, optionalAuth, validateId, c.getTrack);
router.post('/:id/play', generalLimiter, authenticateToken, requireAuth, validateId, c.play);
router.post('/:id/like', generalLimiter, authenticateToken, requireAuth, validateId, c.like);
router.delete('/:id/like', generalLimiter, authenticateToken, requireAuth, validateId, c.unlike);

/** ---------- ADMIN CRUD (optional) ---------- **/
router.post('/', generalLimiter, authenticateToken /* + requireRole('admin') */, validateCreate, c.create);
router.put('/:id', generalLimiter, authenticateToken /* + requireRole('admin') */, validateUpdate, c.update);
router.delete('/:id', generalLimiter, authenticateToken /* + requireRole('admin') */, validateId, c.remove);

module.exports = router;
