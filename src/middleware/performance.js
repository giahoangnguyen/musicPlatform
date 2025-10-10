const compression = require('compression');
const responseTime = require('response-time');
const compressionMiddleware = compression()
const responseTimeMiddleware = responseTime();

function paginationMiddleware(req, _res, next) {
    const limitDefault = 20;
    const limitMax = 100;
    const offsetDefault = 0;
  
    let limit = parseInt(req.query.limit, 10);
    let offset = parseInt(req.query.offset, 10);
  
    if (!Number.isFinite(limit)) limit = limitDefault;
    if (!Number.isFinite(offset)) offset = offsetDefault;
  
    // Clamp values
    limit = Math.min(Math.max(limit, 1), limitMax);
    offset = Math.max(offset, 0);
  
    req.pagination = { limit, offset };
  
    next();
  }
  
  module.exports = {
    compressionMiddleware,
    responseTimeMiddleware,
    paginationMiddleware,
  };
