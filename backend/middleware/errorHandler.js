const { sendError } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = {};
    for (let field in err.errors) {
      details[field] = err.errors[field].message;
    }
    return sendError(res, 'Validation failed for input data', 400, 'VALIDATION_ERROR', details);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return sendError(res, `Duplicate value for ${field}. Value already exists.`, 409, 'DUPLICATE_KEY_ERROR', { field });
  }

  // Cast error / invalid object ID
  if (err.name === 'CastError') {
    return sendError(res, `Invalid format for field: ${err.path}`, 400, 'INVALID_FORMAT');
  }

  // Generic fallback
  return sendError(
    res,
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    err.statusCode || 500,
    err.errorCode || 'INTERNAL_SERVER_ERROR'
  );
};

module.exports = errorHandler;
