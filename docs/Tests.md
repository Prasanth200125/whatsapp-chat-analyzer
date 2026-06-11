# 🧪 Tests — Feature Testing Plan

> **Project:** WhatsApp Chat Analyzer Bot  
> **Version:** v1.0  
> **Last Updated:** 2026-06-10

---

## Test Strategy

Each feature undergoes **3 levels of testing** before being marked complete:

| Level        | Type                  | Description                                      |
|--------------|-----------------------|--------------------------------------------------|
| **L1**       | Unit Tests            | Individual functions / modules in isolation       |
| **L2**       | Integration Tests     | API endpoints with real database                  |
| **L3**       | End-to-End (E2E)      | Full user flow through the UI                     |

**Test Framework:** Jest (backend) + React Testing Library (frontend)

---

## Feature Test Plans

---

### F1: WhatsApp File Upload & Parsing

**Status:** ⬜ Not Started

#### L1 — Unit Tests

| ID    | Test Case                                            | Expected Result                          | Status |
|-------|------------------------------------------------------|------------------------------------------|--------|
| F1-U1 | Parse 12h format: `"1/15/23, 9:45 PM - John: Hi"`   | Correct timestamp, sender, content       | ⬜     |
| F1-U2 | Parse 24h format: `"15/01/2023, 21:45 - John: Hi"`   | Correct timestamp, sender, content       | ⬜     |
| F1-U3 | Parse multi-line message (message spans 2+ lines)     | Content includes all lines               | ⬜     |
| F1-U4 | Parse system message: `"John created this group"`     | message_type = 'system'                  | ⬜     |
| F1-U5 | Detect media: `"<Media omitted>"`                     | message_type = 'media_image' (or correct type) | ⬜     |
| F1-U6 | Detect chat type (private vs group)                   | Correct chat_type based on participant count | ⬜     |
| F1-U7 | Handle empty file                                     | Return error: "No messages found"        | ⬜     |
| F1-U8 | Handle non-WhatsApp text file                         | Return error: "Invalid format"           | ⬜     |
| F1-U9 | Parse file with 10,000+ messages                      | All messages parsed, no timeout          | ⬜     |

#### L2 — Integration Tests

| ID    | Test Case                                            | Expected Result                          | Status |
|-------|------------------------------------------------------|------------------------------------------|--------|
| F1-I1 | POST /api/upload with valid .txt file                 | 200, sessionId returned, messages in DB  | ⬜     |
| F1-I2 | POST /api/upload with .pdf file                       | 400, error: invalid file type            | ⬜     |
| F1-I3 | POST /api/upload with file > 50MB                     | 400, error: file too large               | ⬜     |
| F1-I4 | POST /api/upload with empty file                      | 400, error: no messages found            | ⬜     |
| F1-I5 | Verify temp file deleted after parsing                | File not in uploads/ directory           | ⬜     |

#### L3 — E2E Tests

| ID    | Test Case                                            | Expected Result                          | Status |
|-------|------------------------------------------------------|------------------------------------------|--------|
| F1-E1 | Drag and drop .txt file onto upload zone              | File uploads, session created, chat opens | ⬜     |
| F1-E2 | Click "Browse" and select file                        | Same as above                            | ⬜     |
| F1-E3 | Upload invalid file type                              | Error message shown to user              | ⬜     |

---

### F2: Word Frequency Analysis

**Status:** ⬜ Not Started

#### L1 — Unit Tests

| ID    | Test Case                                            | Expected Result                          | Status |
|-------|------------------------------------------------------|------------------------------------------|--------|
| F2-U1 | Count words in 5 messages                             | Correct frequency map                    | ⬜     |
| F2-U2 | Stop words excluded from results                      | "the", "is", "a" not in top results      | ⬜     |
| F2-U3 | Case insensitive counting                             | "Hello" and "hello" counted together     | ⬜     |
| F2-U4 | Handle messages with only emojis                      | Emojis counted or gracefully excluded    | ⬜     |
| F2-U5 | Handle empty messages                                 | Skipped without error                    | ⬜     |

#### L2 — Integration Tests

| ID    | Test Case                                            | Expected Result                          | Status |
|-------|------------------------------------------------------|------------------------------------------|--------|
| F2-I1 | GET /api/sessions/:id/analytics/word_freq             | 200, returns sorted word-frequency array | ⬜     |
| F2-I2 | Request word freq for non-existent session            | 404, error returned                      | ⬜     |

#### L3 — E2E Tests

| ID    | Test Case                                            | Expected Result                          | Status |
|-------|------------------------------------------------------|------------------------------------------|--------|
| F2-E1 | Ask "What are the most used words?"                   | Text table with word frequencies in chat | ⬜     |

---

### F3: Message Count Per Person

**Status:** ⬜ Not Started

#### L1 — Unit Tests

| ID    | Test Case                                            | Expected Result                          | Status |
|-------|------------------------------------------------------|------------------------------------------|--------|
| F3-U1 | Count messages for 3 participants                     | Correct counts per person                | ⬜     |
| F3-U2 | Percentage calculation                                | Percentages sum to 100%                  | ⬜     |
| F3-U3 | Private chat (2 participants)                         | Both counted correctly                   | ⬜     |
| F3-U4 | System messages excluded from counts                  | System messages not attributed to anyone | ⬜     |

#### L2 — Integration Tests

| ID    | Test Case                                            | Expected Result                          | Status |
|-------|------------------------------------------------------|------------------------------------------|--------|
| F3-I1 | GET /api/sessions/:id/analytics/msg_count             | 200, sorted participant list with counts | ⬜     |

#### L3 — E2E Tests

| ID    | Test Case                                            | Expected Result                          | Status |
|-------|------------------------------------------------------|------------------------------------------|--------|
| F3-E1 | Ask "Who sent the most messages?"                     | Ranked list + table in chat              | ⬜     |

---

### F4: Activity Timeline

**Status:** ⬜ Not Started

| ID    | Test Case                                            | Expected Result                          | Status |
|-------|------------------------------------------------------|------------------------------------------|--------|
| F4-U1 | Group messages by day for a 30-day range              | 30 data points with correct counts       | ⬜     |
| F4-U2 | Group messages by month for a 1-year range            | 12 data points                           | ⬜     |
| F4-U3 | Handle days with zero messages                        | Data point with count = 0                | ⬜     |
| F4-I1 | GET /api/sessions/:id/analytics/timeline              | 200, time series data returned           | ⬜     |
| F4-E1 | Ask "Show me activity over time"                      | Text table displayed in chat             | ⬜     |

---

### F5: Media Statistics

**Status:** ⬜ Not Started

| ID    | Test Case                                            | Expected Result                          | Status |
|-------|------------------------------------------------------|------------------------------------------|--------|
| F5-U1 | Count media by type (image, video, audio, document)   | Correct counts per type                  | ⬜     |
| F5-U2 | Count media per person                                | Correct per-person media counts          | ⬜     |
| F5-U3 | Handle chat with no media                             | Return zero counts, no error             | ⬜     |
| F5-I1 | GET /api/sessions/:id/analytics/media_stats           | 200, media breakdown returned            | ⬜     |
| F5-E1 | Ask "How many videos were sent?"                      | Stats table in chat                      | ⬜     |

---

### F6: Sentiment Analysis

**Status:** ⬜ Not Started

| ID    | Test Case                                            | Expected Result                          | Status |
|-------|------------------------------------------------------|------------------------------------------|--------|
| F6-U1 | Positive message scores positive                      | sentiment_score > 0                      | ⬜     |
| F6-U2 | Negative message scores negative                      | sentiment_score < 0                      | ⬜     |
| F6-U3 | Neutral message scores near zero                      | sentiment_score ≈ 0                      | ⬜     |
| F6-U4 | Aggregate sentiment per person                        | Average score per participant            | ⬜     |
| F6-I1 | GET /api/sessions/:id/analytics/sentiment             | 200, sentiment data returned             | ⬜     |
| F6-E1 | Ask "What's the overall mood?"                        | Sentiment text + table in chat           | ⬜     |

---

### F7: Date-Range Summary

**Status:** ⬜ Not Started

| ID    | Test Case                                            | Expected Result                          | Status |
|-------|------------------------------------------------------|------------------------------------------|--------|
| F7-U1 | Extract messages between two valid dates              | Only messages in range returned          | ⬜     |
| F7-U2 | Invalid date range (end before start)                 | Error message returned                   | ⬜     |
| F7-U3 | Date range with no messages                           | "No messages found in this range"        | ⬜     |
| F7-I1 | POST /api/sessions/:id/ask with date-range summary    | 200, summary text from Gemini           | ⬜     |
| F7-E1 | Ask "Summarize chat from January to March"            | Text summary displayed in chat           | ⬜     |

---

### F8: Keyword Search

**Status:** ⬜ Not Started

| ID    | Test Case                                            | Expected Result                          | Status |
|-------|------------------------------------------------------|------------------------------------------|--------|
| F8-U1 | Search for existing keyword                           | Matching messages returned               | ⬜     |
| F8-U2 | Search for non-existing keyword                       | "No results found"                       | ⬜     |
| F8-U3 | Case-insensitive search                               | Results regardless of case               | ⬜     |
| F8-I1 | POST /api/sessions/:id/ask with keyword query         | 200, relevant results returned           | ⬜     |
| F8-E1 | Ask "Find anything about vacation"                    | Relevant messages + AI context in chat   | ⬜     |

---

### F9: Export Results (PDF/CSV)

**Status:** ⬜ Not Started

| ID    | Test Case                                            | Expected Result                          | Status |
|-------|------------------------------------------------------|------------------------------------------|--------|
| F9-U1 | Generate CSV from analytics data                      | Valid CSV with headers and data          | ⬜     |
| F9-U2 | Generate PDF from analytics data                      | Readable PDF with charts/tables          | ⬜     |
| F9-I1 | GET /api/sessions/:id/export/csv                      | 200, CSV file downloaded                 | ⬜     |
| F9-I2 | GET /api/sessions/:id/export/pdf                      | 200, PDF file downloaded                 | ⬜     |
| F9-E1 | Click "Export as CSV" button                           | CSV download triggered in browser        | ⬜     |
| F9-E2 | Click "Export as PDF" button                           | PDF download triggered in browser        | ⬜     |

---

### F10: AI Q&A (Gemini Integration)

**Status:** ⬜ Not Started

| ID     | Test Case                                            | Expected Result                          | Status |
|--------|------------------------------------------------------|------------------------------------------|--------|
| F10-U1 | Send simple question with chat context                | Gemini returns relevant answer           | ⬜     |
| F10-U2 | Handle Gemini API timeout                             | Graceful error, retry suggestion         | ⬜     |
| F10-U3 | Handle Gemini rate limit                              | User-friendly "try again later" message  | ⬜     |
| F10-U4 | Context chunking for large chats                      | Message split into chunks, all processed | ⬜     |
| F10-U5 | Query classifier routes correctly                     | Rule-based vs AI routing works           | ⬜     |
| F10-I1 | POST /api/sessions/:id/ask with AI question           | 200, AI-generated response               | ⬜     |
| F10-E1 | Ask open-ended question in chat                       | AI response appears as chat bubble       | ⬜     |

---

### F11: Session Management

**Status:** ⬜ Not Started

| ID     | Test Case                                            | Expected Result                          | Status |
|--------|------------------------------------------------------|------------------------------------------|--------|
| F11-U1 | Create new session                                    | Session record in DB with UUID           | ⬜     |
| F11-U2 | Delete session cascades to all related data           | Messages, conversations, cache deleted   | ⬜     |
| F11-I1 | GET /api/sessions                                     | 200, list of all sessions                | ⬜     |
| F11-I2 | DELETE /api/sessions/:id                              | 200, session + all data removed          | ⬜     |
| F11-E1 | Click session in sidebar                              | Session loads with chat history           | ⬜     |
| F11-E2 | Click "New Chat" button                               | Upload prompt appears                    | ⬜     |
| F11-E3 | Click "Delete" on a session                           | Session removed from sidebar             | ⬜     |

---

### F12: Multiple Chat Sessions (Sidebar)

**Status:** ⬜ Not Started

| ID     | Test Case                                            | Expected Result                          | Status |
|--------|------------------------------------------------------|------------------------------------------|--------|
| F12-U1 | List conversations for a session                      | All conversations returned               | ⬜     |
| F12-I1 | GET /api/sessions/:id/history                         | 200, conversation list with messages     | ⬜     |
| F12-E1 | Switch between conversations in sidebar               | Chat window updates to selected convo    | ⬜     |
| F12-E2 | Start new conversation within same session            | New conversation appears in sidebar      | ⬜     |

---

### F13: JWT Authentication

**Status:** ⬜ Not Started

#### L1 — Unit Tests

| ID     | Test Case                                            | Expected Result                          | Status |
|--------|------------------------------------------------------|------------------------------------------|--------|
| F13-U1 | Hash password with bcrypt                             | Hash is valid, different from plaintext   | ⬜     |
| F13-U2 | Compare correct password with hash                    | Returns true                             | ⬜     |
| F13-U3 | Compare wrong password with hash                      | Returns false                            | ⬜     |
| F13-U4 | Generate JWT with user payload                        | Valid token string returned               | ⬜     |
| F13-U5 | Verify valid JWT                                      | Returns decoded payload                  | ⬜     |
| F13-U6 | Verify expired JWT                                    | Throws TokenExpiredError                 | ⬜     |
| F13-U7 | Verify tampered JWT                                   | Throws JsonWebTokenError                 | ⬜     |

#### L2 — Integration Tests

| ID     | Test Case                                            | Expected Result                          | Status |
|--------|------------------------------------------------------|------------------------------------------|--------|
| F13-I1 | POST /api/auth/register with valid data               | 201, user created                        | ⬜     |
| F13-I2 | POST /api/auth/register with duplicate email          | 409, error: email already exists         | ⬜     |
| F13-I3 | POST /api/auth/register with invalid email            | 400, validation error                    | ⬜     |
| F13-I4 | POST /api/auth/register with short password           | 400, validation error                    | ⬜     |
| F13-I5 | POST /api/auth/login with valid credentials           | 200, JWT token returned                  | ⬜     |
| F13-I6 | POST /api/auth/login with wrong password              | 401, invalid credentials                 | ⬜     |
| F13-I7 | POST /api/auth/login with non-existent email          | 401, invalid credentials                 | ⬜     |
| F13-I8 | GET /api/auth/me with valid token                     | 200, user profile returned               | ⬜     |
| F13-I9 | GET /api/auth/me without token                        | 401, unauthorized                        | ⬜     |
| F13-I10| GET /api/sessions without token                       | 401, unauthorized                        | ⬜     |
| F13-I11| GET /api/sessions with valid token                    | 200, user's sessions returned            | ⬜     |

#### L3 — E2E Tests

| ID     | Test Case                                            | Expected Result                          | Status |
|--------|------------------------------------------------------|------------------------------------------|--------|
| F13-E1 | Register new account via form                         | Account created, redirect to login       | ⬜     |
| F13-E2 | Login with valid credentials                          | Dashboard loads, token stored            | ⬜     |
| F13-E3 | Login with invalid credentials                        | Error message shown                      | ⬜     |
| F13-E4 | Access dashboard without login                        | Redirect to login page                   | ⬜     |
| F13-E5 | Token expires → auto redirect to login                | Login page shown with expiry message     | ⬜     |

---

## Test Execution Summary

| Feature                     | Unit | Integration | E2E  | Overall |
|-----------------------------|------|-------------|------|---------|
| F1: Upload & Parsing        | ⬜   | ⬜          | ⬜   | ⬜      |
| F2: Word Frequency          | ⬜   | ⬜          | ⬜   | ⬜      |
| F3: Message Count           | ⬜   | ⬜          | ⬜   | ⬜      |
| F4: Activity Timeline       | ⬜   | ⬜          | ⬜   | ⬜      |
| F5: Media Statistics        | ⬜   | ⬜          | ⬜   | ⬜      |
| F6: Sentiment Analysis      | ⬜   | ⬜          | ⬜   | ⬜      |
| F7: Date-Range Summary      | ⬜   | ⬜          | ⬜   | ⬜      |
| F8: Keyword Search          | ⬜   | ⬜          | ⬜   | ⬜      |
| F9: Export (PDF/CSV)         | ⬜   | ⬜          | ⬜   | ⬜      |
| F10: AI Q&A                 | ⬜   | ⬜          | ⬜   | ⬜      |
| F11: Session Management     | ⬜   | ⬜          | ⬜   | ⬜      |
| F12: Multiple Conversations | ⬜   | ⬜          | ⬜   | ⬜      |
| F13: JWT Authentication     | ⬜   | ⬜          | ⬜   | ⬜      |

**Legend:** ⬜ Not Started · 🟡 In Progress · ✅ Passed · ❌ Failed

---

> **Tests will be executed after each feature is built. Results will be updated here.**
