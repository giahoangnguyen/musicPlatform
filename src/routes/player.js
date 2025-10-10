const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const V = require('../utils/validation');
const PlayerController = require('../controllers/playerController');
const { authenticateToken } = require('../middleware/auth');

const playerLimiter = rateLimit({
  windowMs: 60 * 1000, // tighter window for realtime controls
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
});

// All routes require a valid token (TS does router.use(authenticateToken))
router.use(authenticateToken);

// GET /api/me/player
router.get('/', playerLimiter, PlayerController.getCurrentPlayback);

// PUT /api/me/player/play  (start new playback with body)
function vStartPlayback(req, _res, next) {
  try {
    // TS expects: track_id (uuid), optional context_type/context_id, optional position_ms
    V.requireFields(req.body, ['track_id']);
    const out = {
      track_id: V.assertId(req.body.track_id, 'track_id', { uuid: true }),
      context_type: req.body.context_type != null
        ? V.assertOneOf(req.body.context_type, ['album', 'playlist', 'artist', 'search'], 'context_type')
        : undefined,
      context_id: req.body.context_id != null
        ? V.assertString(req.body.context_id, 'context_id', { min: 1, max: 255 })
        : undefined,
      position_ms: req.body.position_ms != null
        ? V.assertInt(req.body.position_ms, 'position_ms', { min: 0 })
        : 0,
    };
    req.valid = out; next();
  } catch (e) { next(e); }
}
router.put('/play', playerLimiter, vStartPlayback, PlayerController.startPlayback);

// PUT /api/me/player/play  (resume current playback when no body)
router.put('/play', playerLimiter, PlayerController.resumePlayback);

// PUT /api/me/player/pause
router.put('/pause', playerLimiter, PlayerController.pausePlayback);

// POST /api/me/player/next
router.post('/next', playerLimiter, PlayerController.nextTrack);

// POST /api/me/player/previous
router.post('/previous', playerLimiter, PlayerController.previousTrack);

// PUT /api/me/player/seek  { position_ms }
function vSeek(req, _res, next) {
  try {
    V.requireFields(req.body, ['position_ms']);
    req.valid = { position_ms: V.assertInt(req.body.position_ms, 'position_ms', { min: 0 }) };
    next();
  } catch (e) { next(e); }
}
router.put('/seek', playerLimiter, vSeek, PlayerController.seek);

// PUT /api/me/player/volume  { volume_percent: 0..100 }
function vVolume(req, _res, next) {
  try {
    V.requireFields(req.body, ['volume_percent']);
    req.valid = { volume_percent: V.assertInt(req.body.volume_percent, 'volume_percent', { min: 0, max: 100 }) };
    next();
  } catch (e) { next(e); }
}
router.put('/volume', playerLimiter, vVolume, PlayerController.setVolume);

// PUT /api/me/player/shuffle  { state: boolean }
function vShuffle(req, _res, next) {
  try {
    V.requireFields(req.body, ['state']);
    req.valid = { state: V.assertBoolean(req.body.state, 'state') };
    next();
  } catch (e) { next(e); }
}
router.put('/shuffle', playerLimiter, vShuffle, PlayerController.setShuffle);

// PUT /api/me/player/repeat  { state: 'off'|'context'|'track' }
function vRepeat(req, _res, next) {
  try {
    V.requireFields(req.body, ['state']);
    req.valid = { state: V.assertOneOf(req.body.state, ['off', 'context', 'track'], 'state') };
    next();
  } catch (e) { next(e); }
}
router.put('/repeat', playerLimiter, vRepeat, PlayerController.setRepeat);

// GET /api/me/player/queue
router.get('/queue', playerLimiter, PlayerController.getQueue);

// POST /api/me/player/queue  { track_id }
function vQueueAdd(req, _res, next) {
  try {
    V.requireFields(req.body, ['track_id']);
    req.valid = { track_id: V.assertId(req.body.track_id, 'track_id', { uuid: true }) };
    next();
  } catch (e) { next(e); }
}
router.post('/queue', playerLimiter, vQueueAdd, PlayerController.addToQueue);

// DELETE /api/me/player/queue/:queueItemId
function vQueueItem(req, _res, next) {
  try { req.valid = { queueItemId: V.assertId(req.params.queueItemId, 'queueItemId', { uuid: true }) }; next(); }
  catch (e) { next(e); }
}
router.delete('/queue/:queueItemId', playerLimiter, vQueueItem, PlayerController.removeFromQueue);

// DELETE /api/me/player  (stop playback)
router.delete('/', playerLimiter, PlayerController.stopPlayback);

// PUT /api/me/player/device  { device_id }
function vDevice(req, _res, next) {
  try {
    V.requireFields(req.body, ['device_id']);
    req.valid = { device_id: V.assertId(req.body.device_id, 'device_id', { uuid: true }) };
    next();
  } catch (e) { next(e); }
}
router.put('/device', playerLimiter, vDevice, PlayerController.transferPlayback);

module.exports = router;
