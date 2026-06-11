const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * 
 * Extracts the Bearer token from the Authorization header,
 * verifies it, and attaches the decoded user to req.user.
 * 
 * Protected routes use this middleware to ensure the request is authenticated.
 */
const authMiddleware = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN',
      });
    }

    // Expect format: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Access denied. Invalid token format. Expected: Bearer <token>',
        code: 'INVALID_FORMAT',
      });
    }

    const token = parts[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request object
    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired. Please login again.',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token.',
        code: 'INVALID_TOKEN',
      });
    }

    return res.status(500).json({
      error: 'Authentication error.',
      code: 'AUTH_ERROR',
    });
  }
};

module.exports = authMiddleware;
