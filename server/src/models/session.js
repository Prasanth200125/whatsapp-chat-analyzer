const { query, getClient } = require('../config/database');

const SessionModel = {
  /**
   * Create a new analysis session
   */
  async create(userId, fileName, chatType, totalMessages, totalParticipants, dateRangeStart, dateRangeEnd) {
    const result = await query(
      `INSERT INTO sessions (user_id, file_name, chat_type, total_messages, total_participants, date_range_start, date_range_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, fileName, chatType, totalMessages, totalParticipants, dateRangeStart, dateRangeEnd]
    );
    return result.rows[0];
  },

  /**
   * Get all sessions for a user
   */
  async findByUserId(userId) {
    const result = await query(
      `SELECT id, file_name, chat_type, total_messages, total_participants,
              date_range_start, date_range_end, created_at, updated_at
       FROM sessions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  /**
   * Get a single session by ID (with ownership check)
   */
  async findById(sessionId, userId) {
    const result = await query(
      `SELECT * FROM sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );
    return result.rows[0] || null;
  },

  /**
   * Delete a session (cascades to all related data)
   */
  async delete(sessionId, userId) {
    const result = await query(
      'DELETE FROM sessions WHERE id = $1 AND user_id = $2 RETURNING id',
      [sessionId, userId]
    );
    return result.rowCount > 0;
  },

  /**
   * Update session metadata
   */
  async update(sessionId, userId, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    fields.push(`updated_at = NOW()`);
    values.push(sessionId, userId);

    const result = await query(
      `UPDATE sessions SET ${fields.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },
};

module.exports = SessionModel;
