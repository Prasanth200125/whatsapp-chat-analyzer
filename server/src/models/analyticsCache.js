const { query } = require('../config/database');

const AnalyticsCacheModel = {
  /**
   * Get cached analytics result
   */
  async get(sessionId, analyticsType) {
    const result = await query(
      `SELECT result_data, computed_at FROM analytics_cache
       WHERE session_id = $1 AND analytics_type = $2`,
      [sessionId, analyticsType]
    );
    return result.rows[0] || null;
  },

  /**
   * Store or update cached analytics result
   * Uses UPSERT (INSERT ... ON CONFLICT UPDATE)
   */
  async set(sessionId, analyticsType, resultData) {
    const result = await query(
      `INSERT INTO analytics_cache (session_id, analytics_type, result_data, computed_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (session_id, analytics_type)
       DO UPDATE SET result_data = $3, computed_at = NOW()
       RETURNING *`,
      [sessionId, analyticsType, JSON.stringify(resultData)]
    );
    return result.rows[0];
  },

  /**
   * Invalidate all cache for a session
   */
  async invalidate(sessionId) {
    await query('DELETE FROM analytics_cache WHERE session_id = $1', [sessionId]);
  },

  /**
   * Invalidate a specific analytics type
   */
  async invalidateType(sessionId, analyticsType) {
    await query(
      'DELETE FROM analytics_cache WHERE session_id = $1 AND analytics_type = $2',
      [sessionId, analyticsType]
    );
  },
};

module.exports = AnalyticsCacheModel;
