/**
 * Global Error Handler Middleware
 * 
 * Catches all unhandled errors and returns consistent JSON error responses.
 * Must be registered AFTER all routes.
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // PostgreSQL-specific errors
  if (err.code === '23505') {
    // Unique violation
    return res.status(409).json({
      error: 'A record with this value already exists.',
      code: 'DUPLICATE_ENTRY',
    });
  }

  if (err.code === '23503') {
    // Foreign key violation
    return res.status(400).json({
      error: 'Referenced record does not exist.',
      code: 'FK_VIOLATION',
    });
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 50}MB.`,
      code: 'FILE_TOO_LARGE',
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Unexpected file field.',
      code: 'UNEXPECTED_FILE',
    });
  }

  // JWT errors (fallback — most are handled in auth middleware)
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Invalid or expired token.',
      code: 'AUTH_ERROR',
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: err.message,
      code: 'VALIDATION_ERROR',
    });
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error.',
    code: 'INTERNAL_ERROR',
  });
};

module.exports = errorHandler;
