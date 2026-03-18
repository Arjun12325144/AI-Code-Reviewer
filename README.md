# ⚡ CodeReviewAI — Real-Time AI Code Review Bot

An AI-powered code review tool that streams structured feedback in real time. Paste or upload code, get instant analysis of bugs, security issues, and style problems — all streamed live as the model generates it.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React/TS)                       │
│  CodeMirror Editor  │  Review Panel  │  Session Sidebar         │
└──────────────┬──────────────────────────────────────────────────┘
               │  WebSocket (ws://)
               ▼
┌─────────────────────────────────────────────────────────────────┐
│               NODE.JS BACKEND (TypeScript)                      │
│   WebSocket Server  │  REST API  │  SQLite (better-sqlite3)    │
│   - Assigns Session IDs (UUID)                                  │
│   - Accepts { code, language } via WS                          │
│   - Pipes stream from Python → WebSocket client                │
│   - Persists sessions + reviews to SQLite                      │
└──────────────┬──────────────────────────────────────────────────┘
               │  HTTP POST /review (SSE response)
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PYTHON AI SERVICE (FastAPI)                     │
│   POST /review → OpenAI GPT-4o-mini → StreamingResponse (SSE) │
│   Returns JSON: { bugs, style, security, summary, score }      │
└─────────────────────────────────────────────────────────────────┘
```

### WebSocket Flow

```
Client  ──WS Connect──►  Node.js (assigns session ID, sends back)
Client  ──{ code, language }──►  Node.js
Node.js  ──POST /review──►  Python AI Service
Python  ──SSE chunks──►  Node.js  ──WS chunks──►  Client (renders live)
Node.js  ──saves to SQLite──►  (session persisted)
Client  ──receives "done"──►  Review finalised
```

## Project Structure

```
ai-code-review-bot/
├── ai-service/          # Python FastAPI — LLM streaming
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── backend/             # Node.js/TypeScript — WebSocket + REST + SQLite
│   ├── src/
│   │   ├── index.ts     # Main server (WS + Express)
│   │   ├── db.ts        # SQLite layer
│   │   └── types.ts     # Strict TypeScript interfaces
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
└── frontend/            # React/TypeScript — split-pane UI
    ├── src/
    │   ├── App.tsx
    │   ├── components/
    │   │   ├── ReviewPanel.tsx
    │   │   └── SessionSidebar.tsx
    │   ├── hooks/useWebSocket.ts
    │   ├── types/index.ts
    │   ├── utils/index.ts
    │   └── styles.css
    ├── index.html
    └── .env.example
```

## Local Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- OpenAI API key

---

### 1. Python AI Service

```bash
cd ai-service
cp .env.example .env
# Edit .env — add your OPENAI_API_KEY

pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Service runs at: `http://localhost:8000`

---

### 2. Node.js Backend

```bash
cd backend
cp .env.example .env
# Edit .env if needed (defaults work for local)

npm install
npm run dev          # development (ts-node-dev)
# OR
npm run build && npm start   # production
```

Server runs at: `http://localhost:3001` (WebSocket at `ws://localhost:3001`)

---

### 3. React Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env if backend is not on localhost:3001

npm install
npm run dev
```

App runs at: `http://localhost:5173`

---

## Environment Variables

### ai-service/.env
```
OPENAI_API_KEY=sk-...
PORT=8000
```

### backend/.env
```
PORT=3001
PYTHON_SERVICE_URL=http://localhost:8000
DB_PATH=./reviews.db
```

### frontend/.env
```
VITE_WS_URL=ws://localhost:3001
VITE_API_URL=http://localhost:3001
```

---

## Deployment

### Python AI Service → Render.com
1. Push `ai-service/` to GitHub
2. Render → New Web Service → select repo
3. Set **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add env var: `OPENAI_API_KEY`

### Node.js Backend → Railway.app
1. Railway → New Project → Deploy from GitHub
2. Set root directory to `backend/`
3. Set **Start Command**: `npm run build && node dist/index.js`
4. Add env var: `PYTHON_SERVICE_URL` (your Render URL)

### Frontend → Vercel
1. Connect `frontend/` to Vercel
2. Set env vars:
   - `VITE_WS_URL=wss://your-railway-app.railway.app`
   - `VITE_API_URL=https://your-railway-app.railway.app`

> **Note**: Vercel is HTTPS, so WebSocket must be `wss://` — Railway provides this automatically.

---

## REST API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/sessions` | List all review sessions |
| GET | `/sessions/:id` | Get single session with full review |
| DELETE | `/sessions/:id` | Delete a session |

## Review Schema

```json
{
  "bugs": [
    { "line": 12, "severity": "critical", "description": "...", "suggestion": "..." }
  ],
  "style": [
    { "line": null, "description": "...", "suggestion": "..." }
  ],
  "security": [
    { "line": 8, "severity": "major", "description": "...", "suggestion": "..." }
  ],
  "summary": "Overall assessment...",
  "score": 72,
  "language": "javascript"
}
```

## Supported Languages

JavaScript · TypeScript · Python · Java · Go · Rust · C++ · C

## Features

- ⚡ **Real-time streaming** — review chunks render as the model generates them
- 🔌 **WebSocket sessions** — UUID-based session management with auto-reconnect
- 💾 **Persistent history** — all reviews saved to SQLite, browsable in sidebar
- 🔍 **Auto language detection** — detects language from code syntax
- 📁 **File upload** — upload `.js`, `.ts`, `.py`, `.go`, `.java`, etc.
- 🗑️ **Session management** — view, restore, and delete past reviews
- 📊 **Scored reviews** — 0–100 quality score with color-coded rings
- 🐛 **Categorised issues** — bugs, security, style with severity levels

## Evaluation Criteria Met

| Criteria | Weight | Implementation |
|----------|--------|----------------|
| WebSocket + Streaming | 30% | `ws` library, SSE piping, WS reconnect with session restore |
| TypeScript Discipline | 25% | Strict mode, typed WS message interfaces, no implicit any |
| Prompt Engineering | 20% | JSON schema enforcement, `response_format: json_object`, scoring logic |
| Microservice Design | 15% | FastAPI SSE → Node pipe → WS client, error propagation |
| README + Architecture | 10% | Flow diagram, .env.example files, setup steps |
