import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import {
  WSClientMessage,
  WSServerMessage,
  ReviewPayload,
  RestoreSessionPayload,
  ReviewResult,
  ChunkPayload,
  CompletePayload,
  ErrorPayload,
} from './types';
import {
  createSession,
  saveReview,
  getAllSessions,
  getSessionById,
  deleteSession,
} from './db';

const PORT = parseInt(process.env.PORT || '3001', 10);
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// REST Endpoints
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ai-code-review-backend' });
});

app.get('/sessions', (_req, res) => {
  try {
    const sessions = getAllSessions();
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

app.get('/sessions/:id', (req, res) => {
  try {
    const session = getSessionById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    return res.json({
      ...session,
      review: JSON.parse(session.review),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch session' });
  }
});

app.delete('/sessions/:id', (req, res) => {
  try {
    const deleted = deleteSession(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Session not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete session' });
  }
});

// HTTP Server + WebSocket Server
const server = createServer(app);
const wss = new WebSocketServer({ server });

function sendToClient(ws: WebSocket, message: WSServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

async function streamReviewFromPython(
  ws: WebSocket,
  sessionId: string,
  code: string,
  language: string
): Promise<void> {
  let accumulatedChunks = '';

  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language }),
      signal: AbortSignal.timeout(120000), // 2 min timeout
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body from AI service');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const dataStr = line.slice(6).trim();
        if (!dataStr) continue;

        try {
          const data = JSON.parse(dataStr) as { chunk?: string; done?: boolean; error?: string };

          if (data.error) {
            throw new Error(data.error);
          }

          if (data.chunk) {
            accumulatedChunks += data.chunk;
            const chunkPayload: ChunkPayload = { chunk: data.chunk, sessionId };
            sendToClient(ws, { type: 'review_chunk', payload: chunkPayload });
          }

          if (data.done) {
            // Parse final JSON review
            const review = JSON.parse(accumulatedChunks) as ReviewResult;

            // Save to DB
            saveReview(sessionId, code, language, review);

            const completePayload: CompletePayload = { sessionId, review };
            sendToClient(ws, { type: 'review_complete', payload: completePayload });
            return;
          }
        } catch (parseErr) {
          // Skip malformed SSE lines
        }
      }
    }
  } catch (err) {
    console.error(`Review stream error for session ${sessionId}:`, err);
    const errorPayload: ErrorPayload = {
      sessionId,
      message: err instanceof Error ? err.message : 'Unknown streaming error',
    };
    sendToClient(ws, { type: 'review_error', payload: errorPayload });
  }
}

wss.on('connection', (ws: WebSocket) => {
  const sessionId = uuidv4();
  createSession(sessionId);

  console.log(`[WS] New connection: ${sessionId}`);

  // Send session ID to client
  sendToClient(ws, {
    type: 'session_assigned',
    payload: { sessionId },
  });

  ws.on('message', async (raw) => {
    let message: WSClientMessage;

    try {
      message = JSON.parse(raw.toString()) as WSClientMessage;
    } catch {
      console.error('[WS] Invalid JSON message');
      return;
    }

    switch (message.type) {
      case 'ping': {
        sendToClient(ws, {
          type: 'pong',
          payload: { timestamp: Date.now() },
        });
        break;
      }

      case 'review': {
        const { code, language } = message.payload as ReviewPayload;

        if (!code?.trim()) {
          const errorPayload: ErrorPayload = { sessionId, message: 'Code cannot be empty' };
          sendToClient(ws, { type: 'review_error', payload: errorPayload });
          return;
        }

        console.log(`[WS] Review request: session=${sessionId}, lang=${language}`);
        await streamReviewFromPython(ws, sessionId, code, language);
        break;
      }

      case 'restore_session': {
        const { sessionId: restoreId } = message.payload as RestoreSessionPayload;
        const session = getSessionById(restoreId);

        if (session) {
          sendToClient(ws, {
            type: 'session_restored',
            payload: {
              sessionId: session.id,
              code: session.code,
              language: session.language,
              review: JSON.parse(session.review) as ReviewResult,
              timestamp: session.timestamp,
            },
          });
        } else {
          const errorPayload: ErrorPayload = { message: 'Session not found' };
          sendToClient(ws, { type: 'review_error', payload: errorPayload });
        }
        break;
      }

      default:
        console.warn(`[WS] Unknown message type: ${(message as { type: string }).type}`);
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Disconnected: ${sessionId}`);
  });

  ws.on('error', (err) => {
    console.error(`[WS] Error on ${sessionId}:`, err.message);
  });

  // Heartbeat
  const heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(heartbeat);
    }
  }, 30000);
});

server.listen(PORT, () => {
  console.log(`✅ Backend server running on port ${PORT}`);
  console.log(`🤖 Python AI service: ${PYTHON_SERVICE_URL}`);
});

export default server;
