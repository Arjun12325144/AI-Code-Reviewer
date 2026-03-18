import { SupportedLanguage } from '../types';

export function detectLanguage(code: string): SupportedLanguage {
  const trimmed = code.trim();

  // Python
  if (/^(def |class |import |from |print\(|if __name__|#!.*python)/m.test(trimmed)) return 'python';

  // TypeScript (before JS since TS is superset)
  if (/[:,]\s*(string|number|boolean|any|void|never|unknown|Record<|Array<|Promise<|interface |type [A-Z])/m.test(trimmed)) return 'typescript';
  if (/:\s*(string|number|boolean)\b/.test(trimmed) && /(const|let|var|function)\s/.test(trimmed)) return 'typescript';

  // JavaScript
  if (/(const |let |var |=>|require\(|module\.exports|console\.log|async |await )/m.test(trimmed)) return 'javascript';

  // Java
  if (/(public class |private |protected |System\.out|@Override|import java\.|public static void main)/m.test(trimmed)) return 'java';

  // Go
  if (/(^package |^import \(|func |:=|fmt\.|go )/m.test(trimmed)) return 'go';

  // Rust
  if (/(fn |let mut |use std::|println!|impl |pub fn |#\[derive|match )/m.test(trimmed)) return 'rust';

  // C++
  if (/(#include <|std::|cout <<|cin >>|namespace |template<|nullptr)/m.test(trimmed)) return 'cpp';

  // C
  if (/(#include <|printf\(|scanf\(|int main\(|void \*|malloc\(|free\()/m.test(trimmed)) return 'c';

  return 'auto';
}

export function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'Fair';
  if (score >= 50) return 'Poor';
  return 'Critical';
}
