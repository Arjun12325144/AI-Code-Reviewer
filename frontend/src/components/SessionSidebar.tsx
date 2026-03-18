import React from 'react';
import { SessionListItem } from '../types';
import { formatTimestamp, getScoreColor } from '../utils';
import { Trash2, Clock, Code2, ChevronRight } from 'lucide-react';

interface SessionSidebarProps {
  sessions: SessionListItem[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

function getLanguageEmoji(lang: string): string {
  const map: Record<string, string> = {
    javascript: '🟨',
    typescript: '🔷',
    python: '🐍',
    java: '☕',
    go: '🩵',
    rust: '🦀',
    cpp: '⚙️',
    c: '🔩',
    auto: '📄',
    unknown: '📄',
  };
  return map[lang?.toLowerCase()] || '📄';
}

export function SessionSidebar({ sessions, activeSessionId, onSelectSession, onDeleteSession }: SessionSidebarProps) {
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    await onDeleteSession(id);
    setDeletingId(null);
  };

  return (
    <aside className="session-sidebar">
      <div className="sidebar-header">
        <Clock size={14} />
        <h2>History</h2>
        <span className="session-count">{sessions.length}</span>
      </div>

      <div className="session-list">
        {sessions.length === 0 && (
          <div className="no-sessions">
            <Code2 size={20} />
            <p>No reviews yet</p>
          </div>
        )}

        {sessions.map((session) => (
          <div
            key={session.id}
            className={`session-item ${activeSessionId === session.id ? 'active' : ''}`}
            onClick={() => onSelectSession(session.id)}
          >
            <div className="session-item-top">
              <span className="session-lang-emoji">{getLanguageEmoji(session.language)}</span>
              <span className="session-lang">{session.language || 'unknown'}</span>
              <span
                className="session-score"
                style={{ color: getScoreColor(session.score) }}
              >
                {session.score}
              </span>
              <ChevronRight size={12} className="session-arrow" />
            </div>
            <div className="session-item-bottom">
              <p className="session-preview">{session.code_preview?.slice(0, 60) || '...'}</p>
              <span className="session-time">{formatTimestamp(session.timestamp)}</span>
            </div>
            <button
              className={`session-delete ${deletingId === session.id ? 'deleting' : ''}`}
              onClick={(e) => handleDelete(e, session.id)}
              title="Delete session"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
