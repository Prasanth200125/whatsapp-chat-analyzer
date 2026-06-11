# 🔄 Flow — End-to-End Feature Flows

> **Project:** WhatsApp Chat Analyzer Bot  
> **Version:** v1.0  
> **Last Updated:** 2026-06-10

---

## 1. Application Startup Flow

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant Frontend as React App
    participant Backend as Express Server
    participant DB as PostgreSQL

    User->>Browser: Open app URL
    Browser->>Frontend: Load React SPA
    Frontend->>Backend: GET /api/health
    Backend->>DB: Check connection
    DB-->>Backend: OK
    Backend-->>Frontend: { status: "healthy" }
    Frontend-->>User: Display landing page with upload prompt
```

---

## 2. File Upload & Parsing Flow

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Backend
    participant Parser as WhatsApp Parser
    participant DB as PostgreSQL

    User->>Frontend: Select/drag .txt file
    Frontend->>Frontend: Client-side validation (file type, size ≤ 50MB)
    
    alt Invalid file
        Frontend-->>User: Show error (wrong type / too large)
    end
    
    Frontend->>Backend: POST /api/upload (multipart/form-data)
    Backend->>Backend: Save to temp directory
    Backend->>Parser: Parse .txt file
    
    Parser->>Parser: Detect format (12h/24h, date format)
    Parser->>Parser: Extract messages (timestamp, sender, content)
    Parser->>Parser: Identify media indicators ("<Media omitted>")
    Parser->>Parser: Build structured data array
    
    Parser-->>Backend: Parsed message array
    Backend->>DB: Store parsed messages + create session
    Backend->>Backend: Delete temp .txt file
    Backend-->>Frontend: { sessionId, stats: { totalMessages, participants, dateRange } }
    Frontend-->>User: Show session created + basic stats + chat interface
```

### WhatsApp .txt Format Detection

```
Format A (12h): "1/15/23, 9:45 PM - John: Hello"
Format B (24h): "15/01/2023, 21:45 - John: Hello"
Format C (US):  "01/15/2023, 9:45 PM - John: Hello"
Format D (BR):  "[15/01/2023 21:45:30] John: Hello"

Parser detects format via regex matching on first 10 lines.
```

---

## 3. Authentication Flow (JWT)

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Backend
    participant DB as PostgreSQL

    Note over User,DB: Registration
    User->>Frontend: Fill register form (username, email, password)
    Frontend->>Backend: POST /api/auth/register
    Backend->>Backend: Validate input
    Backend->>Backend: Hash password (bcryptjs)
    Backend->>DB: INSERT INTO users
    Backend-->>Frontend: { message: "Registered successfully" }
    Frontend-->>User: Redirect to login

    Note over User,DB: Login
    User->>Frontend: Enter email + password
    Frontend->>Backend: POST /api/auth/login
    Backend->>DB: SELECT user by email
    Backend->>Backend: Compare password hash
    alt Invalid credentials
        Backend-->>Frontend: 401 Unauthorized
        Frontend-->>User: Show error
    end
    Backend->>Backend: Generate JWT (24h expiry)
    Backend-->>Frontend: { token, user: { id, username, email } }
    Frontend->>Frontend: Store token in localStorage
    Frontend-->>User: Redirect to dashboard

    Note over User,DB: Authenticated Requests
    User->>Frontend: Any action (upload, ask, etc.)
    Frontend->>Backend: Request + Authorization: Bearer <token>
    Backend->>Backend: Verify JWT signature & expiry
    alt Token invalid/expired
        Backend-->>Frontend: 401 Unauthorized
        Frontend-->>User: Redirect to login
    end
    Backend->>Backend: Proceed with request
```

## 4. Chat Q&A Flow (Hybrid Query Processing)

```mermaid
flowchart TD
    A[User types a question] --> B[Frontend sends to Backend]
    B --> C{Query Classifier}
    
    C -->|Rule-Based Query| D[Analytics Engine]
    C -->|AI Query| E[Gemini AI Module]
    C -->|Ambiguous| F[Try rule-based first, fallback to AI]
    
    D --> D1[Query PostgreSQL for computed stats]
    D1 --> D2[Format response with data]
    D2 --> G[Return to Frontend]
    
    E --> E1[Build context from parsed messages]
    E1 --> E2[Send prompt + context to Gemini API]
    E2 --> E3[Parse Gemini response]
    E3 --> G
    
    F --> D
    D -->|Insufficient answer| E
    
    G --> H[Display in chat UI with appropriate format]
    H --> I{Response type?}
    I -->|Text| J[Render as chat bubble]
    I -->|Table data| L[Render as formatted table]
    I -->|Raw data| N[Render as structured text output]
```

> **Note:** Chart rendering (bar, line, pie, word cloud) moves to Phase 2. Phase 1 returns all analytics as text and tables.

### Query Classification Rules

| Pattern / Keywords                           | Type        | Handler             |
|----------------------------------------------|-------------|----------------------|
| "how many messages", "message count"         | Rule-based  | Analytics Engine     |
| "most used word", "word frequency"           | Rule-based  | Analytics Engine     |
| "most active", "who sent the most"           | Rule-based  | Analytics Engine     |
| "how many photos/videos/files"               | Rule-based  | Analytics Engine     |
| "messages per day/week/month"                | Rule-based  | Analytics Engine     |
| "summarize", "summary"                       | AI          | Gemini Module        |
| "what is the mood", "sentiment"              | AI          | Gemini + Analytics   |
| "find anything related to"                   | AI          | Gemini Module        |
| "what happened between [date] and [date]"    | AI          | Gemini Module        |
| Everything else                              | AI          | Gemini Module        |

---

## 5. Session Management Flow

```mermaid
flowchart TD
    A[User lands on app] --> B{Has existing sessions?}
    
    B -->|No| C[Show upload prompt]
    B -->|Yes| D[Show sidebar with past sessions]
    
    C --> E[User uploads file]
    E --> F[Create new session]
    F --> G[Session active — chat interface]
    
    D --> H{User action?}
    H -->|Click existing session| I[Load session from DB]
    I --> G
    H -->|Click 'New Chat'| C
    H -->|Click 'Delete'| J[Delete session + all data from DB]
    J --> B
    
    G --> K[User chats with bot]
    K --> L[Conversation stored in DB]
    L --> K
```

---

## 6. Analytics Feature Flows

### 5.1 Word Frequency Analysis

```mermaid
flowchart LR
    A[User asks: 'Most used words'] --> B[Analytics Engine]
    B --> C[Query messages from DB]
    C --> D[Tokenize all message text]
    D --> E[Remove stop words]
    E --> F[Count frequency]
    F --> G[Sort descending]
    G --> H[Return top N words + counts]
    H --> I[Frontend renders as text table]
```

### 5.2 Per-Person Message Count

```mermaid
flowchart LR
    A[User asks: 'Who is most active?'] --> B[Analytics Engine]
    B --> C[GROUP BY sender, COUNT messages]
    C --> D[Calculate percentages]
    D --> E[Return ranked list]
    E --> F[Frontend renders ranked list + table]
```

### 5.3 Activity Timeline

```mermaid
flowchart LR
    A[User asks: 'Activity over time'] --> B[Analytics Engine]
    B --> C[GROUP BY date/week/month]
    C --> D[Count messages per period]
    D --> E[Return time series data]
    E --> F[Frontend renders text table]
```

### 5.4 Media Statistics

```mermaid
flowchart LR
    A[User asks: 'How many videos sent?'] --> B[Analytics Engine]
    B --> C[Filter messages with media indicators]
    C --> D[Categorize: image/video/audio/document]
    D --> E[Count per category + per person]
    E --> F[Frontend renders stats table]
```

### 5.5 Sentiment Analysis

```mermaid
flowchart LR
    A[User asks: 'What's the mood?'] --> B[Hybrid Handler]
    B --> C[Analytics Engine: Basic sentiment scoring]
    C --> D[Gemini AI: Contextual sentiment analysis]
    D --> E[Merge results]
    E --> F[Frontend renders sentiment text + table]
```

### 5.6 Date-Range Summary

```mermaid
flowchart LR
    A[User asks: 'Summarize Jan to March'] --> B[AI Module]
    B --> C[Query messages in date range from DB]
    C --> D[Chunk messages if too many]
    D --> E[Send chunks to Gemini with summary prompt]
    E --> F[Merge chunk summaries]
    F --> G[Frontend renders summary text]
```

### 5.7 Keyword Search

```mermaid
flowchart LR
    A[User asks: 'Find vacation plans'] --> B[AI Module]
    B --> C[Full-text search in DB]
    C --> D[Send matches to Gemini for context]
    D --> E[Gemini returns relevant findings]
    E --> F[Frontend renders results with highlighted matches]
```

### 5.8 Export Results

```mermaid
flowchart LR
    A[User clicks Export] --> B{Format?}
    B -->|PDF| C[Generate PDF with charts + data]
    B -->|CSV| D[Generate CSV with raw data]
    C --> E[Download triggered in browser]
    D --> E
```

---

## 7. Data Deletion Flow

```mermaid
flowchart TD
    A{Trigger} --> B[User deletes session]
    A --> C[Session expires / inactivity timeout]
    A --> D[User clicks 'Delete All Data']
    
    B --> E[Delete from PostgreSQL: messages, conversations, session]
    C --> E
    D --> E
    
    E --> F[Verify deletion complete]
    F --> G[Confirm to user]
```

---

## 8. Error Handling Flow

```mermaid
flowchart TD
    A[Error Occurs] --> B{Error Type}
    
    B -->|File Parse Error| C[Show: 'Could not parse file. Ensure it is a valid WhatsApp export.']
    B -->|File Too Large| D[Show: 'File exceeds 50MB limit.']
    B -->|Gemini API Error| E[Show: 'AI service temporarily unavailable. Try again.']
    B -->|Gemini Rate Limit| F[Show: 'Too many requests. Please wait a moment.']
    B -->|DB Error| G[Show: 'Internal error. Please refresh.']
    B -->|Network Error| H[Show: 'Connection lost. Check your internet.']
    
    C --> I[Log error details to server console]
    D --> I
    E --> I
    F --> I
    G --> I
    H --> I
```

---

## 9. API Endpoint Map

| Method | Endpoint                          | Auth     | Purpose                              |
|--------|-----------------------------------|----------|--------------------------------------|
| GET    | `/api/health`                     | No       | Health check                         |
| POST   | `/api/auth/register`              | No       | Register new user                    |
| POST   | `/api/auth/login`                 | No       | Login, get JWT token                 |
| GET    | `/api/auth/me`                    | Yes      | Get current user profile             |
| POST   | `/api/upload`                     | Yes      | Upload WhatsApp .txt file            |
| GET    | `/api/sessions`                   | Yes      | List user's sessions                 |
| GET    | `/api/sessions/:id`               | Yes      | Get session details                  |
| DELETE | `/api/sessions/:id`               | Yes      | Delete session + all data            |
| POST   | `/api/sessions/:id/ask`           | Yes      | Ask a question about the chat        |
| GET    | `/api/sessions/:id/history`       | Yes      | Get conversation history             |
| GET    | `/api/sessions/:id/analytics/:type` | Yes    | Get specific analytics data          |
| GET    | `/api/sessions/:id/export/:format` | Yes     | Export results (pdf/csv)             |

---

> **Next Step:** Review flows. Then we proceed to `Database.md`.
