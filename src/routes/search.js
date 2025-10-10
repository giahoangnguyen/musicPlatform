const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const V = require('../utils/validation');
const SearchController = require('../controllers/searchController');

const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
});
const suggestionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
});

// validators
function vQ(req, _res, next) {
  try {
    V.requireFields(req.query, ['q']);
    const { limit, offset } = V.pickPagination(req, { defaultLimit: 20, defaultOffset: 0 });
    const q = V.assertString(req.query.q, 'q', { min: 1, max: 100 });
    req.valid = { q, limit, offset }; next();
  } catch (e) { next(e); }
}
function vPage(req, _res, next) {
  try {
    const { limit, offset } = V.pickPagination(req, { defaultLimit: 20, defaultOffset: 0 });
    req.valid = { limit, offset }; next();
  } catch (e) { next(e); }
}

// GET /api/search?q=...
router.get('/', searchLimiter, vQ, SearchController.searchAll);

// GET /api/search/quick?q=...
router.get('/quick', suggestionLimiter, vQ, SearchController.quickSearch);

// GET /api/search/suggestions?q=...   (TS allows short queries)
router.get('/suggestions', suggestionLimiter, vQ, SearchController.getSuggestions);

// GET /api/search/trending
router.get('/trending', searchLimiter, vPage, SearchController.getTrendingSearches);

// Scoped searches (same shape as TS)
router.get('/tracks', searchLimiter, vQ, SearchController.searchTracks);
router.get('/artists', searchLimiter, vQ, SearchController.searchArtists);
router.get('/albums', searchLimiter, vQ, SearchController.searchAlbums);
router.get('/playlists', searchLimiter, vQ, SearchController.searchPlaylists);

module.exports = router;
