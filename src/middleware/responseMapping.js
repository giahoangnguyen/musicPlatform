function responseUrlMapping(req, res, next) {
    const originalJson = res.json.bind(res);
    res.json = function wrappedJson(body) {
      try {
        if (body && typeof body === 'object' && ('error' in body)) {
          return originalJson(body);
        }
        const wrapped = {
          success: true,
          data: body,
          meta: {
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString(),
          },
        };
        return originalJson(wrapped);
      } catch (err) {
        return originalJson(body);
      }
    };
    next();
}
  
module.exports = { responseUrlMapping };
  