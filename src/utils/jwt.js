const jwt = require('jsonwebtoken') 
require('dotenv').config();

const DEFAULT_ALG = 'HS256';
const DEFAULT_EXPIRES_IN = '15m';

function getSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      const err = new Error('Missing JWT_SECRET in environment');
      err.status = 500; err.code = 'CONFIG_JWT_SECRET_MISSING';
      throw err;
    }
    return secret;
}

function generateAccessToken(payload, opts = {}) {
    return jwt.sign(payload, getSecret(), {
      algorithm: DEFAULT_ALG,
      expiresIn: opts.expiresIn || DEFAULT_EXPIRES_IN,
    });
}

function signToken(payload, opts = {}) {
    const secret = getSecret();
    const { expiresIn = DEFAULT_EXPIRES_IN, algorithm = DEFAULT_ALG } = opts;
    return jwt.sign(payload, secret, { expiresIn, algorithm });
}

function verifyToken(token) {
    if (!token) {
      const e = new Error('jwt must be provided');
      e.name = 'JsonWebTokenError';
      e.status = 401;
      e.code = 'invalid_token';
      throw e;
    }
    try {
      return jwt.verify(token, getSecret(), { algorithms: [DEFAULT_ALG] });
    } catch (e) {
      // Normalize to 401
      e.status = 401;
      e.code = 'invalid_token';
      throw e;
    }
}

function stripQuotes(s) {
    return typeof s === 'string' ? s.replace(/^['"]+|['"]+$/g, '') : s;
}

function extractTokenFromHeader(header) {
    if (!header) return null;
    if (Array.isArray(header)) header = header[0];
    header = String(header).trim();
    if (!header) return null;
    const m = header.match(/^Bearer\s+(.+)$/i);
    const raw = m ? m[1].trim() : header;
    return stripQuotes(raw); // ← remove surrounding ' or "
}

function extractTokenFromRequest(req) {
    // Node lowercases header keys
    const auth = req.headers && (req.headers.authorization || req.get?.('Authorization'));
    return (
      extractTokenFromHeader(auth) ||
      (req.headers && req.headers['x-access-token']) ||
      (req.cookies && (req.cookies.access_token || req.cookies.token)) ||
      (req.query && (req.query.access_token || req.query.token)) ||
      (req.body && (req.body.access_token || req.body.token)) ||
      null
    );
}

//Helper function - returns a default integer TTL (seconds) 
function getTokenTTLSeconds() {
    return 15*60;
}

module.exports = {
    generateAccessToken,
  verifyToken,
  extractTokenFromHeader,
  extractTokenFromRequest,
  getTokenTTLSeconds,
};