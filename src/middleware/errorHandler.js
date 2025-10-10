class CustomError extends Error {
    /**
     * @param {string} message
     * @param {{ status?: number, code?: string, details?: any, cause?: any }} [options]
     */

    constructor(message, options = {}) {
      super(message);
      this.name = 'CustomError';
      if(Number.isInteger(options.status)){
        this.status = options.status;
      }
      options.status = 500;
      this.code = options.code;
      this.details = options.details;
      this.cause = options.cause;
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, CustomError);
      }
    }
  }
  
  /**
   * Express error-handling middleware (must have 4 args)
   * @param {any} err
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */

  function errorHandler(err, req, res, next) {
    const isProd = process.env.NODE_ENV === 'production';

    let status =
      Number.isInteger(err?.status) ? err.status :
      Number.isInteger(err?.statusCode) ? err.statusCode :
      500;
  
    let message = err?.message || 'Internal Server Error';
    let code = err?.code;
  
    // Map common library errors 
    switch (err?.name) {
      case 'ValidationError':
        if (!code) code = 'validationError';
        if (!Number.isInteger(err?.status) && !Number.isInteger(err?.statusCode)) status = 400;
        break;
      case 'UnauthorizedError':
        if (!code) code = 'unauthorizedError';
        if (!Number.isInteger(err?.status) && !Number.isInteger(err?.statusCode)) status = 401;
        break;
      case 'CastError':
        if (!code) code = 'invalidId';
        if (!Number.isInteger(err?.status) && !Number.isInteger(err?.statusCode)) status = 400;
        if (message === 'Internal Server Error') message = 'Invalid ID';
        break;
      default:
        break;
    }
  
    const payload = {
      error: {
        message,
        status,
        ...(code ? { code } : {}),
        ...(err?.details ? { details: err.details } : {}),
        ...(isProd ? {} : { stack: err?.stack }),
      },
    };
  
    // Log more in development
    if (!isProd) {
      console.error('ErrorHandler caught:', err);
    }
  
    res.status(status).json(payload);
  }
  
  module.exports = { CustomError, errorHandler };
  