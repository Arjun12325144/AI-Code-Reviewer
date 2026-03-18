// WebSocket Message Types
export interface WSClientMessage {
  type: 'review' | 'ping' | 'restore_session';
  payload: ReviewPayload | PingPayload | RestoreSessionPayload;
}

export interface ReviewPayload {
  code: string;
  language: string;
}

export interface PingPayload {
  timestamp: number;
}

export interface RestoreSessionPayload {
  sessionId: string;
}

export interface WSServerMessage {
  type: 'session_assigned' | 'review_chunk' | 'review_complete' | 'review_error' | 'pong' | 'session_restored';
  payload: SessionPayload | ChunkPayload | CompletePayload | ErrorPayload | PongPayload | SessionRestoredPayload;
}

export interface SessionPayload {
  sessionId: string;
}

export interface ChunkPayload {
  chunk: string;
  sessionId: string;
}

export interface CompletePayload {
  sessionId: string;
  review: ReviewResult;
}

export interface ErrorPayload {
  sessionId?: string;
  message: string;
}

export interface PongPayload {
  timestamp: number;
}

export interface SessionRestoredPayload {
  sessionId: string;
  code: string;
  review: ReviewResult;
  language: string;
  timestamp: string;
}

// Review Schema
export interface ReviewIssue {
  line: number | null;
  severity?: 'critical' | 'major' | 'minor';
  description: string;
  suggestion: string;
}

export interface ReviewResult {
  bugs: ReviewIssue[];
  style: ReviewIssue[];
  security: ReviewIssue[];
  summary: string;
  score: number;
  language: string;
}

// Database Types
export interface SessionRow {
  id: string;
  code: string;
  language: string;
  review: string;
  timestamp: string;
  score: number;
}

export interface SessionListItem {
  id: string;
  language: string;
  timestamp: string;
  score: number;
  code_preview: string;
}
