/**
 * Export Service
 * 
 * Generates CSV and PDF exports from analytics data.
 * PDF generation uses basic HTML-to-text formatting (no heavy dependencies).
 */
const AnalyticsService = require('./analytics');

const ExportService = {
  /**
   * Generate CSV export of analytics data
   * @param {string} sessionId
   * @returns {Promise<string>} CSV content
   */
  async generateCSV(sessionId) {
    // Get all analytics
    const [wordFreq, msgCount, timeline, mediaStats, sentiment] = await Promise.all([
      AnalyticsService.wordFrequency(sessionId, 100),
      AnalyticsService.messageCount(sessionId),
      AnalyticsService.activityTimeline(sessionId),
      AnalyticsService.mediaStats(sessionId),
      AnalyticsService.sentimentAnalysis(sessionId),
    ]);

    let csv = '';

    // ── Message Count Section ──
    csv += 'SECTION: Message Count Per Person\n';
    csv += 'Sender,Messages,Percentage\n';
    msgCount.participants.forEach((p) => {
      csv += `"${p.sender}",${p.count},${p.percentage}%\n`;
    });
    csv += `\nTotal Messages,${msgCount.totalMessages}\n`;
    csv += '\n';

    // ── Word Frequency Section ──
    csv += 'SECTION: Word Frequency (Top 100)\n';
    csv += 'Rank,Word,Count\n';
    wordFreq.words.forEach((w, i) => {
      csv += `${i + 1},"${w.word}",${w.count}\n`;
    });
    csv += `\nTotal Unique Words,${wordFreq.totalUniqueWords}\n`;
    csv += '\n';

    // ── Activity Timeline Section ──
    csv += `SECTION: Activity Timeline (${timeline.groupBy})\n`;
    csv += 'Date,Messages\n';
    timeline.timeline.forEach((t) => {
      csv += `${t.date},${t.count}\n`;
    });
    csv += '\n';

    // ── Hourly Distribution ──
    csv += 'SECTION: Hourly Distribution\n';
    csv += 'Hour,Messages\n';
    timeline.hourlyDistribution.forEach((count, hour) => {
      csv += `${String(hour).padStart(2, '0')}:00,${count}\n`;
    });
    csv += '\n';

    // ── Media Statistics Section ──
    csv += 'SECTION: Media Statistics\n';
    csv += 'Media Type,Count\n';
    mediaStats.byType.forEach((m) => {
      csv += `"${m.type}",${m.count}\n`;
    });
    csv += `\nTotal Media,${mediaStats.totalMedia}\n`;
    csv += '\n';

    if (mediaStats.byPerson.length > 0) {
      csv += 'SECTION: Media Per Person\n';
      csv += 'Sender,Total Media\n';
      mediaStats.byPerson.forEach((p) => {
        csv += `"${p.sender}",${p.total}\n`;
      });
      csv += '\n';
    }

    // ── Sentiment Section ──
    csv += 'SECTION: Sentiment Analysis\n';
    csv += 'Sender,Average Sentiment,Label,Messages Analyzed\n';
    sentiment.byPerson.forEach((p) => {
      csv += `"${p.sender}",${p.avgSentiment},"${p.label}",${p.messageCount}\n`;
    });
    csv += `\nOverall Sentiment,${sentiment.overall.avgSentiment},"${sentiment.overall.label}",${sentiment.overall.totalAnalyzed}\n`;

    return csv;
  },

  /**
   * Generate a text-based report (used as PDF content placeholder)
   * For proper PDF generation, consider adding pdfkit or puppeteer in the future.
   * @param {string} sessionId
   * @returns {Promise<string>} Report text content
   */
  async generateReport(sessionId) {
    const [wordFreq, msgCount, timeline, mediaStats, sentiment] = await Promise.all([
      AnalyticsService.wordFrequency(sessionId, 50),
      AnalyticsService.messageCount(sessionId),
      AnalyticsService.activityTimeline(sessionId),
      AnalyticsService.mediaStats(sessionId),
      AnalyticsService.sentimentAnalysis(sessionId),
    ]);

    let report = '';
    report += '═══════════════════════════════════════════\n';
    report += '     WhatsApp Chat Analysis Report\n';
    report += '═══════════════════════════════════════════\n\n';
    report += `Generated: ${new Date().toLocaleString()}\n\n`;

    // Message Counts
    report += '── MESSAGE COUNT PER PERSON ──────────────\n\n';
    report += `Total Messages: ${msgCount.totalMessages}\n\n`;
    msgCount.participants.forEach((p, i) => {
      const bar = '█'.repeat(Math.round(p.percentage / 2));
      report += `  ${i + 1}. ${p.sender.padEnd(20)} ${String(p.count).padStart(6)} (${p.percentage}%) ${bar}\n`;
    });
    report += '\n';

    // Word Frequency
    report += '── TOP WORDS ─────────────────────────────\n\n';
    report += `Unique Words: ${wordFreq.totalUniqueWords}\n\n`;
    wordFreq.words.slice(0, 20).forEach((w, i) => {
      report += `  ${String(i + 1).padStart(2)}. ${w.word.padEnd(20)} ${w.count}\n`;
    });
    report += '\n';

    // Media Stats
    report += '── MEDIA STATISTICS ──────────────────────\n\n';
    report += `Total Media: ${mediaStats.totalMedia}\n\n`;
    mediaStats.byType.forEach((m) => {
      report += `  ${m.type.padEnd(15)} ${m.count}\n`;
    });
    report += '\n';

    // Sentiment
    report += '── SENTIMENT ANALYSIS ────────────────────\n\n';
    report += `Overall: ${sentiment.overall.label} (${sentiment.overall.avgSentiment})\n\n`;
    sentiment.byPerson.forEach((p) => {
      report += `  ${p.sender.padEnd(20)} ${p.label.padEnd(18)} (${p.avgSentiment})\n`;
    });
    report += '\n';

    report += '═══════════════════════════════════════════\n';
    report += '  End of Report\n';
    report += '═══════════════════════════════════════════\n';

    return report;
  },
};

module.exports = ExportService;
