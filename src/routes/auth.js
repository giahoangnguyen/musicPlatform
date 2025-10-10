const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const V = require('../utils/validation');
const Auth = require('../controllers/authController');
const Track = require('../controllers/trackController');
const Playlist = require('../controllers/playlistController');
const Album = require('../controllers/albumController');
const { authenticateToken, requireAuth } = require('../middleware/auth');

const generalAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
});

// Register / Login 
function validateRegister(req, _res, next) {
  try {
    V.requireFields(req.body, ['email', 'username', 'password', 'display_name']);
    req.valid = {
      email: V.assertEmail(req.body.email),
      username: V.assertString(req.body.username, 'username', { min: 3, max: 30 }),
      password: V.assertPassword(req.body.password, 'password', { min: 6 }),
      display_name: V.assertString(req.body.display_name, 'display_name', { min: 1, max: 255 }),
      bio: req.body.bio != null ? V.assertString(req.body.bio, 'bio', { min: 1, max: 500 }) : undefined,
      date_of_birth: req.body.date_of_birth != null ? V.assertString(req.body.date_of_birth, 'date_of_birth', { min: 4, max: 50 }) : undefined,
      country: req.body.country != null ? V.assertString(req.body.country, 'country', { min: 2, max: 2 }) : undefined,
    };
    next();
  } catch (e) { next(e); }
}
router.post('/register', generalAuthLimiter, validateRegister, Auth.register);

function validateLogin(req, _res, next) {
  try {
    V.requireFields(req.body, ['email', 'password']);
    req.valid = {
      email: V.assertEmail(req.body.email),
      password: V.assertPassword(req.body.password, 'password', { min: 6 }),
    };
    next();
  } catch (e) { next(e); }
}
router.post('/login', generalAuthLimiter, validateLogin, Auth.login);

// /api/auth/users/me 
router.get('/users/me', generalAuthLimiter, authenticateToken, requireAuth, Auth.getProfile);

function validateUpdateProfile(req, _res, next) {
  try {
    const out = {};
    if (req.body.display_name != null) out.display_name = V.assertString(req.body.display_name, 'display_name', { min: 1, max: 255 });
    if (req.body.username != null) out.username = V.assertString(req.body.username, 'username', { min: 3, max: 30 });
    if (req.body.bio != null) out.bio = V.assertString(req.body.bio, 'bio', { min: 1, max: 500 });
    if (req.body.avatar_url != null) out.avatar_url = V.assertString(req.body.avatar_url, 'avatar_url', { min: 1, max: 2048 });
    if (req.body.date_of_birth != null) out.date_of_birth = V.assertString(req.body.date_of_birth, 'date_of_birth', { min: 4, max: 50 });
    if (req.body.country != null) out.country = V.assertString(req.body.country, 'country', { min: 2, max: 2 });
    req.valid = out; next();
  } catch (e) { next(e); }
}
router.put('/users/me', generalAuthLimiter, authenticateToken, requireAuth, validateUpdateProfile, Auth.updateProfile);

// User content: liked, history, my/followed playlists 
function validatePage(req, _res, next) {
  try {
    const { limit, offset } = V.pickPagination(req, { defaultLimit: 20, defaultOffset: 0 });
    req.valid = { limit, offset }; next();
  } catch (e) { next(e); }
}

// /api/auth/me/tracks/liked
router.get('/me/tracks/liked', generalAuthLimiter, authenticateToken, requireAuth, validatePage, Track.getLikedTracks);

// /api/auth/me/player/recently-played
router.get('/me/player/recently-played', generalAuthLimiter, authenticateToken, requireAuth, validatePage, Track.getRecentlyPlayed);

// /api/auth/me/playlists (my playlists)
router.get('/me/playlists', generalAuthLimiter, authenticateToken, requireAuth, validatePage, Playlist.listMine);

// /api/auth/me/playlists/followed
router.get('/me/playlists/followed', generalAuthLimiter, authenticateToken, requireAuth, validatePage, Playlist.getFollowedPlaylists);

// /api/auth/me/albums/liked
router.get('/me/albums/liked', generalAuthLimiter, authenticateToken, requireAuth, validatePage, Album.getLikedAlbums);

module.exports = router;
