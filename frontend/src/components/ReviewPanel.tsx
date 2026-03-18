import React, { useMemo } from 'react';
import { ReviewResult, ReviewStatus, ReviewIssue } from '../types';
import { getScoreColor, getScoreLabel } from '../utils';
import {
  Bug,
  Palette,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Info,
} from 'lucide-react';

interface ReviewPanelProps {
  status: ReviewStatus;
  streamedChunks: string;
  review: ReviewResult | null;
  error: string | null;
  onFixRequest?: (issue: ReviewIssue, category: string) => void;
}

interface IssueSectionProps {
  title: string;
  icon: React.ReactNode;
  issues: ReviewIssue[];
  color: string;
  bgColor: string;
  onFixRequest?: (issue: ReviewIssue, category: string) => void;
  category: string;
}

function SeverityBadge({ severity }: { severity?: string }) {
  if (!severity) return null;
  const styles: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    major: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    minor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  };
  const icons: Record<string, React.ReactNode> = {
    critical: <AlertCircle size={10} />,
    major: <AlertTriangle size={10} />,
    minor: <Info size={10} />,
  };
  return (
    <span className={`issue-severity ${styles[severity] || ''}`}>
      {icons[severity]}
      {severity}
    </span>
  );
}

function IssueCard({ issue, onFixRequest, category }: { issue: ReviewIssue; onFixRequest?: (i: ReviewIssue, c: string) => void; category: string }) {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <div className="issue-card">
      <div className="issue-header" onClick={() => setExpanded(!expanded)}>
        <div className="issue-meta">
          {issue.line !== null && (
            <span className="issue-line">Line {issue.line}</span>
          )}
          <SeverityBadge severity={issue.severity} />
        </div>
        <div className="issue-title-row">
          <p className="issue-description">{issue.description}</p>
          <button className="expand-btn">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="issue-body">
          <div className="issue-suggestion">
            <span className="suggestion-label">💡 Suggestion</span>
            <p>{issue.suggestion}</p>
          </div>
          {onFixRequest && (
            <button
              className="fix-btn"
              onClick={() => onFixRequest(issue, category)}
            >
              Fix this issue
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function IssueSection({ title, icon, issues, color, bgColor, onFixRequest, category }: IssueSectionProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  if (issues.length === 0) {
    return (
      <div className="issue-section empty">
        <div className="section-header" style={{ borderColor: color }}>
          <span style={{ color }}>{icon}</span>
          <h3 style={{ color }}>{title}</h3>
          <span className="section-count zero">0</span>
        </div>
        <p className="empty-msg"><CheckCircle2 size={12} /> No issues found</p>
      </div>
    );
  }

  return (
    <div className="issue-section" style={{ '--section-color': color, '--section-bg': bgColor } as React.CSSProperties}>
      <div className="section-header" onClick={() => setCollapsed(!collapsed)}>
        <span className="section-icon" style={{ color }}>{icon}</span>
        <h3>{title}</h3>
        <span className="section-count">{issues.length}</span>
        <button className="collapse-btn">
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>
      {!collapsed && (
        <div className="issue-list">
          {issues.map((issue, i) => (
            <IssueCard key={i} issue={issue} onFixRequest={onFixRequest} category={category} />
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="score-ring-wrapper">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
        <circle
          cx="36" cy="36" r="28"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="score-ring-inner">
        <span className="score-number" style={{ color }}>{score}</span>
      </div>
      <span className="score-label" style={{ color }}>{label}</span>
    </div>
  );
}

function StreamingIndicator({ chunks }: { chunks: string }) {
  const preview = useMemo(() => {
    try {
      const partial = chunks.trim();
      if (partial.includes('"summary"')) {
        const match = partial.match(/"summary"\s*:\s*"([^"]{0,80})/);
        if (match) return `Generating summary: "${match[1]}..."`;
      }
      if (partial.includes('"bugs"')) return 'Analyzing bugs...';
      if (partial.includes('"security"')) return 'Checking security...';
      if (partial.includes('"style"')) return 'Reviewing style...';
      return 'Processing code...';
    } catch {
      return 'Analyzing...';
    }
  }, [chunks]);

  return (
    <div className="streaming-indicator">
      <div className="streaming-header">
        <Loader2 size={16} className="spin" />
        <span>Reviewing...</span>
      </div>
      <p className="streaming-preview">{preview}</p>
      <div className="streaming-bars">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bar" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
    </div>
  );
}

export function ReviewPanel({ status, streamedChunks, review, error, onFixRequest }: ReviewPanelProps) {
  if (status === 'idle') {
    return (
      <div className="review-empty">
        <div className="review-empty-icon">⚡</div>
        <h3>Ready to review</h3>
        <p>Paste your code in the editor and click <strong>Review Code</strong> to get instant AI-powered feedback.</p>
        <div className="review-features">
          <span><Bug size={12} /> Bug Detection</span>
          <span><Palette size={12} /> Style Analysis</span>
          <span><ShieldAlert size={12} /> Security Scan</span>
        </div>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="review-loading">
        <Loader2 size={24} className="spin" />
        <p>Connecting...</p>
      </div>
    );
  }

  if (status === 'reviewing' && !review) {
    return <StreamingIndicator chunks={streamedChunks} />;
  }

  if (status === 'error') {
    return (
      <div className="review-error">
        <AlertCircle size={24} />
        <h3>Review Failed</h3>
        <p>{error || 'An unexpected error occurred.'}</p>
      </div>
    );
  }

  if (!review) return null;

  const totalIssues = review.bugs.length + review.style.length + review.security.length;

  return (
    <div className="review-results">
      {/* Score Header */}
      <div className="review-score-header">
        <ScoreRing score={review.score} />
        <div className="review-score-info">
          <div className="review-stats">
            <span className="stat bugs"><Bug size={12} />{review.bugs.length} bugs</span>
            <span className="stat style"><Palette size={12} />{review.style.length} style</span>
            <span className="stat security"><ShieldAlert size={12} />{review.security.length} security</span>
          </div>
          <p className="review-summary">{review.summary}</p>
        </div>
      </div>

      {totalIssues === 0 && (
        <div className="all-clear">
          <CheckCircle2 size={16} />
          <span>No issues found — clean code!</span>
        </div>
      )}

      {/* Issue Sections */}
      <div className="issue-sections">
        <IssueSection
          title="Bugs"
          icon={<Bug size={14} />}
          issues={review.bugs}
          color="#ef4444"
          bgColor="rgba(239,68,68,0.05)"
          onFixRequest={onFixRequest}
          category="bug"
        />
        <IssueSection
          title="Security"
          icon={<ShieldAlert size={14} />}
          issues={review.security}
          color="#f97316"
          bgColor="rgba(249,115,22,0.05)"
          onFixRequest={onFixRequest}
          category="security"
        />
        <IssueSection
          title="Style"
          icon={<Palette size={14} />}
          issues={review.style}
          color="#8b5cf6"
          bgColor="rgba(139,92,246,0.05)"
          onFixRequest={onFixRequest}
          category="style"
        />
      </div>
    </div>
  );
}
