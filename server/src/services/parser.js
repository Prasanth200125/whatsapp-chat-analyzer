/**
 * WhatsApp Chat Parser Service
 * 
 * Parses exported WhatsApp .txt chat files into structured data.
 * 
 * Supported formats:
 *   Format A (12h):  "1/15/23, 9:45 PM - John: Hello"
 *   Format B (24h):  "15/01/2023, 21:45 - John: Hello"
 *   Format C (US):   "01/15/2023, 9:45 PM - John: Hello"
 *   Format D (BR):   "[15/01/2023 21:45:30] John: Hello"
 *   Format E:        "15/01/2023, 21:45:30 - John: Hello"
 * 
 * Handles: multi-line messages, system messages, media indicators,
 *          private vs group chat detection.
 */
const fs = require('fs');
const { parseWhatsAppDate, toDateOnly, toHourOnly } = require('../utils/dateUtils');
const { computeSentiment } = require('./sentiment');

// ──────────────────────────────────────────────
// Regex patterns for WhatsApp message line detection
// ──────────────────────────────────────────────

// Format A/C: "M/DD/YY, H:MM AM/PM - Sender: Message"
// Also matches: "MM/DD/YYYY, H:MM:SS AM/PM - Sender: Message"
const REGEX_12H = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*(AM|PM|am|pm)\s*[-–—]\s*(.+)$/;

// Format B/E: "DD/MM/YYYY, HH:MM - Sender: Message"
// Also matches: "DD/MM/YYYY, HH:MM:SS - Sender: Message"
const REGEX_24H = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]\s*(.+)$/;

// Format D: "[DD/MM/YYYY HH:MM:SS] Sender: Message"  
const REGEX_BRACKET = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(.+)$/;

// Media indicators in WhatsApp exports
const MEDIA_INDICATORS = {
  image: [
    '<media omitted>',
    'image omitted',
    '<image omitted>',
    'img-', '.jpg', '.jpeg', '.png', '.gif', '.webp',
    'photo',
  ],
  video: [
    'video omitted',
    '<video omitted>',
    'vid-', '.mp4', '.mov', '.avi', '.mkv',
  ],
  audio: [
    'audio omitted',
    '<audio omitted>',
    'ptt-', '.opus', '.ogg', '.mp3', '.m4a',
    'voice message',
  ],
  document: [
    'document omitted',
    '<document omitted>',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.zip', '.rar', '.apk',
  ],
};

// System message patterns (no "Sender:" prefix)
const SYSTEM_PATTERNS = [
  'created group',
  'added you',
  'added ',
  'removed ',
  'left',
  'changed the subject',
  'changed the group',
  'changed this group',
  "changed the group's icon",
  'messages and calls are end-to-end encrypted',
  'your security code',
  'disappeared',
  'disappearing messages',
  'you were added',
  'changed their phone number',
  'you\'re now an admin',
];

/**
 * Detect which regex format the file uses by scanning the first N lines
 * @param {string[]} lines - All lines from the file
 * @returns {{ regex: RegExp, format: string, has12h: boolean }}
 */
function detectFormat(lines) {
  const sampleSize = Math.min(lines.length, 20);

  let match12h = 0;
  let match24h = 0;
  let matchBracket = 0;

  for (let i = 0; i < sampleSize; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (REGEX_12H.test(line)) match12h++;
    if (REGEX_BRACKET.test(line)) matchBracket++;
    if (REGEX_24H.test(line) && !REGEX_12H.test(line)) match24h++;
  }

  if (matchBracket > match12h && matchBracket > match24h) {
    return { regex: REGEX_BRACKET, format: 'bracket', has12h: false };
  }
  if (match12h >= match24h) {
    return { regex: REGEX_12H, format: '12h', has12h: true };
  }
  return { regex: REGEX_24H, format: '24h', has12h: false };
}

/**
 * Detect media type from message content
 * @param {string} content - Message content
 * @returns {string} message_type: text | media_image | media_video | media_audio | media_document
 */
function detectMediaType(content) {
  if (!content) return 'text';
  const lower = content.toLowerCase().trim();

  // Generic "<Media omitted>" — classify as image (most common)
  if (lower === '<media omitted>' || lower === 'media omitted') {
    return 'media_image';
  }

  for (const [type, indicators] of Object.entries(MEDIA_INDICATORS)) {
    for (const indicator of indicators) {
      if (lower.includes(indicator)) {
        return `media_${type}`;
      }
    }
  }

  return 'text';
}

/**
 * Check if a message is a system message (no sender)
 * @param {string} content - Full content after timestamp (sender + message combined)
 * @returns {boolean}
 */
function isSystemMessage(content) {
  if (!content) return false;
  const lower = content.toLowerCase();

  // System messages typically don't have a "Sender: message" format
  // OR match known system patterns
  for (const pattern of SYSTEM_PATTERNS) {
    if (lower.includes(pattern)) return true;
  }

  return false;
}

/**
 * Extract sender and content from the post-timestamp portion
 * @param {string} rawContent - Everything after "- " or "] " in the line
 * @returns {{ sender: string, content: string, isSystem: boolean }}
 */
function extractSenderAndContent(rawContent) {
  if (!rawContent) {
    return { sender: 'System', content: '', isSystem: true };
  }

  // Check for system messages first (they often have no colon separator)
  if (isSystemMessage(rawContent) && !rawContent.includes(': ')) {
    return { sender: 'System', content: rawContent.trim(), isSystem: true };
  }

  // Split at first ": " to get sender and content
  const colonIdx = rawContent.indexOf(': ');

  if (colonIdx === -1) {
    // No colon — likely a system message
    return { sender: 'System', content: rawContent.trim(), isSystem: true };
  }

  const sender = rawContent.substring(0, colonIdx).trim();
  const content = rawContent.substring(colonIdx + 2).trim();

  // If sender looks like a system message, mark it
  if (isSystemMessage(rawContent)) {
    return { sender: 'System', content: rawContent.trim(), isSystem: true };
  }

  return { sender, content, isSystem: false };
}

/**
 * Count words in a text string
 * @param {string} text
 * @returns {number}
 */
function countWords(text) {
  if (!text) return 0;
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Parse a WhatsApp .txt file into structured messages
 * @param {string} filePath - Path to the .txt file
 * @returns {{ messages: Object[], metadata: Object }}
 */
function parseFile(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return parseContent(fileContent);
}

/**
 * Parse WhatsApp chat content string into structured messages
 * @param {string} content - Raw file content
 * @returns {{ messages: Object[], metadata: Object }}
 */
function parseContent(content) {
  if (!content || !content.trim()) {
    throw new Error('File is empty. No messages found.');
  }

  // Split into lines and remove BOM if present
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/);

  if (lines.length === 0) {
    throw new Error('File is empty. No messages found.');
  }

  // Detect format
  const { regex, format, has12h } = detectFormat(lines);

  const messages = [];
  let currentMessage = null;
  const senders = new Set();
  let earliestDate = null;
  let latestDate = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      if (currentMessage) {
        currentMessage.content += '\n';
      }
      continue;
    }

    // Try to match as a new message line
    const match = line.match(regex);

    if (match) {
      // Save previous message
      if (currentMessage) {
        finalizeMessage(currentMessage, senders);
        messages.push(currentMessage);
      }

      let dateStr, timeStr, ampm, rawContent;

      if (has12h) {
        // 12h format: groups = [full, date, time, AM/PM, content]
        dateStr = match[1];
        timeStr = match[2];
        ampm = match[3];
        rawContent = match[4];
      } else {
        // 24h / bracket format: groups = [full, date, time, content]
        dateStr = match[1];
        timeStr = match[2];
        ampm = null;
        rawContent = match[3];
      }

      // Parse timestamp
      const timestamp = parseWhatsAppDate(dateStr, timeStr, ampm);
      if (!timestamp) {
        // Failed to parse date — treat as continuation of previous message
        if (currentMessage) {
          currentMessage.content += '\n' + line;
        }
        continue;
      }

      // Track date range
      if (!earliestDate || timestamp < earliestDate) earliestDate = timestamp;
      if (!latestDate || timestamp > latestDate) latestDate = timestamp;

      // Extract sender and content
      const { sender, content: msgContent, isSystem } = extractSenderAndContent(rawContent);

      currentMessage = {
        timestamp,
        sender,
        content: msgContent,
        messageType: isSystem ? 'system' : detectMediaType(msgContent),
        wordCount: 0,
        sentimentScore: null,
        dateOnly: toDateOnly(timestamp),
        hourOnly: toHourOnly(timestamp),
      };
    } else {
      // Multi-line message continuation
      if (currentMessage) {
        currentMessage.content += '\n' + line;
      }
    }
  }

  // Don't forget the last message
  if (currentMessage) {
    finalizeMessage(currentMessage, senders);
    messages.push(currentMessage);
  }

  if (messages.length === 0) {
    throw new Error('No valid WhatsApp messages found. Please ensure the file is a valid WhatsApp chat export.');
  }

  // Determine chat type
  const nonSystemSenders = [...senders].filter((s) => s !== 'System');
  const chatType = nonSystemSenders.length > 2 ? 'group' : 'private';

  const metadata = {
    totalMessages: messages.length,
    totalParticipants: nonSystemSenders.length,
    participants: nonSystemSenders,
    chatType,
    dateRangeStart: earliestDate,
    dateRangeEnd: latestDate,
    format,
  };

  return { messages, metadata };
}

/**
 * Finalize a message — compute word count and sentiment
 * @param {Object} msg - Message object
 * @param {Set} senders - Set of sender names
 */
function finalizeMessage(msg, senders) {
  // Trim trailing newlines from multi-line messages
  msg.content = msg.content.trim();

  // Compute word count for text messages
  if (msg.messageType === 'text') {
    msg.wordCount = countWords(msg.content);
    msg.sentimentScore = computeSentiment(msg.content);
  }

  // Track unique senders
  if (msg.sender !== 'System') {
    senders.add(msg.sender);
  }
}

module.exports = {
  parseFile,
  parseContent,
  detectFormat,
  detectMediaType,
  isSystemMessage,
  extractSenderAndContent,
  countWords,
};
