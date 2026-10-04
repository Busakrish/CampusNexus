/**
 * Standardized API Response Helpers
 */
const sendSuccess = (res, message = 'Success', data = {}, statusCode = 200, meta = null) => {
  const payload = {
    success: true,
    message,
    data
  };
  if (meta) {
    payload.meta = meta;
  }
  return res.status(statusCode).json(payload);
};

const sendError = (res, message = 'An error occurred', statusCode = 500, code = 'INTERNAL_ERROR', details = null) => {
  const payload = {
    success: false,
    message,
    code,
    details: details || {}
  };
  return res.status(statusCode).json(payload);
};

module.exports = {
  sendSuccess,
  sendError
};
