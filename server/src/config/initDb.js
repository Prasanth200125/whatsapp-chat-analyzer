/**
 * Database initialization script
 * Run with: npm run db:init
 * 
 * Creates all tables, indexes, and extensions required by the application.
 */
const { pool, query } = require('./database');

const initDatabase = async () => {
  console.log('🚀 Initializing database...\n');

  try {
    // Enable pgcrypto extension for UUID generation
    await query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    console.log('✅ pgcrypto extension enabled');

    // ──────────────────────────────────────────────
    // Users table (JWT authentication)
    // ──────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    console.log('✅ users table created');

    // ──────────────────────────────────────────────
    // Sessions table (uploaded chat analysis sessions)
    // ──────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        chat_type VARCHAR(10) NOT NULL DEFAULT 'private' CHECK(chat_type IN ('private', 'group')),
        total_messages INTEGER DEFAULT 0,
        total_participants INTEGER DEFAULT 0,
        date_range_start TIMESTAMP,
        date_range_end TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP
      )
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)');
    console.log('✅ sessions table created');

    // ──────────────────────────────────────────────
    // Messages table (parsed WhatsApp messages)
    // ──────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        timestamp TIMESTAMP NOT NULL,
        sender VARCHAR(255) NOT NULL,
        content TEXT,
        message_type VARCHAR(20) NOT NULL DEFAULT 'text' 
          CHECK(message_type IN ('text', 'media_image', 'media_video', 'media_audio', 'media_document', 'system')),
        word_count INTEGER DEFAULT 0,
        sentiment_score REAL,
        date_only DATE,
        hour_only SMALLINT CHECK(hour_only >= 0 AND hour_only <= 23)
      )
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(session_id, sender)');
    await query('CREATE INDEX IF NOT EXISTS idx_messages_date ON messages(session_id, date_only)');
    await query('CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(session_id, message_type)');
    await query('CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(session_id, timestamp)');
    console.log('✅ messages table created');

    // Full-text search index (created separately since GIN indexes need special handling)
    try {
      await query(`
        CREATE INDEX IF NOT EXISTS idx_messages_content_search 
        ON messages USING GIN(to_tsvector('english', COALESCE(content, '')))
      `);
      console.log('✅ Full-text search index created');
    } catch (err) {
      console.warn('⚠️  Full-text search index may already exist or failed:', err.message);
    }

    // ──────────────────────────────────────────────
    // Conversations table (user chat sessions with the bot)
    // ──────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        title VARCHAR(255) DEFAULT 'New Conversation',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id)');
    console.log('✅ conversations table created');

    // ──────────────────────────────────────────────
    // Conversation Messages table
    // ──────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS conversation_messages (
        id SERIAL PRIMARY KEY,
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(10) NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        response_type VARCHAR(10) DEFAULT 'text' CHECK(response_type IN ('text', 'table', 'data')),
        response_data JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_conv_messages_conversation ON conversation_messages(conversation_id)');
    console.log('✅ conversation_messages table created');

    // ──────────────────────────────────────────────
    // Analytics Cache table
    // ──────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS analytics_cache (
        id SERIAL PRIMARY KEY,
        session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        analytics_type VARCHAR(20) NOT NULL 
          CHECK(analytics_type IN ('word_freq', 'msg_count', 'timeline', 'media_stats', 'sentiment')),
        result_data JSONB NOT NULL,
        computed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(session_id, analytics_type)
      )
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_cache(session_id)');
    console.log('✅ analytics_cache table created');

    console.log('\n🎉 Database initialization complete!');
  } catch (err) {
    console.error('\n❌ Database initialization failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// Run if called directly (npm run db:init)
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };
