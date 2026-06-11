const express = require('express');
const SessionModel = require('../models/session');
const ConversationModel = require('../models/conversation');

const router = express.Router();

/**
 * GET /api/sessions
 * List all sessions for the authenticated user
 */
router.get('/', async (req, res, next) => {
  try {
    const sessions = await SessionModel.findByUserId(req.user.id);
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/sessions/:id
 * Get a single session by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const session = await SessionModel.findById(req.params.id, req.user.id);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found.',
        code: 'SESSION_NOT_FOUND',
      });
    }

    // Include conversations
    const conversations = await ConversationModel.findBySessionId(session.id);

    res.json({ session, conversations });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/sessions/:id
 * Delete a session and all its data (cascade)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await SessionModel.delete(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({
        error: 'Session not found.',
        code: 'SESSION_NOT_FOUND',
      });
    }

    res.json({ message: 'Session and all associated data deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
