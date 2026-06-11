/**
 * Stop Words List
 * 
 * Common English words to exclude from word frequency analysis.
 * Also includes common WhatsApp artifacts.
 */
const STOP_WORDS = new Set([
  // Articles
  'a', 'an', 'the',
  // Pronouns
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your',
  'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her',
  'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs',
  'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
  // Verbs (common)
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'having', 'do', 'does', 'did', 'doing', 'will', 'would', 'shall', 'should',
  'can', 'could', 'may', 'might', 'must', 'ought', 'need', 'dare',
  // Prepositions
  'at', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'to', 'with', 'about',
  'above', 'after', 'again', 'against', 'all', 'below', 'between', 'but', 'down',
  'during', 'each', 'few', 'further', 'here', 'how', 'more', 'most', 'no', 'nor',
  'not', 'only', 'or', 'other', 'out', 'over', 'own', 'same', 'so', 'some',
  'such', 'than', 'then', 'there', 'through', 'too', 'under', 'until', 'up',
  'very', 'when', 'where', 'while', 'why',
  // Conjunctions
  'and', 'because', 'both', 'either', 'if', 'neither', 'since', 'unless',
  'whether', 'yet',
  // Common words
  'just', 'also', 'now', 'well', 'even', 'back', 'still', 'way', 'take',
  'think', 'come', 'make', 'like', 'get', 'go', 'know', 'say', 'see', 'want',
  'look', 'use', 'give', 'find', 'tell', 'ask', 'work', 'call', 'try', 'put',
  'keep', 'let', 'set', 'seem', 'help', 'show', 'turn', 'move', 'live', 'long',
  'really', 'already', 'one', 'two', 'first', 'new', 'good', 'much', 'before',
  'right', 'old', 'big', 'high', 'different', 'small', 'large', 'next', 'early',
  'young', 'important', 'last', 'great', 'little', 'thing', 'man', 'world', 'life',
  'hand', 'part', 'child', 'eye', 'woman', 'place', 'case', 'week', 'company',
  'system', 'program', 'question', 'government', 'number', 'night', 'point',
  // WhatsApp artifacts
  'media', 'omitted', 'deleted', 'message', 'http', 'https', 'www', 'com',
  // Single characters
  's', 't', 'd', 'll', 've', 're', 'm',
  // Common chat abbreviations (optional)
  'ok', 'okay', 'ya', 'yeah', 'yes', 'no', 'lol', 'haha', 'hehe', 'hmm',
]);

/**
 * Check if a word is a stop word
 * @param {string} word - Lowercase word
 * @returns {boolean}
 */
const isStopWord = (word) => STOP_WORDS.has(word);

module.exports = { STOP_WORDS, isStopWord };
