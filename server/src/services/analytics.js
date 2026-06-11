/**
 * Analytics Engine Service
 * 
 * Rule-based analytics for WhatsApp chat data.
 * Handles: word frequency, message counts, activity timeline,
 *          media statistics, and sentiment aggregation.
 * 
 * Results are cached in analytics_cache table for performance.
 */
const MessageModel = require('../models/message');
const AnalyticsCacheModel = require('../models/analyticsCache');
const { isStopWord } = require('../utils/stopWords');

const AnalyticsService = {
  /**
   * Word Frequency Analysis
   * Tokenizes all text messages, removes stop words, returns sorted frequency map.
   * 
   * @param {string} sessionId
   * @param {number} topN - Number of top words to return (default 50)
   * @returns {Promise<{ words: Array<{ word: string, count: number }>, totalUniqueWords: number }>}
   */
  async wordFrequency(sessionId, topN = 50) {
    // Check cache first
    const cached = await AnalyticsCacheModel.get(sessionId, 'word_freq');
    if (cached) return cached.result_data;

    // Get all text content
    const allContent = await MessageModel.getAllWords(sessionId);
    const freqMap = {};

    for (const text of allContent) {
      // Tokenize: split on whitespace and punctuation, lowercase
      const words = text
        .toLowerCase()
        .replace(/[.,!?;:'"()[\]{}""''…—–\-]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 1 && !isStopWord(w) && !/^\d+$/.test(w));

      for (const word of words) {
        freqMap[word] = (freqMap[word] || 0) + 1;
      }
    }

    // Sort by frequency descending
    const sorted = Object.entries(freqMap)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count);

    const result = {
      words: sorted.slice(0, topN),
      totalUniqueWords: sorted.length,
    };

    // Cache the result
    await AnalyticsCacheModel.set(sessionId, 'word_freq', result);
    return result;
  },

  /**
   * Message Count Per Person
   * Groups messages by sender with counts and percentages.
   * 
   * @param {string} sessionId
   * @returns {Promise<{ participants: Array<{ sender: string, count: number, percentage: number }>, totalMessages: number }>}
   */
  async messageCount(sessionId) {
    const cached = await AnalyticsCacheModel.get(sessionId, 'msg_count');
    if (cached) return cached.result_data;

    const counts = await MessageModel.countBySender(sessionId);
    const totalMessages = counts.reduce((sum, r) => sum + parseInt(r.count), 0);

    const participants = counts.map((r) => ({
      sender: r.sender,
      count: parseInt(r.count),
      percentage: totalMessages > 0 ? Math.round((parseInt(r.count) / totalMessages) * 10000) / 100 : 0,
    }));

    const result = { participants, totalMessages };
    await AnalyticsCacheModel.set(sessionId, 'msg_count', result);
    return result;
  },

  /**
   * Activity Timeline
   * Groups messages by day/week/month with counts.
   * 
   * @param {string} sessionId
   * @param {string} groupBy - 'day' | 'week' | 'month' (default: 'day')
   * @returns {Promise<{ timeline: Array<{ date: string, count: number }>, groupBy: string }>}
   */
  async activityTimeline(sessionId, groupBy = 'day') {
    const cached = await AnalyticsCacheModel.get(sessionId, 'timeline');
    if (cached && cached.result_data.groupBy === groupBy) return cached.result_data;

    const dailyCounts = await MessageModel.countByDate(sessionId);

    let timeline;

    if (groupBy === 'day') {
      // Fill gaps with zero-count days
      timeline = fillDateGaps(dailyCounts);
    } else if (groupBy === 'week') {
      timeline = aggregateByWeek(dailyCounts);
    } else if (groupBy === 'month') {
      timeline = aggregateByMonth(dailyCounts);
    } else {
      timeline = dailyCounts.map((r) => ({
        date: r.date_only,
        count: parseInt(r.count),
      }));
    }

    // Also get hourly distribution
    const hourlyCounts = await MessageModel.countByHour(sessionId);
    const hourlyDistribution = Array(24).fill(0);
    for (const row of hourlyCounts) {
      hourlyDistribution[row.hour_only] = parseInt(row.count);
    }

    const result = {
      timeline,
      hourlyDistribution,
      groupBy,
      totalDays: timeline.length,
    };

    await AnalyticsCacheModel.set(sessionId, 'timeline', result);
    return result;
  },

  /**
   * Media Statistics
   * Counts media by type and by person.
   * 
   * @param {string} sessionId
   * @returns {Promise<{ byType: Array, byPerson: Array, totalMedia: number }>}
   */
  async mediaStats(sessionId) {
    const cached = await AnalyticsCacheModel.get(sessionId, 'media_stats');
    if (cached) return cached.result_data;

    const byType = await MessageModel.countByMediaType(sessionId);
    const byPerson = await MessageModel.countMediaBySender(sessionId);
    const totalMedia = byType.reduce((sum, r) => sum + parseInt(r.count), 0);

    const result = {
      byType: byType.map((r) => ({
        type: r.message_type.replace('media_', ''),
        count: parseInt(r.count),
      })),
      byPerson: formatMediaByPerson(byPerson),
      totalMedia,
    };

    await AnalyticsCacheModel.set(sessionId, 'media_stats', result);
    return result;
  },

  /**
   * Sentiment Analysis (aggregated)
   * Average sentiment per person and overall.
   * 
   * @param {string} sessionId
   * @returns {Promise<{ byPerson: Array, overall: Object }>}
   */
  async sentimentAnalysis(sessionId) {
    const cached = await AnalyticsCacheModel.get(sessionId, 'sentiment');
    if (cached) return cached.result_data;

    const stats = await MessageModel.getSentimentStats(sessionId);

    const byPerson = stats.map((r) => ({
      sender: r.sender,
      avgSentiment: Math.round(parseFloat(r.avg_sentiment) * 1000) / 1000,
      minSentiment: Math.round(parseFloat(r.min_sentiment) * 1000) / 1000,
      maxSentiment: Math.round(parseFloat(r.max_sentiment) * 1000) / 1000,
      messageCount: parseInt(r.message_count),
      label: getSentimentLabel(parseFloat(r.avg_sentiment)),
    }));

    // Overall sentiment
    const totalMessages = byPerson.reduce((sum, p) => sum + p.messageCount, 0);
    const weightedAvg = totalMessages > 0
      ? byPerson.reduce((sum, p) => sum + p.avgSentiment * p.messageCount, 0) / totalMessages
      : 0;

    const result = {
      byPerson,
      overall: {
        avgSentiment: Math.round(weightedAvg * 1000) / 1000,
        label: getSentimentLabel(weightedAvg),
        totalAnalyzed: totalMessages,
      },
    };

    await AnalyticsCacheModel.set(sessionId, 'sentiment', result);
    return result;
  },
};

// ──────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────

/**
 * Fill date gaps with zero counts
 */
function fillDateGaps(dailyCounts) {
  if (dailyCounts.length === 0) return [];

  const result = [];
  const countMap = new Map();

  for (const row of dailyCounts) {
    const dateStr = row.date_only instanceof Date
      ? row.date_only.toISOString().split('T')[0]
      : String(row.date_only);
    countMap.set(dateStr, parseInt(row.count));
  }

  // Find date range
  const dates = [...countMap.keys()].sort();
  const startDate = new Date(dates[0]);
  const endDate = new Date(dates[dates.length - 1]);

  // Fill all days
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    result.push({
      date: dateStr,
      count: countMap.get(dateStr) || 0,
    });
    current.setDate(current.getDate() + 1);
  }

  return result;
}

/**
 * Aggregate daily counts into weekly buckets
 */
function aggregateByWeek(dailyCounts) {
  const weekMap = new Map();

  for (const row of dailyCounts) {
    const date = new Date(row.date_only);
    // Get ISO week start (Monday)
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(date.setDate(diff));
    const weekKey = weekStart.toISOString().split('T')[0];

    weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + parseInt(row.count));
  }

  return [...weekMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));
}

/**
 * Aggregate daily counts into monthly buckets
 */
function aggregateByMonth(dailyCounts) {
  const monthMap = new Map();

  for (const row of dailyCounts) {
    const date = new Date(row.date_only);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + parseInt(row.count));
  }

  return [...monthMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));
}

/**
 * Format media-by-person data into a cleaner structure
 */
function formatMediaByPerson(byPerson) {
  const personMap = {};

  for (const row of byPerson) {
    if (!personMap[row.sender]) {
      personMap[row.sender] = { sender: row.sender, total: 0, breakdown: {} };
    }
    const type = row.message_type.replace('media_', '');
    const count = parseInt(row.count);
    personMap[row.sender].breakdown[type] = count;
    personMap[row.sender].total += count;
  }

  return Object.values(personMap).sort((a, b) => b.total - a.total);
}

/**
 * Get human-readable sentiment label
 */
function getSentimentLabel(score) {
  if (score > 0.3) return 'Positive';
  if (score > 0.1) return 'Slightly Positive';
  if (score > -0.1) return 'Neutral';
  if (score > -0.3) return 'Slightly Negative';
  return 'Negative';
}

module.exports = AnalyticsService;
