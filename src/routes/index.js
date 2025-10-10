const router = require('express').Router();
const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 300,                  
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(generalLimiter);

router.use('/auth', require('./auth'));
//router.use('/users', require('./users'));
router.use('/artists', require('./artists'));
router.use('/albums', require('./albums'));
router.use('/tracks', require('./tracks'));
router.use('/playlists', require('./playlists'));
router.use('/search', require('./search'));
router.use('/me/player', require('./player'));
router.use('/upload', require('./upload'));
router.use('/admin', require('./admin'));

module.exports = router;