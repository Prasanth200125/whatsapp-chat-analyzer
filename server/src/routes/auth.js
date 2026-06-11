const express = require('express');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // ── Validation ──
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Username, email, and password are required.',
        code: 'MISSING_FIELDS',
      });
    }

    // Username validation
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({
        error: 'Username must be between 3 and 50 characters.',
        code: 'INVALID_USERNAME',
      });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({
        error: 'Username can only contain letters, numbers, and underscores.',
        code: 'INVALID_USERNAME',
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Please provide a valid email address.',
        code: 'INVALID_EMAIL',
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long.',
        code: 'WEAK_PASSWORD',
      });
    }

    // ── Check duplicates ──
    if (await UserModel.emailExists(email)) {
      return res.status(409).json({
        error: 'An account with this email already exists.',
        code: 'EMAIL_EXISTS',
      });
    }

    if (await UserModel.usernameExists(username)) {
      return res.status(409).json({
        error: 'This username is already taken.',
        code: 'USERNAME_EXISTS',
      });
    }

    // ── Create user ──
    const user = await UserModel.create(username, email.toLowerCase(), password);

    res.status(201).json({
      message: 'Account created successfully. Please login.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Login and receive JWT token
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // ── Validation ──
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required.',
        code: 'MISSING_FIELDS',
      });
    }

    // ── Find user ──
    const user = await UserModel.findByEmail(email.toLowerCase());
    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // ── Verify password ──
    const isValid = await UserModel.comparePassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // ── Generate JWT ──
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Get current user profile (protected)
 */
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
