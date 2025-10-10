const { UserModel } = require('../models/User');
const { generateAccessToken } = require('../utils/jwt');

module.exports = {
  // POST /api/auth/register
  async register(req, res, next) {
    try {
      const { email, username, password, display_name, bio, date_of_birth, country } = req.valid;

      const emailExists = await UserModel.emailExists(email);
      if (emailExists) { const e = new Error('Email already registered'); e.statusCode = 409; e.code = 'EMAIL_EXISTS'; throw e; }

      const usernameExists = await UserModel.usernameExists(username);
      if (usernameExists) { const e = new Error('Username already taken'); e.statusCode = 409; e.code = 'USERNAME_EXISTS'; throw e; }

      const newUser = await UserModel.create({
        email, username, password, display_name, bio, date_of_birth, country,
      });

      const payload = { userId: newUser.id, email: newUser.email, username: newUser.username };
      const token = generateAccessToken(payload);
      const user = UserModel.toResponse(newUser);

      res.status(201).json({ token, user });
    } catch (err) { next(err); }
  },

  // POST /api/auth/login
  async login(req, res, next) {
    try {
      const { email, password } = req.valid;

      const user = await UserModel.findByEmail(email);
      if (!user) { const e = new Error('Invalid credentials'); e.statusCode = 401; e.code = 'INVALID_CREDENTIALS'; throw e; }

      const ok = await UserModel.verifyPassword(password, user.password_hash);
      if (!ok) { const e = new Error('Invalid credentials'); e.statusCode = 401; e.code = 'INVALID_CREDENTIALS'; throw e; }

      const payload = { userId: user.id, email: user.email, username: user.username };
      const token = generateAccessToken(payload);
      const userResponse = UserModel.toResponse(user);

      res.json({ token, user: userResponse });
    } catch (err) { next(err); }
  },

  // GET /api/auth/users/me
  async getProfile(req, res, next) {
    try {
      const userId = req.user?.userId;
      const user = await UserModel.findById(userId);
      if (!user) { const e = new Error('User not found'); e.statusCode = 404; e.code = 'USER_NOT_FOUND'; throw e; }

      const stats = await UserModel.getUserStats(userId);
      const userResponse = UserModel.toResponse(user);

      res.json({ ...userResponse, stats });
    } catch (err) { next(err); }
  },

  // PUT /api/auth/users/me
  async updateProfile(req, res, next) {
    try {
      const userId = req.user?.userId;
      const updated = await UserModel.update(userId, req.valid);
      const userResponse = UserModel.toResponse(updated);
      res.json(userResponse);
    } catch (err) { next(err); }
  },
};
