const { query } = require('../config/database');

const ConversationModel = {
  /**
   * Create a new conversation within a session
   */
  async create(sessionId, title = 'New Conversation') {
    const result = await query(
      `INSERT INTO conversations (session_id, title)
       VALUES ($1, $2)
       RETURNING *`,
      [sessionId, title]
    );
    return result.rows[0];
  },

  /**
   * Get all conversations for a session
   */
  async findBySessionId(sessionId) {
    const result = await query(
      `SELECT * FROM conversations WHERE session_id = $1 ORDER BY created_at DESC`,
      [sessionId]
    );
    return result.rows;
  },

  /**
   * Get a single conversation by ID
   */
  async findById(conversationId) {
    const result = await query(
      'SELECT * FROM conversations WHERE id = $1',
      [conversationId]
    );
    return result.rows[0] || null;
  },

  /**
   * Update conversation title
   */
  async updateTitle(conversationId, title) {
    const result = await query(
      `UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [title, conversationId]
    );
    return result.rows[0] || null;
  },

  /**
   * Delete a conversation
   */
  async delete(conversationId) {
    const result = await query(
      'DELETE FROM conversations WHERE id = $1 RETURNING id',
      [conversationId]
    );
    return result.rowCount > 0;
  },

  /**
   * Add a message to a conversation
   */
  async addMessage(conversationId, role, content, responseType = 'text', responseData = null) {
    const result = await query(
      `INSERT INTO conversation_messages (conversation_id, role, content, response_type, response_data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [conversationId, role, content, responseType, responseData ? JSON.stringify(responseData) : null]
    );

    // Update conversation's updated_at
    await query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);

    return result.rows[0];
  },

  /**
   * Get all messages in a conversation
   */
  async getMessages(conversationId) {
    const result = await query(
      `SELECT * FROM conversation_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [conversationId]
    );
    return result.rows;
  },
};

module.exports = ConversationModel;
