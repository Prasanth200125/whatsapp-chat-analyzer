/**
 * Query Classifier Service
 * 
 * Determines whether a user question should be handled by:
 *   - RULE_BASED: Analytics engine (fast, deterministic)
 *   - AI: Gemini API (contextual, nuanced)
 *   - HYBRID: Try rule-based first, then enhance with AI
 * 
 * Also extracts relevant parameters (dates, analytics type, etc.)
 */

// ──────────────────────────────────────────────
// Classification patterns
// ──────────────────────────────────────────────

const RULE_BASED_PATTERNS = [
  // Word frequency
  {
    patterns: [
      /most\s+(used|common|frequent|popular)\s+word/i,
      /word\s+frequen/i,
      /top\s+words/i,
      /common\s+words/i,
      /frequently\s+used\s+words/i,
    ],
    type: 'word_freq',
    analyticsType: 'word_freq',
  },
  // Message count
  {
    patterns: [
      /how\s+many\s+messages/i,
      /message\s+count/i,
      /total\s+messages/i,
      /who\s+(sent|sends|has)\s+(the\s+)?most/i,
      /most\s+active/i,
      /messages?\s+per\s+person/i,
      /who\s+talks?\s+(the\s+)?most/i,
      /who\s+chats?\s+(the\s+)?most/i,
    ],
    type: 'msg_count',
    analyticsType: 'msg_count',
  },
  // Activity timeline
  {
    patterns: [
      /activit(y|ies)\s+(over|timeline|trend|pattern)/i,
      /messages?\s+per\s+(day|week|month)/i,
      /daily\s+(message|activit)/i,
      /weekly\s+(message|activit)/i,
      /monthly\s+(message|activit)/i,
      /when\s+(are|is|was|were)\s+.+\s+(most\s+)?active/i,
      /busiest\s+(day|time|hour)/i,
      /peak\s+(hour|time|day)/i,
    ],
    type: 'timeline',
    analyticsType: 'timeline',
  },
  // Media stats
  {
    patterns: [
      /how\s+many\s+(photos?|pictures?|images?|videos?|audios?|files?|documents?|media)/i,
      /media\s+(stat|count|number)/i,
      /photos?\s+(sent|shared|count)/i,
      /videos?\s+(sent|shared|count)/i,
      /who\s+(sent|shared|sends)\s+(the\s+)?most\s+(photos?|videos?|media)/i,
    ],
    type: 'media_stats',
    analyticsType: 'media_stats',
  },
  // Sentiment (hybrid — rule-based data + AI interpretation)
  {
    patterns: [
      /sentiment/i,
      /mood/i,
      /positive\s+or\s+negative/i,
      /how\s+(does|do)\s+.+\s+feel/i,
      /emotional?\s+(tone|state)/i,
      /vibe/i,
      /overall\s+(tone|mood|feeling)/i,
    ],
    type: 'sentiment',
    analyticsType: 'sentiment',
  },
];

const AI_PATTERNS = [
  // Summaries
  /summarize/i,
  /summary/i,
  /give\s+me\s+a\s+(brief|short|quick)/i,
  /what\s+happened/i,
  /overview/i,
  /highlight/i,
  /recap/i,
  // Contextual questions
  /what\s+(did|does|do|is|are|was|were)\s+.+\s+(say|think|mean|talk|discuss)/i,
  /find\s+(anything|something|everything)\s+(about|related|regarding)/i,
  /search\s+for/i,
  /tell\s+me\s+about/i,
  /explain/i,
  /why\s+(did|does|do|is|are|was|were)/i,
  /describe/i,
  // Topic-based
  /topic/i,
  /subject/i,
  /theme/i,
  /conversation\s+about/i,
  // Relationship/opinion
  /relationship/i,
  /opinion/i,
  /perspective/i,
  // Date-range specific
  /between\s+.+\s+and\s+/i,
  /from\s+.+\s+to\s+/i,
  /in\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
  /last\s+(week|month|year)/i,
];

/**
 * Classify a user query
 * @param {string} question - User's natural language question
 * @returns {{ type: 'RULE_BASED' | 'AI' | 'HYBRID', analyticsType: string|null, question: string }}
 */
function classifyQuery(question) {
  if (!question || !question.trim()) {
    return { type: 'AI', analyticsType: null, question };
  }

  const trimmed = question.trim();

  // Check rule-based patterns first
  for (const rule of RULE_BASED_PATTERNS) {
    for (const pattern of rule.patterns) {
      if (pattern.test(trimmed)) {
        // Sentiment is hybrid (rule-based data + AI interpretation)
        if (rule.type === 'sentiment') {
          return { type: 'HYBRID', analyticsType: rule.analyticsType, question: trimmed };
        }
        return { type: 'RULE_BASED', analyticsType: rule.analyticsType, question: trimmed };
      }
    }
  }

  // Check AI patterns
  for (const pattern of AI_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { type: 'AI', analyticsType: null, question: trimmed };
    }
  }

  // Default: send to AI
  return { type: 'AI', analyticsType: null, question: trimmed };
}

module.exports = { classifyQuery };
