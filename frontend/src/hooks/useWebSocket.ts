// import { useEffect, useRef, useCallback, useState } from 'react';
// import { WSServerMessage, ReviewResult, ReviewStatus, SessionListItem } from '../types';

// const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// interface UseWebSocketReturn {
//   sessionId: string | null;
//   status: ReviewStatus;
//   streamedChunks: string;
//   review: ReviewResult | null;
//   error: string | null;
//   sessions: SessionListItem[];
//   sendReview: (code: string, language: string) => void;
//   loadSession: (sessionId: string) => void;
//   deleteSession: (sessionId: string) => Promise<void>;
//   fetchSessions: () => Promise<void>;
//   resetReview: () => void;
//   restoredSession: RestoredSession | null;
// }

// interface RestoredSession {
//   sessionId: string;
//   code: string;
//   language: string;
//   review: ReviewResult;
//   timestamp: string;
// }

// export function useWebSocket(): UseWebSocketReturn {
//   const wsRef = useRef<WebSocket | null>(null);
//   const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
//   const [sessionId, setSessionId] = useState<string | null>(null);
//   const [status, setStatus] = useState<ReviewStatus>('idle');
//   const [streamedChunks, setStreamedChunks] = useState('');
//   const [review, setReview] = useState<ReviewResult | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [sessions, setSessions] = useState<SessionListItem[]>([]);
//   const [restoredSession, setRestoredSession] = useState<RestoredSession | null>(null);

//   const connect = useCallback(() => {
//     if (wsRef.current?.readyState === WebSocket.OPEN) return;

//     setStatus('connecting');
//     const ws = new WebSocket(WS_URL);
//     wsRef.current = ws;

//     ws.onopen = () => {
//       console.log('[WS] Connected');
//     };

//     ws.onmessage = (event: MessageEvent<string>) => {
//       let msg: WSServerMessage;
//       try {
//         msg = JSON.parse(event.data) as WSServerMessage;
//       } catch {
//         return;
//       }

//       switch (msg.type) {
//         case 'session_assigned': {
//           const { sessionId: sid } = msg.payload as { sessionId: string };
//           setSessionId(sid);
//           setStatus('idle');
//           break;
//         }

//         case 'review_chunk': {
//           const { chunk } = msg.payload as { chunk: string };
//           setStreamedChunks((prev) => prev + chunk);
//           setStatus('reviewing');
//           break;
//         }

//         case 'review_complete': {
//           const { review: r } = msg.payload as { review: ReviewResult };
//           setReview(r);
//           setStatus('complete');
//           fetchSessions();
//           break;
//         }

//         case 'review_error': {
//           const { message } = msg.payload as { message: string };
//           setError(message);
//           setStatus('error');
//           break;
//         }

//         case 'session_restored': {
//           const payload = msg.payload as unknown as RestoredSession;
//           setRestoredSession(payload);
//           setReview(payload.review);
//           setStatus('complete');
//           break;
//         }

//         case 'pong':
//           break;

//         default:
//           break;
//       }
//     };

//     ws.onerror = () => {
//       setError('WebSocket connection error');
//       setStatus('error');
//     };

//     ws.onclose = () => {
//       console.log('[WS] Disconnected, reconnecting in 3s...');
//       setStatus('idle');
//       reconnectTimerRef.current = setTimeout(connect, 3000);
//     };
//   }, []);

//   useEffect(() => {
//     connect();
//     return () => {
//       reconnectTimerRef.current && clearTimeout(reconnectTimerRef.current);
//       wsRef.current?.close();
//     };
//   }, [connect]);

//   const sendReview = useCallback((code: string, language: string) => {
//     if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
//       setError('Not connected. Please wait...');
//       return;
//     }
//     setStreamedChunks('');
//     setReview(null);
//     setError(null);
//     setStatus('reviewing');

//     wsRef.current.send(JSON.stringify({
//       type: 'review',
//       payload: { code, language },
//     }));
//   }, []);

//   const loadSession = useCallback((sid: string) => {
//     if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
//     wsRef.current.send(JSON.stringify({
//       type: 'restore_session',
//       payload: { sessionId: sid },
//     }));
//   }, []);

//   const fetchSessions = useCallback(async () => {
//     try {
//       const res = await fetch(`${API_URL}/sessions`);
//       const data = await res.json() as { sessions: SessionListItem[] };
//       setSessions(data.sessions || []);
//     } catch {
//       console.error('Failed to fetch sessions');
//     }
//   }, []);

//   const deleteSessionFn = useCallback(async (sid: string) => {
//     await fetch(`${API_URL}/sessions/${sid}`, { method: 'DELETE' });
//     await fetchSessions();
//   }, [fetchSessions]);

//   const resetReview = useCallback(() => {
//     setReview(null);
//     setStreamedChunks('');
//     setError(null);
//     setStatus('idle');
//     setRestoredSession(null);
//   }, []);

//   useEffect(() => {
//     fetchSessions();
//   }, [fetchSessions]);

//   return {
//     sessionId,
//     status,
//     streamedChunks,
//     review,
//     error,
//     sessions,
//     sendReview,
//     loadSession,
//     deleteSession: deleteSessionFn,
//     fetchSessions,
//     resetReview,
//     restoredSession,
//   };
// }
import { useEffect, useRef, useCallback, useState } from 'react';
import { WSServerMessage, ReviewResult, ReviewStatus, SessionListItem } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface RestoredSession {
  sessionId: string;
  code: string;
  language: string;
  review: ReviewResult;
  timestamp: string;
}

interface UseWebSocketReturn {
  sessionId: string | null;
  status: ReviewStatus;
  streamedChunks: string;
  review: ReviewResult | null;
  error: string | null;
  sessions: SessionListItem[];
  sendReview: (code: string, language: string) => void;
  loadSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => Promise<void>;
  fetchSessions: () => Promise<void>;
  resetReview: () => void;
  restoredSession: RestoredSession | null;
}

export function useWebSocket(): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chunksRef = useRef(''); // reliable ref for streaming

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<ReviewStatus>('idle');
  const [streamedChunks, setStreamedChunks] = useState('');
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [restoredSession, setRestoredSession] = useState<RestoredSession | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => console.log('[WS] Connected');

    ws.onmessage = (event: MessageEvent<string>) => {
      let msg: WSServerMessage;
      try {
        msg = JSON.parse(event.data) as WSServerMessage;
      } catch {
        return;
      }

      switch (msg.type) {
        case 'session_assigned': {
          const { sessionId: sid } = msg.payload as { sessionId: string };
          setSessionId(sid);
          setStatus('idle');
          break;
        }

        case 'review_chunk': {
          const { chunk } = msg.payload as { chunk: string };
          chunksRef.current += chunk;
          setStreamedChunks(chunksRef.current);
          setStatus('reviewing');
          break;
        }

        case 'review_complete': {
          const { review: r } = msg.payload as { review: ReviewResult };
          setReview(r);
          setStatus('complete');
          chunksRef.current = '';
          fetchSessions();
          break;
        }

        case 'review_error': {
          const { message } = msg.payload as { message: string };
          setError(message);
          setStatus('error');
          break;
        }

        case 'session_restored': {
          const payload = msg.payload as unknown as RestoredSession;
          setRestoredSession(payload);
          setReview(payload.review);
          setStatus('complete');
          break;
        }

        case 'pong':
          break;

        default:
          break;
      }
    };

    ws.onerror = () => {
      setError('WebSocket connection error');
      setStatus('error');
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected, reconnecting in 3s...');
      setStatus('idle');
      reconnectTimerRef.current = setTimeout(connect, 3000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      reconnectTimerRef.current && clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendReview = useCallback((code: string, language: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Not connected. Please wait...');
      return;
    }
    chunksRef.current = '';
    setStreamedChunks('');
    setReview(null);
    setError(null);
    setStatus('reviewing');

    wsRef.current.send(JSON.stringify({
      type: 'review',
      payload: { code, language },
    }));
  }, []);

  const loadSession = useCallback((sid: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      type: 'restore_session',
      payload: { sessionId: sid },
    }));
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/sessions`);
      const data = await res.json() as { sessions: SessionListItem[] };
      setSessions(data.sessions || []);
    } catch {
      console.error('Failed to fetch sessions');
    }
  }, []);

  const deleteSessionFn = useCallback(async (sid: string) => {
    await fetch(`${API_URL}/sessions/${sid}`, { method: 'DELETE' });
    await fetchSessions();
  }, [fetchSessions]);

  const resetReview = useCallback(() => {
    setReview(null);
    chunksRef.current = '';
    setStreamedChunks('');
    setError(null);
    setStatus('idle');
    setRestoredSession(null);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessionId,
    status,
    streamedChunks,
    review,
    error,
    sessions,
    sendReview,
    loadSession,
    deleteSession: deleteSessionFn,
    fetchSessions,
    resetReview,
    restoredSession,
  };
}
