/**
 * Chat Route
 * POST /api/sessions/:id/ask — Ask a question about the chat data
 * GET  /api/sessions/:id/history — Get conversation history
 * 
 * Uses the query classifier to route questions to either:
 *   - Rule-based analytics engine (fast, deterministic)
 *   - Gemini AI module (contextual, nuanced)
 *   - Hybrid: analytics data + AI interpretation
 */
const express = require('express');
const SessionModel = require('../models/session');
const ConversationModel = require('../models/conversation');
const { classifyQuery } = require('../services/classifier');
const AnalyticsService = require('../services/analytics');
const { askGemini } = require('../services/gemini');

const router = express.Router();

/**
 * POST /api/sessions/:sessionId/ask
 * Ask a question about the uploaded chat
 */
router.post('/:sessionId/ask', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { question, conversationId } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        error: 'Please provide a question.',
        code: 'NO_QUESTION',
      });
    }

    // Verify session ownership
    const session = await SessionModel.findById(sessionId, req.user.id);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found.',
        code: 'SESSION_NOT_FOUND',
      });
    }

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const conversations = await ConversationModel.findBySessionId(sessionId);
      if (conversations.length > 0) {
        convId = conversations[0].id;
      } else {
        const newConv = await ConversationModel.create(sessionId, 'Chat Analysis');
        convId = newConv.id;
      }
    }

    // Store the user's question
    await ConversationModel.addMessage(convId, 'user', question.trim());

    // Classify the query
    const classification = classifyQuery(question);
    console.log(`🧠 Query classified as: ${classification.type} (${classification.analyticsType || 'n/a'})`);

    let answer;
    let responseType = 'text';
    let responseData = null;

    switch (classification.type) {
      case 'RULE_BASED':
        // Handle with analytics engine
        const analyticsResult = await handleRuleBasedQuery(sessionId, classification.analyticsType);
        answer = analyticsResult.answer;
        responseType = analyticsResult.responseType;
        responseData = analyticsResult.data;
        break;

      case 'AI':
        // Handle with Gemini AI
        const aiResult = await askGemini(sessionId, question);
        answer = aiResult.answer;
        responseType = aiResult.responseType;
        break;

      case 'HYBRID':
        // Get analytics data, then enhance with AI
        const hybridAnalytics = await handleRuleBasedQuery(sessionId, classification.analyticsType);
        try {
          const enhancedPrompt = `${question}\n\nHere is the statistical data:\n${hybridAnalytics.answer}`;
          const hybridAi = await askGemini(sessionId, enhancedPrompt);
          answer = hybridAi.answer;
          responseType = 'text';
          responseData = hybridAnalytics.data;
        } catch (aiErr) {
          // Fallback to just analytics if AI fails
          console.warn('⚠️  AI enhancement failed, falling back to analytics:', aiErr.message);
          answer = hybridAnalytics.answer;
          responseType = hybridAnalytics.responseType;
          responseData = hybridAnalytics.data;
        }
        break;

      default:
        const defaultResult = await askGemini(sessionId, question);
        answer = defaultResult.answer;
        responseType = defaultResult.responseType;
    }

    // Store the assistant's response
    const savedMessage = await ConversationModel.addMessage(
      convId,
      'assistant',
      answer,
      responseType,
      responseData
    );

    res.json({
      answer,
      responseType,
      responseData,
      conversationId: convId,
      messageId: savedMessage.id,
      classification: classification.type,
    });
  } catch (err) {
    // Handle specific AI errors gracefully
    if (err.message.includes('rate limit') || err.message.includes('Rate limit')) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment and try again.',
        code: 'RATE_LIMIT',
      });
    }
    if (err.message.includes('timed out') || err.message.includes('Timed out')) {
      return res.status(504).json({
        error: 'The AI service timed out. Try asking about a specific date range or topic.',
        code: 'TIMEOUT',
      });
    }
    if (err.message.includes('API key')) {
      return res.status(503).json({
        error: err.message,
        code: 'API_KEY_ERROR',
      });
    }
    next(err);
  }
});

/**
 * GET /api/sessions/:sessionId/history
 * Get conversation history for a session
 */
router.get('/:sessionId/history', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { conversationId } = req.query;

    // Verify session ownership
    const session = await SessionModel.findById(sessionId, req.user.id);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found.',
        code: 'SESSION_NOT_FOUND',
      });
    }

    if (conversationId) {
      // Get messages for a specific conversation
      const messages = await ConversationModel.getMessages(conversationId);
      return res.json({ conversationId, messages });
    }

    // Get all conversations with their messages
    const conversations = await ConversationModel.findBySessionId(sessionId);
    const result = [];

    for (const conv of conversations) {
      const messages = await ConversationModel.getMessages(conv.id);
      result.push({
        ...conv,
        messages,
      });
    }

    res.json({ conversations: result });
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────
// Helper: Format rule-based analytics into chat response
// ──────────────────────────────────────────────

async function handleRuleBasedQuery(sessionId, analyticsType) {
  let data, answer, responseType;

  switch (analyticsType) {
    case 'word_freq':
      data = await AnalyticsService.wordFrequency(sessionId);
      answer = formatWordFrequency(data);
      responseType = 'table';
      break;

    case 'msg_count':
      data = await AnalyticsService.messageCount(sessionId);
      answer = formatMessageCount(data);
      responseType = 'table';
      break;

    case 'timeline':
      data = await AnalyticsService.activityTimeline(sessionId);
      answer = formatTimeline(data);
      responseType = 'table';
      break;

    case 'media_stats':
      data = await AnalyticsService.mediaStats(sessionId);
      answer = formatMediaStats(data);
      responseType = 'table';
      break;

    case 'sentiment':
      data = await AnalyticsService.sentimentAnalysis(sessionId);
      answer = formatSentiment(data);
      responseType = 'table';
      break;

    default:
      throw new Error(`Unknown analytics type: ${analyticsType}`);
  }

  return { answer, responseType, data };
}

function formatWordFrequency(data) {
  let text = `📊 **Word Frequency Analysis**\n\n`;
  text += `Total unique words: ${data.totalUniqueWords}\n\n`;
  text += `| Rank | Word | Count |\n|------|------|-------|\n`;
  data.words.slice(0, 20).forEach((w, i) => {
    text += `| ${i + 1} | ${w.word} | ${w.count} |\n`;
  });
  return text;
}

function formatMessageCount(data) {
  let text = `📊 **Message Count Per Person**\n\n`;
  text += `Total messages: ${data.totalMessages}\n\n`;
  text += `| Rank | Person | Messages | Percentage |\n|------|--------|----------|------------|\n`;
  data.participants.forEach((p, i) => {
    text += `| ${i + 1} | ${p.sender} | ${p.count} | ${p.percentage}% |\n`;
  });
  return text;
}

function formatTimeline(data) {
  let text = `📊 **Activity Timeline** (grouped by ${data.groupBy})\n\n`;
  text += `Total periods: ${data.totalDays}\n\n`;

  // Show first and last 10 entries if too many
  const entries = data.timeline;
  if (entries.length > 20) {
    text += `| Date | Messages |\n|------|----------|\n`;
    entries.slice(0, 10).forEach((e) => {
      text += `| ${e.date} | ${e.count} |\n`;
    });
    text += `| ... | ... |\n`;
    entries.slice(-10).forEach((e) => {
      text += `| ${e.date} | ${e.count} |\n`;
    });
  } else {
    text += `| Date | Messages |\n|------|----------|\n`;
    entries.forEach((e) => {
      text += `| ${e.date} | ${e.count} |\n`;
    });
  }

  // Hourly distribution
  text += `\n**Peak hours:**\n`;
  const hourly = data.hourlyDistribution;
  const maxHour = hourly.indexOf(Math.max(...hourly));
  text += `Most active hour: ${maxHour}:00 (${hourly[maxHour]} messages)\n`;

  return text;
}

function formatMediaStats(data) {
  let text = `📊 **Media Statistics**\n\n`;
  text += `Total media shared: ${data.totalMedia}\n\n`;

  if (data.byType.length > 0) {
    text += `| Media Type | Count |\n|------------|-------|\n`;
    data.byType.forEach((t) => {
      text += `| ${t.type} | ${t.count} |\n`;
    });
  } else {
    text += `No media found in this chat.\n`;
  }

  if (data.byPerson.length > 0) {
    text += `\n**Per person:**\n`;
    text += `| Person | Total Media |\n|--------|-------------|\n`;
    data.byPerson.forEach((p) => {
      text += `| ${p.sender} | ${p.total} |\n`;
    });
  }

  return text;
}

function formatSentiment(data) {
  let text = `📊 **Sentiment Analysis**\n\n`;
  text += `Overall mood: **${data.overall.label}** (score: ${data.overall.avgSentiment})\n`;
  text += `Messages analyzed: ${data.overall.totalAnalyzed}\n\n`;

  text += `| Person | Avg Sentiment | Label | Messages |\n|--------|---------------|-------|----------|\n`;
  data.byPerson.forEach((p) => {
    text += `| ${p.sender} | ${p.avgSentiment} | ${p.label} | ${p.messageCount} |\n`;
  });

  return text;
}

module.exports = router;
