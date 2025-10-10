const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const V = require('../utils/validation');
const ArtistController = require('../controllers/artistController');
const { authenticateToken, optionalAuth, requireAuth } = require('../middleware/auth');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
});

/* -------------------- validators -------------------- */
function vId(req, _res, next) {
  try {
    const id = V.assertId(req.params.id, 'id', { uuid: true });
    req.valid = { ...(req.valid || {}), id };
    next();
  } catch (e) { next(e); }
}

function vList(req, _res, next) {
  try {
    const { limit, offset } = V.pickPagination(req, { defaultLimit: 20, defaultOffset: 0 });
    const q = req.query.q != null
      ? V.assertString(req.query.q, 'q', { min: 1, max: 200 })
      : undefined;
    req.valid = { ...(req.valid || {}), q, limit, offset };
    next();
  } catch (e) { next(e); }
}

function vCreate(req, _res, next) {
  try {
    V.requireFields(req.body, ['name']);
    const out = {
      name: V.assertString(req.body.name, 'name', { min: 1, max: 255 }),
      // optional fields (keep names consistent with your controller/model mapping)
      image_url: req.body.image_url != null
        ? V.assertString(req.body.image_url, 'image_url', { min: 1, max: 2048 })
        : undefined,
      background_url: req.body.background_url != null
        ? V.assertString(req.body.background_url, 'background_url', { min: 1, max: 2048 })
        : undefined,
      bio: req.body.bio != null
        ? V.assertString(req.body.bio, 'bio', { min: 1, max: 5000 })
        : undefined,
    };
    req.valid = { ...(req.valid || {}), ...out };
    next();
  } catch (e) { next(e); }
}

function vUpdate(req, _res, next) {
  try {
    const out = { id: V.assertId(req.params.id, 'id', { uuid: true }) };
    if (req.body.name != null)
      out.name = V.assertString(req.body.name, 'name', { min: 1, max: 255 });
    if (req.body.image_url != null)
      out.image_url = V.assertString(req.body.image_url, 'image_url', { min: 1, max: 2048 });
    if (req.body.background_url != null)
      out.background_url = V.assertString(req.body.background_url, 'background_url', { min: 1, max: 2048 });
    if (req.body.bio != null)
      out.bio = V.assertString(req.body.bio, 'bio', { min: 1, max: 5000 });

    req.valid = { ...(req.valid || {}), ...out };
    next();
  } catch (e) { next(e); }
}

/* --------- STATIC / COLLECTION ROUTES FIRST --------- */
// Trending BEFORE any /:id to avoid param-capture issues
router.get('/trending', generalLimiter, ArtistController.getTrending);

// Collection browse/search
router.get('/', generalLimiter, optionalAuth, vList, ArtistController.getArtists);

/* ---------------- PARAM ROUTES AFTER ---------------- */
router.get('/:id', generalLimiter, optionalAuth, vId, ArtistController.getArtist);
router.get('/:id/tracks/popular', generalLimiter, vId, ArtistController.getPopularTracks);
router.get('/:id/albums', generalLimiter, vId, ArtistController.getArtistAlbums);

router.post('/:id/follow', generalLimiter, authenticateToken, requireAuth, vId, ArtistController.follow);
router.delete('/:id/follow', generalLimiter, authenticateToken, requireAuth, vId, ArtistController.unfollow);

/* ------------------ Admin-ish CRUD ------------------ */
router.post('/', generalLimiter, authenticateToken /* + requireRole('admin') if you add roles */, vCreate, ArtistController.createArtist);
router.put('/:id', generalLimiter, authenticateToken /* + requireRole('admin') */, vUpdate, ArtistController.updateArtist);
router.delete('/:id', generalLimiter, authenticateToken /* + requireRole('admin') */, vId, ArtistController.deleteArtist);

module.exports = router;

