const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const V = require('../utils/validation');
const c = require('../controllers/playlistController');
const { authenticateToken, optionalAuth, requireAuth } = require('../middleware/auth');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /api/playlists/:id 
function validateId(req, _res, next) {
  try { req.valid = { id: V.assertId(req.params.id, 'id', { uuid: true }) }; next(); }
  catch (e) { next(e); }
}
router.get('/:id', generalLimiter, optionalAuth, validateId, c.getPlaylist);

// GET /api/playlists/:id/tracks
router.get('/:id/tracks', generalLimiter, optionalAuth, validateId, c.tracks);

// POST /api/playlists (create mine)
function validateCreate(req, _res, next) {
  try {
    V.requireFields(req.body, ['name']);
    req.valid = {
      name: V.assertString(req.body.name, 'name', { min: 1, max: 255 }),
      description: req.body.description != null ? V.assertString(req.body.description, 'description', { min: 1, max: 500 }) : undefined,
      is_public: req.body.is_public != null ? V.assertBoolean(req.body.is_public, 'is_public') : true,
      image_url: req.body.image_url != null ? V.assertString(req.body.image_url, 'image_url', { min: 1, max: 2048 }) : undefined,
    };
    next();
  } catch (e) { next(e); }
}
router.post('/', generalLimiter, authenticateToken, requireAuth, validateCreate, c.create);

// PUT /api/playlists/:id (owner or admin)
function validateUpdate(req, _res, next) {
  try {
    const out = { id: V.assertId(req.params.id, 'id', { uuid: true }) };
    if (req.body.name != null) out.name = V.assertString(req.body.name, 'name', { min: 1, max: 255 });
    if (req.body.description != null) out.description = V.assertString(req.body.description, 'description', { min: 1, max: 500 });
    if (req.body.is_public != null) out.is_public = V.assertBoolean(req.body.is_public, 'is_public');
    if (req.body.image_url != null) out.image_url = V.assertString(req.body.image_url, 'image_url', { min: 1, max: 2048 });
    req.valid = out; next();
  } catch (e) { next(e); }
}
router.put('/:id', generalLimiter, authenticateToken, requireAuth, validateUpdate, c.update);

// DELETE /api/playlists/:id (owner or admin)
router.delete('/:id', generalLimiter, authenticateToken, requireAuth, validateId, c.remove);

// POST /api/playlists/:id/tracks  (owner or admin)
function validateAddTrack(req, _res, next) {
  try {
    V.requireFields(req.body, ['trackId']);
    req.valid = {
      id: V.assertId(req.params.id, 'id', { uuid: true }),
      trackId: V.assertId(req.body.trackId, 'trackId', { uuid: true }),
      position: req.body.position != null ? V.assertInt(req.body.position, 'position', { min: 0 }) : undefined,
    };
    next();
  } catch (e) { next(e); }
}
router.post('/:id/tracks', generalLimiter, authenticateToken, requireAuth, validateAddTrack, c.addTrack);

// DELETE /api/playlists/:id/tracks/:trackId  (owner or admin)
function validateRemoveTrack(req, _res, next) {
  try {
    req.valid = {
      id: V.assertId(req.params.id, 'id', { uuid: true }),
      trackId: V.assertId(req.params.trackId, 'trackId', { uuid: true }),
    };
    next();
  } catch (e) { next(e); }
}
router.delete('/:id/tracks/:trackId', generalLimiter, authenticateToken, requireAuth, validateRemoveTrack, c.removeTrack);

// Follow / Unfollow playlist 
router.post('/:id/follow', generalLimiter, authenticateToken, requireAuth, validateId, c.follow);
router.delete('/:id/follow', generalLimiter, authenticateToken, requireAuth, validateId, c.unfollow);

module.exports = router;
