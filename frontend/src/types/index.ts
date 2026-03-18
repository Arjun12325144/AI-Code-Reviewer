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

export type ReviewStatus = 'idle' | 'connecting' | 'reviewing' | 'complete' | 'error';

export interface SessionListItem {
  id: string;
  language: string;
  timestamp: string;
  score: number;
  code_preview: string;
}

// WebSocket message types
export type WSClientMessageType = 'review' | 'ping' | 'restore_session';
export type WSServerMessageType =
  | 'session_assigned'
  | 'review_chunk'
  | 'review_complete'
  | 'review_error'
  | 'pong'
  | 'session_restored';

export interface WSServerMessage {
  type: WSServerMessageType;
  payload: Record<string, unknown>;
}

export type SupportedLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'go'
  | 'rust'
  | 'cpp'
  | 'c'
  | 'auto';

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  auto: 'Auto-detect',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  java: 'Java',
  go: 'Go',
  rust: 'Rust',
  cpp: 'C++',
  c: 'C',
};
