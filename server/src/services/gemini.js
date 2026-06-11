/**
 * Google Gemini AI Service
 * 
 * Handles AI-powered chat Q&A using the Gemini API.
 * Builds context from parsed messages, sends prompts, and returns answers.
 * 
 * Features:
 *   - Context building from parsed messages
 *   - Chunking for large chats
 *   - Date-range filtering
 *   - Rate limit handling
 *   - Timeout handling
 */

const MessageModel = require('../models/message');

// Gemini API endpoint
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Max context size (characters) to send to Gemini
const MAX_CONTEXT_CHARS = 30000;

// Max messages to include in context
const MAX_CONTEXT_MESSAGES = 500;

/**
 * Send a question to Gemini with chat context
 * @param {string} sessionId - Session UUID
 * @param {string} question - User's question
 * @param {Object} options - Optional: { dateFrom, dateTo }
 * @returns {Promise<{ answer: string, responseType: string }>}
 */
async function askGemini(sessionId, question, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY in your .env file.');
  }

  // Build context from chat messages
  const context = await buildContext(sessionId, options);

  // Build the prompt
  const prompt = buildPrompt(question, context);

  // Call Gemini API
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.9,
          topK: 40,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      const errorBody = await response.text();

      if (response.status === 429) {
        throw new Error('AI service rate limit reached. Please wait a moment and try again.');
      }
      if (response.status === 403) {
        throw new Error('Gemini API key is invalid or expired. Please check your API key.');
      }

      throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();

    // Extract the text response
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!answer) {
      throw new Error('Gemini returned an empty response. The question might have been blocked by safety filters.');
    }

    return {
      answer: answer.trim(),
      responseType: 'text',
    };
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new Error('AI service timed out. The chat might be too large. Try asking about a specific date range.');
    }
    throw err;
  }
}

/**
 * Build chat context string from session messages
 */
async function buildContext(sessionId, options = {}) {
  const messages = await MessageModel.getTextContent(sessionId, {
    dateFrom: options.dateFrom,
    dateTo: options.dateTo,
    limit: MAX_CONTEXT_MESSAGES,
  });

  if (messages.length === 0) {
    return 'No messages found in the specified range.';
  }

  // Format messages as a readable chat log
  let context = '';
  for (const msg of messages) {
    const timestamp = new Date(msg.timestamp).toLocaleString();
    const line = `[${timestamp}] ${msg.sender}: ${msg.content}\n`;

    // Check character limit
    if (context.length + line.length > MAX_CONTEXT_CHARS) {
      context += '\n[... more messages truncated for context limit ...]\n';
      break;
    }

    context += line;
  }

  return context;
}

/**
 * Build the complete prompt for Gemini
 */
function buildPrompt(question, context) {
  return `You are a WhatsApp Chat Analyzer AI assistant. You analyze exported WhatsApp conversations and answer questions about them.

Here is the WhatsApp conversation data:

---START OF CHAT---
${context}
---END OF CHAT---

Based on the chat data above, please answer the following question:

"${question}"

Guidelines:
- Be specific and reference actual messages, senders, and dates when relevant.
- If the question asks for a summary, provide key topics, notable events, and participant dynamics.
- If the question asks about a specific person, focus on their messages and behavior.
- If the data doesn't contain enough information to answer, say so clearly.
- Keep your response concise but informative.
- Format your response with clear structure (use bullet points, headers where appropriate).
- Do NOT make up information that isn't in the chat data.`;
}

module.exports = { askGemini };
