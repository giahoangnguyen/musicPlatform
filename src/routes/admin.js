const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const AdminController = require('../controllers/adminController');

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /api/admin/users
router.get('/users', adminLimiter, AdminController.listUsers);

// GET /api/admin/users/:id
router.get('/users/:id', adminLimiter, AdminController.getUser);

// PUT /api/admin/users/:id
router.put('/users/:id', adminLimiter, AdminController.updateUser);

// DELETE /api/admin/users/:id
router.delete('/users/:id', adminLimiter, AdminController.deleteUser);

// GET /api/admin/stats
router.get('/stats', adminLimiter, AdminController.getStats);

module.exports = router;
