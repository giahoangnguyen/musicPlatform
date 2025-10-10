const { verifyToken, extractTokenFromRequest } = require('../utils/jwt');

function unauthorized(message = 'Unauthorized') {
  const err = new Error(message);
  err.name = 'UnauthorizedError';
  err.status = 401;
  err.code = 'unauthorized';
  return err;
}

function forbidden(message = 'Forbidden') {
  const err = new Error(message);
  err.name = 'ForbiddenError';
  err.status = 403;
  err.code = 'forbidden';
  return err;
}

/**
 * Strict auth: reads token from header/cookie/query/body, verifies it,
 * and attaches a normalized req.user. Returns 401 if missing/invalid.
 */
function authenticateToken(req, res, next) {
  try {
    const token = extractTokenFromRequest(req); // ← robust extractor
    if (!token) {
      return res.status(401).json({
        error: { code: 'invalid_token', message: 'Missing Bearer token' }
      });
    }
    const decoded = verifyToken(token); // throws 401 if invalid/expired
    // Normalize user shape (your tokens carry userId/email/username)
    req.user = {
      id: decoded.userId || decoded.sub || decoded.id,
      email: decoded.email,
      username: decoded.username,
      ...decoded,
    };
    return next();
  } catch (e) {
    return res.status(401).json({
      error: { code: 'invalid_token', message: e.message || 'Invalid token' }
    });
  }
}

/**
 * Gate that assumes authenticateToken already ran.
 * Just ensures req.user exists.
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: { code: 'unauthorized', message: 'Authentication required' }
    });
  }
  return next();
}

/**
 * Optional auth: attach req.user if token is present & valid; otherwise continue.
 */
function optionalAuth(req, _res, next) {
  try {
    const token = extractTokenFromRequest(req);
    if (token) {
      try {
        const decoded = verifyToken(token);
        req.user = {
          id: decoded.userId || decoded.sub || decoded.id,
          email: decoded.email,
          username: decoded.username,
          ...decoded,
        };
      } catch (_) {
        // ignore invalid/expired token in optional mode
      }
    }
    return next();
  } catch (e) {
    return next();
  }
}

module.exports = {
  authenticateToken,
  requireAuth,
  optionalAuth,
  unauthorized,
  forbidden,
};
