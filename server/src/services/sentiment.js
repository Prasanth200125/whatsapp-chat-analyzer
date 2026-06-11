/**
 * Sentiment Analysis Service
 * 
 * Basic lexicon-based sentiment scoring for WhatsApp messages.
 * Scores range from -1 (very negative) to +1 (very positive).
 * 
 * Uses AFINN-inspired word lists for fast, dependency-free sentiment analysis.
 * For more nuanced analysis, the Gemini AI module handles contextual sentiment.
 */

// Positive words with weights (1-3 scale)
const POSITIVE_WORDS = {
  // Strong positive (3)
  'amazing': 3, 'awesome': 3, 'excellent': 3, 'fantastic': 3, 'incredible': 3,
  'outstanding': 3, 'perfect': 3, 'wonderful': 3, 'brilliant': 3, 'superb': 3,
  'beautiful': 3, 'magnificent': 3, 'exceptional': 3, 'extraordinary': 3,
  // Medium positive (2)
  'great': 2, 'love': 2, 'lovely': 2, 'happy': 2, 'glad': 2, 'excited': 2,
  'enjoy': 2, 'delighted': 2, 'pleased': 2, 'thrilled': 2, 'grateful': 2,
  'thankful': 2, 'blessed': 2, 'proud': 2, 'impressive': 2, 'fun': 2,
  'best': 2, 'favorite': 2, 'favourite': 2, 'congratulations': 2, 'congrats': 2,
  'celebrate': 2, 'celebration': 2, 'cheers': 2, 'bravo': 2, 'hurray': 2,
  'yay': 2, 'woohoo': 2, 'wow': 2,
  // Mild positive (1)
  'good': 1, 'nice': 1, 'fine': 1, 'cool': 1, 'okay': 1, 'thanks': 1,
  'thank': 1, 'welcome': 1, 'agree': 1, 'sure': 1, 'right': 1, 'yes': 1,
  'interesting': 1, 'helpful': 1, 'useful': 1, 'kind': 1, 'sweet': 1,
  'cute': 1, 'pretty': 1, 'laugh': 1, 'haha': 1, 'hehe': 1, 'lol': 1,
  'lmao': 1, 'rofl': 1, 'like': 1, 'hope': 1, 'wish': 1, 'care': 1,
  'safe': 1, 'easy': 1, 'better': 1, 'improve': 1, 'progress': 1,
};

// Negative words with weights (-1 to -3 scale)
const NEGATIVE_WORDS = {
  // Strong negative (-3)
  'terrible': -3, 'horrible': -3, 'awful': -3, 'disgusting': -3, 'hate': -3,
  'despise': -3, 'furious': -3, 'devastated': -3, 'disaster': -3, 'worst': -3,
  'pathetic': -3, 'miserable': -3, 'appalling': -3, 'atrocious': -3,
  'abysmal': -3, 'dreadful': -3,
  // Medium negative (-2)
  'bad': -2, 'angry': -2, 'upset': -2, 'sad': -2, 'annoyed': -2, 'frustrated': -2,
  'disappointed': -2, 'worried': -2, 'scared': -2, 'afraid': -2, 'pain': -2,
  'hurt': -2, 'sick': -2, 'tired': -2, 'boring': -2, 'ugly': -2, 'stupid': -2,
  'idiot': -2, 'fool': -2, 'waste': -2, 'fail': -2, 'failed': -2, 'failure': -2,
  'wrong': -2, 'problem': -2, 'trouble': -2, 'difficult': -2, 'hard': -2,
  'unfortunately': -2, 'regret': -2, 'sorry': -2, 'rude': -2, 'unfair': -2,
  // Mild negative (-1)
  'no': -1, 'not': -1, 'never': -1, 'neither': -1, 'nobody': -1, 'nothing': -1,
  'don\'t': -1, 'doesn\'t': -1, 'didn\'t': -1, 'won\'t': -1, 'wouldn\'t': -1,
  'can\'t': -1, 'couldn\'t': -1, 'shouldn\'t': -1, 'isn\'t': -1, 'aren\'t': -1,
  'wasn\'t': -1, 'weren\'t': -1, 'hasn\'t': -1, 'haven\'t': -1,
  'miss': -1, 'missing': -1, 'lost': -1, 'lose': -1, 'late': -1,
  'slow': -1, 'wait': -1, 'boring': -1, 'bored': -1, 'meh': -1,
  'doubt': -1, 'confused': -1, 'confusing': -1, 'unclear': -1,
};

// Emoji sentiment (common emojis)
const EMOJI_SENTIMENT = {
  '😊': 2, '😄': 2, '😁': 2, '😃': 2, '😀': 2, '🥰': 3, '😍': 3,
  '❤️': 3, '❤': 3, '💕': 2, '💖': 2, '💗': 2, '💙': 2, '💚': 2,
  '👍': 1, '👏': 2, '🎉': 2, '🎊': 2, '✨': 1, '🌟': 1, '⭐': 1,
  '😂': 2, '🤣': 2, '😆': 1, '😅': 1, '🙏': 1, '🤗': 2, '😇': 2,
  '😢': -2, '😭': -2, '😞': -2, '😔': -2, '😟': -2, '😩': -2,
  '😡': -3, '😠': -2, '🤬': -3, '💔': -2, '😤': -2,
  '🤢': -2, '🤮': -3, '😷': -1, '🤒': -1, '😰': -2, '😨': -2,
  '👎': -2, '💀': -1, '☠️': -1,
};

// Negation words that flip sentiment
const NEGATION_WORDS = new Set([
  'not', 'no', 'never', 'neither', 'nobody', 'nothing', 'nowhere',
  'nor', 'don\'t', 'doesn\'t', 'didn\'t', 'won\'t', 'wouldn\'t',
  'can\'t', 'couldn\'t', 'shouldn\'t', 'isn\'t', 'aren\'t',
  'wasn\'t', 'weren\'t', 'hasn\'t', 'haven\'t', 'hardly', 'barely',
]);

/**
 * Compute sentiment score for a text message
 * @param {string} text - Message text
 * @returns {number} Score between -1.0 and 1.0
 */
function computeSentiment(text) {
  if (!text || text.trim().length === 0) return 0;

  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter((w) => w.length > 0);

  if (words.length === 0) return 0;

  let totalScore = 0;
  let wordCount = 0;
  let negated = false;

  // Score words
  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[.,!?;:'"()[\]{}]/g, '');

    // Check for negation
    if (NEGATION_WORDS.has(word)) {
      negated = true;
      continue;
    }

    let score = 0;
    if (POSITIVE_WORDS[word] !== undefined) {
      score = POSITIVE_WORDS[word];
    } else if (NEGATIVE_WORDS[word] !== undefined) {
      score = NEGATIVE_WORDS[word];
    }

    if (score !== 0) {
      // Apply negation (flips sentiment)
      if (negated) {
        score = -score * 0.5; // Negation reduces magnitude
        negated = false;
      }
      totalScore += score;
      wordCount++;
    } else {
      // Reset negation after a non-sentiment word
      if (i > 0 && negated) negated = false;
    }
  }

  // Score emojis
  for (const [emoji, score] of Object.entries(EMOJI_SENTIMENT)) {
    const regex = new RegExp(emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = text.match(regex);
    if (matches) {
      totalScore += score * matches.length;
      wordCount += matches.length;
    }
  }

  // Exclamation marks boost sentiment intensity
  const exclamations = (text.match(/!/g) || []).length;
  if (exclamations > 0 && totalScore !== 0) {
    totalScore *= (1 + exclamations * 0.1);
  }

  // Normalize to -1 to 1 range
  if (wordCount === 0) return 0;

  const rawScore = totalScore / (wordCount * 3); // Max possible per word is 3
  return Math.max(-1, Math.min(1, rawScore)); // Clamp
}

module.exports = { computeSentiment };
