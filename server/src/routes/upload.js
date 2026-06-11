/**
 * Upload Route
 * POST /api/upload — Upload and parse a WhatsApp .txt chat file
 * 
 * Flow:
 * 1. Receive file via multipart/form-data
 * 2. Validate file type (.txt) and size (≤ 50MB) via multer middleware
 * 3. Parse the file using WhatsApp parser
 * 4. Create a session record in DB
 * 5. Bulk insert parsed messages into DB
 * 6. Delete the temp file
 * 7. Return session info + stats
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const upload = require('../middleware/upload');
const { parseFile } = require('../services/parser');
const SessionModel = require('../models/session');
const MessageModel = require('../models/message');
const ConversationModel = require('../models/conversation');

const router = express.Router();

/**
 * POST /api/upload
 * Upload a WhatsApp .txt file for analysis
 */
router.post('/', upload.single('chatFile'), async (req, res, next) => {
  let filePath = null;

  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded. Please select a WhatsApp .txt export file.',
        code: 'NO_FILE',
      });
    }

    filePath = req.file.path;
    const originalName = req.file.originalname;

    console.log(`📂 Processing uploaded file: ${originalName} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);

    // Parse the WhatsApp file
    const { messages, metadata } = parseFile(filePath);

    console.log(`📊 Parsed ${metadata.totalMessages} messages from ${metadata.totalParticipants} participants`);

    // Create session in DB
    const session = await SessionModel.create(
      req.user.id,
      originalName,
      metadata.chatType,
      metadata.totalMessages,
      metadata.totalParticipants,
      metadata.dateRangeStart,
      metadata.dateRangeEnd
    );

    // Bulk insert messages
    await MessageModel.bulkInsert(session.id, messages);

    // Create a default conversation for this session
    const conversation = await ConversationModel.create(session.id, 'Chat Analysis');

    // Delete temp file
    try {
      fs.unlinkSync(filePath);
      filePath = null; // Mark as deleted
      console.log('🗑️  Temp file deleted');
    } catch (err) {
      console.warn('⚠️  Failed to delete temp file:', err.message);
    }

    // Return session info
    res.status(201).json({
      message: 'File uploaded and parsed successfully.',
      session: {
        id: session.id,
        fileName: originalName,
        chatType: metadata.chatType,
        totalMessages: metadata.totalMessages,
        totalParticipants: metadata.totalParticipants,
        participants: metadata.participants,
        dateRange: {
          start: metadata.dateRangeStart,
          end: metadata.dateRangeEnd,
        },
        createdAt: session.created_at,
      },
      conversation: {
        id: conversation.id,
        title: conversation.title,
      },
    });
  } catch (err) {
    // Clean up temp file on error
    if (filePath) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupErr) {
        console.warn('⚠️  Failed to delete temp file on error:', cleanupErr.message);
      }
    }

    // Handle specific parser errors
    if (err.message.includes('No valid WhatsApp messages') || err.message.includes('File is empty')) {
      return res.status(400).json({
        error: err.message,
        code: 'PARSE_ERROR',
      });
    }

    next(err);
  }
});

module.exports = router;
