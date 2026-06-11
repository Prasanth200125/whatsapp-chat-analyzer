/**
 * Analytics Routes
 * GET /api/sessions/:id/analytics/:type — Get analytics data for a session
 * 
 * Supported analytics types:
 *   - word_freq    — Word frequency analysis
 *   - msg_count    — Message count per person
 *   - timeline     — Activity timeline (day/week/month)
 *   - media_stats  — Media statistics by type and person
 *   - sentiment    — Sentiment analysis per person and overall
 *   - all          — Run all analytics at once
 */
const express = require('express');
const SessionModel = require('../models/session');
const AnalyticsService = require('../services/analytics');

const router = express.Router();

/**
 * GET /api/sessions/:sessionId/analytics/:type
 */
router.get('/:sessionId/analytics/:type', async (req, res, next) => {
  try {
    const { sessionId, type } = req.params;
    const { top_n, group_by } = req.query;

    // Verify session ownership
    const session = await SessionModel.findById(sessionId, req.user.id);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found.',
        code: 'SESSION_NOT_FOUND',
      });
    }

    let result;

    switch (type) {
      case 'word_freq':
        result = await AnalyticsService.wordFrequency(sessionId, parseInt(top_n) || 50);
        break;

      case 'msg_count':
        result = await AnalyticsService.messageCount(sessionId);
        break;

      case 'timeline':
        result = await AnalyticsService.activityTimeline(sessionId, group_by || 'day');
        break;

      case 'media_stats':
        result = await AnalyticsService.mediaStats(sessionId);
        break;

      case 'sentiment':
        result = await AnalyticsService.sentimentAnalysis(sessionId);
        break;

      case 'all':
        // Run all analytics
        const [wordFreq, msgCount, timeline, mediaStats, sentiment] = await Promise.all([
          AnalyticsService.wordFrequency(sessionId),
          AnalyticsService.messageCount(sessionId),
          AnalyticsService.activityTimeline(sessionId),
          AnalyticsService.mediaStats(sessionId),
          AnalyticsService.sentimentAnalysis(sessionId),
        ]);
        result = {
          wordFrequency: wordFreq,
          messageCount: msgCount,
          timeline,
          mediaStats,
          sentiment,
        };
        break;

      default:
        return res.status(400).json({
          error: `Invalid analytics type: "${type}". Supported: word_freq, msg_count, timeline, media_stats, sentiment, all`,
          code: 'INVALID_TYPE',
        });
    }

    res.json({
      type,
      sessionId,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
