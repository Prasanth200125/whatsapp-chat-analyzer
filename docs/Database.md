# 💾 Database & Folder Schema

> **Project:** WhatsApp Chat Analyzer Bot  
> **Version:** v1.0  
> **Last Updated:** 2026-06-10  
> **Database:** PostgreSQL (via `pg` / node-postgres)

---

## 1. Database Schema

### 1.1 Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ SESSIONS : owns
    SESSIONS ||--o{ MESSAGES : contains
    SESSIONS ||--o{ CONVERSATIONS : has
    CONVERSATIONS ||--o{ CONVERSATION_MESSAGES : contains
    SESSIONS ||--o{ ANALYTICS_CACHE : caches

    USERS {
        UUID id PK "UUID (gen_random_uuid)"
        VARCHAR username "Unique display name"
        VARCHAR email "Unique email"
        VARCHAR password_hash "bcrypt hashed password"
        TIMESTAMP created_at "Auto-set"
        TIMESTAMP updated_at "Auto-set"
    }

    SESSIONS {
        UUID id PK "UUID (gen_random_uuid)"
        UUID user_id FK "References USERS.id"
        VARCHAR file_name "Original upload filename"
        VARCHAR chat_type "private | group"
        INTEGER total_messages "Count of parsed messages"
        INTEGER total_participants "Count of unique senders"
        TIMESTAMP date_range_start "Earliest message date"
        TIMESTAMP date_range_end "Latest message date"
        TIMESTAMP created_at "Auto-set"
        TIMESTAMP updated_at "Auto-set"
        TIMESTAMP expires_at "Auto-delete timestamp"
    }

    MESSAGES {
        SERIAL id PK "Auto-increment"
        UUID session_id FK "References SESSIONS.id"
        TIMESTAMP timestamp "Original message timestamp"
        VARCHAR sender "Sender name"
        TEXT content "Message text content"
        VARCHAR message_type "text | media_image | media_video | media_audio | media_document | system"
        INTEGER word_count "Pre-computed word count"
        REAL sentiment_score "Pre-computed sentiment (-1 to 1)"
        DATE date_only "For easy date grouping"
        SMALLINT hour_only "0-23 for hourly analysis"
    }

    CONVERSATIONS {
        UUID id PK "UUID (gen_random_uuid)"
        UUID session_id FK "References SESSIONS.id"
        VARCHAR title "Auto-generated or user-set title"
        TIMESTAMP created_at "Auto-set"
        TIMESTAMP updated_at "Auto-set"
    }

    CONVERSATION_MESSAGES {
        SERIAL id PK "Auto-increment"
        UUID conversation_id FK "References CONVERSATIONS.id"
        VARCHAR role "user | assistant"
        TEXT content "Message content"
        VARCHAR response_type "text | table | data"
        JSONB response_data "Structured data for tables/analytics"
        TIMESTAMP created_at "Auto-set"
    }

    ANALYTICS_CACHE {
        SERIAL id PK "Auto-increment"
        UUID session_id FK "References SESSIONS.id"
        VARCHAR analytics_type "word_freq | msg_count | timeline | media_stats | sentiment"
        JSONB result_data "Cached result (native JSONB)"
        TIMESTAMP computed_at "Auto-set"
    }
```

### 1.2 Table Details

#### `users` — Authenticated users (JWT)

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_username ON users(username);
```

#### `sessions` — Uploaded chat analysis sessions

```sql
CREATE TABLE sessions (
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
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
```

#### `messages` — Parsed WhatsApp messages

```sql
CREATE TABLE messages (
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
);

-- Indexes for common query patterns
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_messages_sender ON messages(session_id, sender);
CREATE INDEX idx_messages_date ON messages(session_id, date_only);
CREATE INDEX idx_messages_type ON messages(session_id, message_type);
CREATE INDEX idx_messages_timestamp ON messages(session_id, timestamp);

-- Full-text search index for keyword queries
CREATE INDEX idx_messages_content_search ON messages USING GIN(to_tsvector('english', content));
```

#### `conversations` — User chat sessions with the bot

```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT 'New Conversation',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_session ON conversations(session_id);
```

#### `conversation_messages` — Individual messages in bot conversations

```sql
CREATE TABLE conversation_messages (
    id SERIAL PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    response_type VARCHAR(10) DEFAULT 'text' CHECK(response_type IN ('text', 'table', 'data')),
    response_data JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conv_messages_conversation ON conversation_messages(conversation_id);
```

#### `analytics_cache` — Cached analytics results

```sql
CREATE TABLE analytics_cache (
    id SERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    analytics_type VARCHAR(20) NOT NULL 
        CHECK(analytics_type IN ('word_freq', 'msg_count', 'timeline', 'media_stats', 'sentiment')),
    result_data JSONB NOT NULL,
    computed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, analytics_type)
);

CREATE INDEX idx_analytics_session ON analytics_cache(session_id);
```

---

## 2. Folder / Project Structure

```
e:\Bot\
├── docs/                          # 📚 Project documentation
│   ├── Plan.md                    #   Project plan & requirements
│   ├── Flow.md                    #   Feature flows & flowcharts
│   ├── Database.md                #   Database & folder schema (this file)
│   ├── Traceability.md            #   Session update logs
│   ├── Tests.md                   #   Test plans & results
│   └── Todo.md                    #   Project-wide TODO list
│
├── server/                        # ⚙️ Backend (Express.js)
│   ├── package.json
│   ├── .env                       #   Environment variables (API keys, DB)
│   ├── .env.example               #   Template for .env
│   ├── src/
│   │   ├── index.js               #   Entry point — server startup
│   │   ├── config/
│   │   │   └── database.js        #   PostgreSQL connection pool & init
│   │   ├── routes/
│   │   │   ├── auth.js             #   POST /api/auth/register, login, me
│   │   │   ├── upload.js           #   POST /api/upload
│   │   │   ├── sessions.js         #   /api/sessions CRUD
│   │   │   ├── chat.js             #   POST /api/sessions/:id/ask
│   │   │   ├── analytics.js        #   GET /api/sessions/:id/analytics
│   │   │   └── export.js           #   GET /api/sessions/:id/export
│   │   ├── services/
│   │   │   ├── parser.js           #   WhatsApp .txt parser
│   │   │   ├── analytics.js        #   Rule-based analytics engine
│   │   │   ├── gemini.js           #   Google Gemini API integration
│   │   │   ├── classifier.js       #   Query type classifier
│   │   │   ├── sentiment.js        #   Sentiment analysis helper
│   │   │   └── exporter.js         #   PDF/CSV export generator
│   │   ├── middleware/
│   │   │   ├── auth.js             #   JWT verification middleware
│   │   │   ├── errorHandler.js     #   Global error handler
│   │   │   └── upload.js           #   Multer file upload config
│   │   ├── models/
│   │   │   ├── user.js             #   User DB operations (register, find)
│   │   │   ├── session.js          #   Session DB operations
│   │   │   ├── message.js          #   Message DB operations
│   │   │   ├── conversation.js     #   Conversation DB operations
│   │   │   └── analyticsCache.js   #   Analytics cache DB operations
│   │   └── utils/
│   │       ├── uuid.js             #   UUID generation helper
│   │       ├── dateUtils.js        #   Date parsing & formatting
│   │       └── stopWords.js        #   Stop words list for word freq
│   └── uploads/                    #   Temp directory for file uploads (auto-cleaned)
│
├── client/                        # 🖥️ Frontend (React + Vite)
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── main.jsx               #   React entry point
│   │   ├── App.jsx                #   Root component with routing
│   │   ├── index.css              #   Global styles & design tokens
│   │   ├── api/
│   │   │   └── client.js          #   API client (fetch wrapper + JWT header)
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   │   ├── LoginForm.jsx       #   Login form
│   │   │   │   ├── RegisterForm.jsx    #   Registration form
│   │   │   │   └── Auth.css
│   │   │   ├── ChatWindow/
│   │   │   │   ├── ChatWindow.jsx      #   Main chat area
│   │   │   │   ├── ChatWindow.css
│   │   │   │   ├── MessageBubble.jsx   #   Individual message display
│   │   │   │   └── MessageInput.jsx    #   Text input + send button
│   │   │   ├── Sidebar/
│   │   │   │   ├── Sidebar.jsx         #   Session list sidebar
│   │   │   │   └── Sidebar.css
│   │   │   ├── Upload/
│   │   │   │   ├── UploadZone.jsx      #   Drag & drop file upload
│   │   │   │   └── UploadZone.css
│   │   │   ├── Export/
│   │   │   │   └── ExportButton.jsx    #   PDF/CSV export trigger
│   │   │   └── common/
│   │   │       ├── Loading.jsx         #   Loading spinner
│   │   │       ├── ErrorMessage.jsx    #   Error display
│   │   │       ├── DataTable.jsx       #   Table display component
│   │   │       └── common.css
│   │   ├── hooks/
│   │   │   ├── useAuth.js             #   Auth state & token management
│   │   │   ├── useSession.js          #   Session state management
│   │   │   ├── useChat.js             #   Chat interaction hook
│   │   │   └── useAnalytics.js        #   Analytics data hook
│   │   ├── context/
│   │   │   ├── AuthContext.jsx        #   Auth state (token, user)
│   │   │   └── AppContext.jsx         #   Global app state
│   │   └── utils/
│   │       ├── formatters.js          #   Data formatting helpers
│   │       └── constants.js           #   App-wide constants
│   └── dist/                          #   Production build output
│
├── .gitignore
├── README.md
└── package.json                       #   Root package.json (workspace scripts)
```

> **Note:** Analytics chart components (`WordCloud.jsx`, `BarChart.jsx`, `LineChart.jsx`, `PieChart.jsx`) move to Phase 2. Phase 1 uses `DataTable.jsx` for all analytics output.

---

## 3. Data Flow Through Storage

```mermaid
flowchart LR
    subgraph Input
        A[WhatsApp .txt file]
    end

    subgraph "Temp Storage"
        B[server/uploads/]
    end

    subgraph "Permanent Storage (PostgreSQL)"
        U[users table]
        C[sessions table]
        D[messages table]
        E[conversations table]
        F[conversation_messages table]
        G[analytics_cache table]
    end

    A -->|Upload| B
    U -->|User owns| C
    B -->|Parse & insert| C
    B -->|Parse & insert| D
    B -->|Delete after parse| B
    D -->|User asks question| E
    E -->|Bot responds| F
    D -->|Compute analytics| G
```

---

## 4. Environment Variables

```env
# server/.env

# Server
PORT=3001
NODE_ENV=development

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# PostgreSQL
DATABASE_URL=postgresql://username:password@localhost:5432/whatsapp_analyzer
DB_HOST=localhost
DB_PORT=5432
DB_NAME=whatsapp_analyzer
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRES_IN=24h

# Upload
MAX_FILE_SIZE_MB=50
UPLOAD_DIR=./uploads

# Session
SESSION_EXPIRY_HOURS=24
```

---

## 5. Key Design Decisions

| Decision                              | Rationale                                                    |
|---------------------------------------|--------------------------------------------------------------|
| **PostgreSQL over SQLite**            | Proper data types, connection pooling, scales without DB migration |
| **Native UUID via pgcrypto**          | Generated server-side, URL-safe, no sequential exposure      |
| **JSONB for analytics cache**         | Native JSON querying, indexable, no parse overhead vs TEXT    |
| **JSONB for response_data**           | Flexible structured data for tables/analytics in chat responses |
| **Full-text search index (GIN)**      | PostgreSQL native `to_tsvector` for fast keyword search      |
| **DATE and SMALLINT columns**         | Proper types for `date_only` and `hour_only` — faster GROUP BY |
| Pre-compute `word_count` in messages  | Avoids recalculating on every query                          |
| Pre-compute `sentiment_score`         | Sentiment per message computed at parse time                 |
| `ON DELETE CASCADE` on all FKs        | Single session delete cleans up everything                   |
| **bcrypt for passwords**              | Industry-standard password hashing, resistant to brute force |
| **JWT with 24h expiry**               | Stateless auth, no server-side session storage needed        |
| `response_type`: text/table/data      | Phase 1 uses text & tables; Phase 2 adds 'chart' type       |

---

## 6. Database Setup Script

```sql
-- Run once to create the database
CREATE DATABASE whatsapp_analyzer;

-- Connect to whatsapp_analyzer, then run:
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Then run all CREATE TABLE statements from Section 1.2 above
```

---

> **Next Step:** Review database schema. Then proceed to implementation.
