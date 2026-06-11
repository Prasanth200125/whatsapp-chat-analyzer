const { query, getClient } = require('../config/database');

const MessageModel = {
  /**
   * Bulk insert parsed messages (used after file parsing)
   * Uses a transaction for atomicity
   */
  async bulkInsert(sessionId, messages) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      for (const msg of messages) {
        await client.query(
          `INSERT INTO messages (session_id, timestamp, sender, content, message_type, word_count, sentiment_score, date_only, hour_only)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            sessionId,
            msg.timestamp,
            msg.sender,
            msg.content,
            msg.messageType,
            msg.wordCount,
            msg.sentimentScore,
            msg.dateOnly,
            msg.hourOnly,
          ]
        );
      }

      await client.query('COMMIT');
      return messages.length;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Get all messages for a session
   */
  async findBySessionId(sessionId, { limit, offset, sender, dateFrom, dateTo } = {}) {
    let sql = 'SELECT * FROM messages WHERE session_id = $1';
    const params = [sessionId];
    let paramIndex = 2;

    if (sender) {
      sql += ` AND sender = $${paramIndex}`;
      params.push(sender);
      paramIndex++;
    }

    if (dateFrom) {
      sql += ` AND date_only >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      sql += ` AND date_only <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    sql += ' ORDER BY timestamp ASC';

    if (limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(limit);
      paramIndex++;
    }

    if (offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(offset);
    }

    const result = await query(sql, params);
    return result.rows;
  },

  /**
   * Get unique senders for a session
   */
  async getSenders(sessionId) {
    const result = await query(
      'SELECT DISTINCT sender FROM messages WHERE session_id = $1 AND message_type != $2 ORDER BY sender',
      [sessionId, 'system']
    );
    return result.rows.map((r) => r.sender);
  },

  /**
   * Get message count by sender
   */
  async countBySender(sessionId) {
    const result = await query(
      `SELECT sender, COUNT(*) as count
       FROM messages
       WHERE session_id = $1 AND message_type != 'system'
       GROUP BY sender
       ORDER BY count DESC`,
      [sessionId]
    );
    return result.rows;
  },

  /**
   * Get message count by date
   */
  async countByDate(sessionId) {
    const result = await query(
      `SELECT date_only, COUNT(*) as count
       FROM messages
       WHERE session_id = $1
       GROUP BY date_only
       ORDER BY date_only ASC`,
      [sessionId]
    );
    return result.rows;
  },

  /**
   * Get message count by hour
   */
  async countByHour(sessionId) {
    const result = await query(
      `SELECT hour_only, COUNT(*) as count
       FROM messages
       WHERE session_id = $1
       GROUP BY hour_only
       ORDER BY hour_only ASC`,
      [sessionId]
    );
    return result.rows;
  },

  /**
   * Get media type counts
   */
  async countByMediaType(sessionId) {
    const result = await query(
      `SELECT message_type, COUNT(*) as count
       FROM messages
       WHERE session_id = $1 AND message_type LIKE 'media_%'
       GROUP BY message_type
       ORDER BY count DESC`,
      [sessionId]
    );
    return result.rows;
  },

  /**
   * Get media counts per person
   */
  async countMediaBySender(sessionId) {
    const result = await query(
      `SELECT sender, message_type, COUNT(*) as count
       FROM messages
       WHERE session_id = $1 AND message_type LIKE 'media_%'
       GROUP BY sender, message_type
       ORDER BY sender, count DESC`,
      [sessionId]
    );
    return result.rows;
  },

  /**
   * Full-text search in message content
   */
  async searchContent(sessionId, searchQuery) {
    const result = await query(
      `SELECT id, timestamp, sender, content, message_type
       FROM messages
       WHERE session_id = $1
         AND to_tsvector('english', COALESCE(content, '')) @@ plainto_tsquery('english', $2)
       ORDER BY timestamp ASC
       LIMIT 100`,
      [sessionId, searchQuery]
    );
    return result.rows;
  },

  /**
   * Get all text content for a session (for AI context building)
   */
  async getTextContent(sessionId, { dateFrom, dateTo, limit = 500 } = {}) {
    let sql = `SELECT timestamp, sender, content FROM messages WHERE session_id = $1 AND message_type = 'text'`;
    const params = [sessionId];
    let paramIndex = 2;

    if (dateFrom) {
      sql += ` AND date_only >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      sql += ` AND date_only <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    sql += ` ORDER BY timestamp ASC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await query(sql, params);
    return result.rows;
  },

  /**
   * Get word frequencies (all text content concatenated)
   */
  async getAllWords(sessionId) {
    const result = await query(
      `SELECT content FROM messages WHERE session_id = $1 AND message_type = 'text' AND content IS NOT NULL`,
      [sessionId]
    );
    return result.rows.map((r) => r.content);
  },

  /**
   * Get sentiment statistics
   */
  async getSentimentStats(sessionId) {
    const result = await query(
      `SELECT
         sender,
         AVG(sentiment_score) as avg_sentiment,
         MIN(sentiment_score) as min_sentiment,
         MAX(sentiment_score) as max_sentiment,
         COUNT(*) as message_count
       FROM messages
       WHERE session_id = $1 AND sentiment_score IS NOT NULL
       GROUP BY sender
       ORDER BY avg_sentiment DESC`,
      [sessionId]
    );
    return result.rows;
  },
};

module.exports = MessageModel;
