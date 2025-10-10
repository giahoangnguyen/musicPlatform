const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const V = require('../utils/validation');
const c = require('../controllers/albumController');
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
    const artistId = req.query.artistId != null
      ? V.assertId(req.query.artistId, 'artistId', { uuid: true })
      : undefined;
    req.valid = { ...(req.valid || {}), q, artistId, limit, offset };
    next();
  } catch (e) { next(e); }
}

function vCreate(req, _res, next) {
  try {
    V.requireFields(req.body, ['title', 'artist_id', 'release_date']);
    const out = {
      title: V.assertString(req.body.title, 'title', { min: 1, max: 255 }),
      artist_id: V.assertId(req.body.artist_id, 'artist_id', { uuid: true }),
      // TS repo treated this as free-form (often ISO date string)
      release_date: V.assertString(req.body.release_date, 'release_date', { min: 4, max: 50 }),
      description: req.body.description != null
        ? V.assertString(req.body.description, 'description', { min: 1, max: 2000 })
        : undefined,
      cover_image_url: req.body.cover_image_url != null
        ? V.assertString(req.body.cover_image_url, 'cover_image_url', { min: 1, max: 2048 })
        : undefined,
    };
    req.valid = { ...(req.valid || {}), ...out };
    next();
  } catch (e) { next(e); }
}

function vUpdate(req, _res, next) {
  try {
    const out = { id: V.assertId(req.params.id, 'id', { uuid: true }) };
    if (req.body.title != null)
      out.title = V.assertString(req.body.title, 'title', { min: 1, max: 255 });
    if (req.body.artist_id != null)
      out.artist_id = V.assertId(req.body.artist_id, 'artist_id', { uuid: true });
    if (req.body.release_date != null)
      out.release_date = V.assertString(req.body.release_date, 'release_date', { min: 4, max: 50 });
    if (req.body.description != null)
      out.description = V.assertString(req.body.description, 'description', { min: 1, max: 2000 });
    if (req.body.cover_image_url != null)
      out.cover_image_url = V.assertString(req.body.cover_image_url, 'cover_image_url', { min: 1, max: 2048 });
    req.valid = { ...(req.valid || {}), ...out };
    next();
  } catch (e) { next(e); }
}

/* --------- STATIC / COLLECTION ROUTES FIRST --------- */
// Browse/search collection
router.get('/', generalLimiter, optionalAuth, vList, c.list);

/* ---------------- PARAM ROUTES AFTER ---------------- */
router.get('/:id', generalLimiter, optionalAuth, vId, c.getAlbum);
router.get('/:id/tracks', generalLimiter, optionalAuth, vId, c.tracks);

// Like / Unlike
router.post('/:id/like', generalLimiter, authenticateToken, requireAuth, vId, c.like);
router.delete('/:id/like', generalLimiter, authenticateToken, requireAuth, vId, c.unlike);

/* ------------------ Admin-ish CRUD ------------------ */
router.post('/', generalLimiter, authenticateToken /* + requireRole('admin') if you add roles */, vCreate, c.create);
router.put('/:id', generalLimiter, authenticateToken /* + requireRole('admin') */, vUpdate, c.update);
router.delete('/:id', generalLimiter, authenticateToken /* + requireRole('admin') */, vId, c.remove);

module.exports = router;
