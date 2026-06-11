/**
 * Export Routes
 * GET /api/sessions/:sessionId/export/:format — Export analytics data
 * 
 * Supported formats:
 *   - csv  — Download CSV file
 *   - pdf  — Download text report (plain text for now)
 */
const express = require('express');
const SessionModel = require('../models/session');
const ExportService = require('../services/exporter');

const router = express.Router();

/**
 * GET /api/sessions/:sessionId/export/:format
 */
router.get('/:sessionId/export/:format', async (req, res, next) => {
  try {
    const { sessionId, format } = req.params;

    // Verify session ownership
    const session = await SessionModel.findById(sessionId, req.user.id);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found.',
        code: 'SESSION_NOT_FOUND',
      });
    }

    const fileName = session.file_name.replace('.txt', '');

    switch (format.toLowerCase()) {
      case 'csv': {
        const csv = await ExportService.generateCSV(sessionId);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}_analysis.csv"`);
        res.send(csv);
        break;
      }

      case 'pdf':
      case 'report': {
        const report = await ExportService.generateReport(sessionId);
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}_report.txt"`);
        res.send(report);
        break;
      }

      default:
        return res.status(400).json({
          error: `Invalid export format: "${format}". Supported: csv, pdf`,
          code: 'INVALID_FORMAT',
        });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
