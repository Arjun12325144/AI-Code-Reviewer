// import React, { useState, useCallback, useEffect } from 'react';
// import CodeMirror from '@uiw/react-codemirror';
// import { javascript } from '@codemirror/lang-javascript';
// import { python } from '@codemirror/lang-python';
// import { java } from '@codemirror/lang-java';
// import { go } from '@codemirror/lang-go';
// import { rust } from '@codemirror/lang-rust';
// import { cpp } from '@codemirror/lang-cpp';
// import { oneDark } from '@codemirror/theme-one-dark';
// import { Extension } from '@codemirror/state';
// import { ReviewPanel } from './components/ReviewPanel';
// import { SessionSidebar } from './components/SessionSidebar';
// import { useWebSocket } from './hooks/useWebSocket';
// import { SupportedLanguage, LANGUAGE_LABELS, ReviewIssue } from './types';
// import { detectLanguage } from './utils';
// import {
//   Play,
//   Upload,
//   RotateCcw,
//   Wifi,
//   WifiOff,
//   PanelLeftOpen,
//   PanelLeftClose,
//   Zap,
// } from 'lucide-react';

// const LANGUAGE_EXTENSIONS: Record<string, () => Extension> = {
//   javascript: () => javascript(),
//   typescript: () => javascript({ typescript: true }),
//   python: () => python(),
//   java: () => java(),
//   go: () => go(),
//   rust: () => rust(),
//   cpp: () => cpp(),
//   c: () => cpp(),
// };

// const SAMPLE_CODE = `// Paste your code here or upload a file
// function calculateDiscount(price, userRole) {
//   var discount = 0;
  
//   if (userRole == "admin") {
//     discount = 0.5;
//   } else if (userRole == "member") {
//     discount = 0.2;
//   }
  
//   // TODO: add more roles
//   const query = "SELECT * FROM users WHERE id = " + userId;
  
//   return price - (price * discount);
// }

// // Unused variable
// var unusedVar = "hello";

// module.exports = calculateDiscount;
// `;

// export default function App() {
//   const [code, setCode] = useState(SAMPLE_CODE);
//   const [language, setLanguage] = useState<SupportedLanguage>('auto');
//   const [detectedLang, setDetectedLang] = useState<SupportedLanguage>('javascript');
//   const [sidebarOpen, setSidebarOpen] = useState(true);
//   const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

//   const {
//     sessionId,
//     status,
//     streamedChunks,
//     review,
//     error,
//     sessions,
//     sendReview,
//     loadSession,
//     deleteSession,
//     resetReview,
//     restoredSession,
//   } = useWebSocket();

//   // Auto-detect language
//   useEffect(() => {
//     if (language === 'auto') {
//       const detected = detectLanguage(code);
//       setDetectedLang(detected === 'auto' ? 'javascript' : detected);
//     } else {
//       setDetectedLang(language);
//     }
//   }, [code, language]);

//   // Handle restored session
//   useEffect(() => {
//     if (restoredSession) {
//       setCode(restoredSession.code);
//       const lang = restoredSession.language as SupportedLanguage;
//       setLanguage(lang);
//       setActiveSessionId(restoredSession.sessionId);
//     }
//   }, [restoredSession]);

//   const handleReview = useCallback(() => {
//     if (!code.trim() || status === 'reviewing') return;
//     const effectiveLang = language === 'auto' ? detectedLang : language;
//     sendReview(code, effectiveLang);
//     setActiveSessionId(null);
//   }, [code, language, detectedLang, status, sendReview]);

//   const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     const ext = file.name.split('.').pop()?.toLowerCase() || '';
//     const extToLang: Record<string, SupportedLanguage> = {
//       js: 'javascript', mjs: 'javascript', cjs: 'javascript',
//       ts: 'typescript', tsx: 'typescript',
//       py: 'python',
//       java: 'java',
//       go: 'go',
//       rs: 'rust',
//       cpp: 'cpp', cc: 'cpp', cxx: 'cpp',
//       c: 'c', h: 'c',
//     };
//     if (extToLang[ext]) setLanguage(extToLang[ext]);

//     const reader = new FileReader();
//     reader.onload = (ev) => {
//       const text = ev.target?.result as string;
//       setCode(text);
//       resetReview();
//     };
//     reader.readAsText(file);
//     e.target.value = '';
//   }, [resetReview]);

//   const handleSelectSession = useCallback((id: string) => {
//     setActiveSessionId(id);
//     loadSession(id);
//   }, [loadSession]);

//   const handleDeleteSession = useCallback(async (id: string) => {
//     await deleteSession(id);
//     if (activeSessionId === id) {
//       setActiveSessionId(null);
//       resetReview();
//     }
//   }, [deleteSession, activeSessionId, resetReview]);

//   const getEditorExtensions = (): Extension[] => {
//     const extFn = LANGUAGE_EXTENSIONS[detectedLang];
//     return extFn ? [extFn()] : [javascript()];
//   };

//   const isConnected = status !== 'connecting' && !!sessionId;
//   const isReviewing = status === 'reviewing';
//   const displayLang = language === 'auto' ? detectedLang : language;

//   return (
//     <div className="app">
//       {/* Header */}
//       <header className="app-header">
//         <div className="header-left">
//           <button
//             className="sidebar-toggle"
//             onClick={() => setSidebarOpen(!sidebarOpen)}
//             title="Toggle history"
//           >
//             {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
//           </button>
//           <div className="app-logo">
//             <Zap size={18} />
//             <span>CodeReview<span className="logo-ai">AI</span></span>
//           </div>
//         </div>

//         <div className="header-center">
//           <div className="language-selector">
//             <label>Language</label>
//             <select
//               value={language}
//               onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
//             >
//               {Object.entries(LANGUAGE_LABELS).map(([val, label]) => (
//                 <option key={val} value={val}>{label}</option>
//               ))}
//             </select>
//             {language === 'auto' && (
//               <span className="detected-badge">
//                 Detected: {detectedLang}
//               </span>
//             )}
//           </div>
//         </div>

//         <div className="header-right">
//           <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
//             {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
//             <span>{isConnected ? 'Live' : 'Connecting'}</span>
//           </div>
//           {sessionId && (
//             <span className="session-id" title="Session ID">
//               #{sessionId.slice(0, 8)}
//             </span>
//           )}
//         </div>
//       </header>

//       <div className="app-body">
//         {/* Sidebar */}
//         {sidebarOpen && (
//           <SessionSidebar
//             sessions={sessions}
//             activeSessionId={activeSessionId}
//             onSelectSession={handleSelectSession}
//             onDeleteSession={handleDeleteSession}
//           />
//         )}

//         {/* Main Split Pane */}
//         <main className="main-content">
//           {/* Editor Pane */}
//           <div className="pane editor-pane">
//             <div className="pane-header">
//               <div className="pane-title">
//                 <span className={`lang-badge lang-${displayLang}`}>{displayLang}</span>
//                 <span>Code Editor</span>
//               </div>
//               <div className="pane-actions">
//                 <label className="upload-btn" title="Upload file">
//                   <Upload size={13} />
//                   <span>Upload</span>
//                   <input
//                     type="file"
//                     accept=".js,.ts,.tsx,.jsx,.py,.java,.go,.rs,.cpp,.cc,.c,.h"
//                     onChange={handleFileUpload}
//                     style={{ display: 'none' }}
//                   />
//                 </label>
//                 <button
//                   className="clear-btn"
//                   onClick={() => { setCode(''); resetReview(); }}
//                   title="Clear editor"
//                 >
//                   <RotateCcw size={13} />
//                 </button>
//                 <button
//                   className={`review-btn ${isReviewing ? 'reviewing' : ''}`}
//                   onClick={handleReview}
//                   disabled={isReviewing || !isConnected || !code.trim()}
//                 >
//                   {isReviewing ? (
//                     <>
//                       <span className="btn-spinner" />
//                       Reviewing...
//                     </>
//                   ) : (
//                     <>
//                       <Play size={13} />
//                       Review Code
//                     </>
//                   )}
//                 </button>
//               </div>
//             </div>

//             <div className="editor-wrapper">
//               <CodeMirror
//                 value={code}
//                 onChange={(val) => { setCode(val); if (review) resetReview(); }}
//                 extensions={getEditorExtensions()}
//                 theme={oneDark}
//                 basicSetup={{
//                   lineNumbers: true,
//                   highlightActiveLineGutter: true,
//                   highlightActiveLine: true,
//                   foldGutter: true,
//                   autocompletion: true,
//                 }}
//                 style={{ height: '100%', fontSize: '13px' }}
//               />
//             </div>

//             <div className="editor-footer">
//               <span>{code.split('\n').length} lines</span>
//               <span>{code.length} chars</span>
//             </div>
//           </div>

//           {/* Divider */}
//           <div className="pane-divider" />

//           {/* Review Pane */}
//           <div className="pane review-pane">
//             <div className="pane-header">
//               <div className="pane-title">
//                 <span>AI Review</span>
//               </div>
//               {review && (
//                 <button className="clear-btn" onClick={resetReview} title="Clear review">
//                   <RotateCcw size={13} />
//                 </button>
//               )}
//             </div>

//             <div className="review-wrapper">
//               <ReviewPanel
//                 status={status}
//                 streamedChunks={streamedChunks}
//                 review={review}
//                 error={error}
//                 onFixRequest={(_issue: ReviewIssue, _category: string) => {
//                   // Could trigger a follow-up LLM call
//                   alert(`Fix request for: ${_issue.description}`);
//                 }}
//               />
//             </div>
//           </div>
//         </main>
//       </div>
//     </div>
//   );
// }
import React, { useState, useCallback, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { go } from '@codemirror/lang-go';
import { rust } from '@codemirror/lang-rust';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import { Extension } from '@codemirror/state';
import { ReviewPanel } from './components/ReviewPanel';
import { SessionSidebar } from './components/SessionSidebar';
import { useWebSocket } from './hooks/useWebSocket';
import { SupportedLanguage, LANGUAGE_LABELS, ReviewIssue } from './types';
import { detectLanguage } from './utils';
import {
  Play,
  Upload,
  RotateCcw,
  Wifi,
  WifiOff,
  PanelLeftOpen,
  PanelLeftClose,
  Zap,
} from 'lucide-react';

const LANGUAGE_EXTENSIONS: Record<string, () => Extension> = {
  javascript: () => javascript(),
  typescript: () => javascript({ typescript: true }),
  python: () => python(),
  java: () => java(),
  go: () => go(),
  rust: () => rust(),
  cpp: () => cpp(),
  c: () => cpp(),
};

const SAMPLE_CODE = `// Paste your code here or upload a file
function calculateDiscount(price, userRole) {
  var discount = 0;
  
  if (userRole == "admin") {
    discount = 0.5;
  } else if (userRole == "member") {
    discount = 0.2;
  }
  
  // TODO: add more roles
  const query = "SELECT * FROM users WHERE id = " + userId;
  
  return price - (price * discount);
}

// Unused variable
var unusedVar = "hello";

module.exports = calculateDiscount;
`;

export default function App() {
  const [code, setCode] = useState(SAMPLE_CODE);
  const [language, setLanguage] = useState<SupportedLanguage>('auto');
  const [detectedLang, setDetectedLang] = useState<SupportedLanguage>('javascript');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const {
    sessionId,
    status,
    streamedChunks,
    review,
    error,
    sessions,
    sendReview,
    loadSession,
    deleteSession,
    resetReview,
    restoredSession,
  } = useWebSocket();

  // Auto-detect language
  useEffect(() => {
    if (language === 'auto') {
      const detected = detectLanguage(code);
      setDetectedLang(detected === 'auto' ? 'javascript' : detected);
    } else {
      setDetectedLang(language);
    }
  }, [code, language]);

  // Handle restored session
  useEffect(() => {
    if (restoredSession) {
      setCode(restoredSession.code);
      const lang = restoredSession.language as SupportedLanguage;
      setLanguage(lang);
      setActiveSessionId(restoredSession.sessionId);
    }
  }, [restoredSession]);

  const handleReview = useCallback(() => {
    if (!code.trim() || status === 'reviewing') return;
    const effectiveLang = language === 'auto' ? detectedLang : language;
    sendReview(code, effectiveLang);
    setActiveSessionId(null);
  }, [code, language, detectedLang, status, sendReview]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const extToLang: Record<string, SupportedLanguage> = {
      js: 'javascript', mjs: 'javascript', cjs: 'javascript',
      ts: 'typescript', tsx: 'typescript',
      py: 'python',
      java: 'java',
      go: 'go',
      rs: 'rust',
      cpp: 'cpp', cc: 'cpp', cxx: 'cpp',
      c: 'c', h: 'c',
    };
    if (extToLang[ext]) setLanguage(extToLang[ext]);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCode(text);
      resetReview();
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [resetReview]);

  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id);
    loadSession(id);
  }, [loadSession]);

  const handleDeleteSession = useCallback(async (id: string) => {
    await deleteSession(id);
    if (activeSessionId === id) {
      setActiveSessionId(null);
      resetReview();
    }
  }, [deleteSession, activeSessionId, resetReview]);

  const getEditorExtensions = (): Extension[] => {
    const extFn = LANGUAGE_EXTENSIONS[detectedLang];
    return extFn ? [extFn()] : [javascript()];
  };

  const isConnected = status !== 'connecting' && !!sessionId;
  const isReviewing = status === 'reviewing';
  const displayLang = language === 'auto' ? detectedLang : language;

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle history"
          >
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
          <div className="app-logo">
            <Zap size={18} />
            <span>CodeReview<span className="logo-ai">AI</span></span>
          </div>
        </div>

        <div className="header-center">
          <div className="language-selector">
            <label>Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
            >
              {Object.entries(LANGUAGE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            {language === 'auto' && (
              <span className="detected-badge">Detected: {detectedLang}</span>
            )}
          </div>
        </div>

        <div className="header-right">
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span>{isConnected ? 'Live' : 'Connecting'}</span>
          </div>
          {sessionId && (
            <span className="session-id" title="Session ID">
              #{sessionId.slice(0, 8)}
            </span>
          )}
        </div>
      </header>

      <div className="app-body">
        {/* Sidebar */}
        {sidebarOpen && (
          <SessionSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
          />
        )}

        {/* Main */}
        <main className="main-content">
          {/* Editor Pane */}
          <div className="pane editor-pane">
            <div className="pane-header">
              <div className="pane-title">
                <span className={`lang-badge lang-${displayLang}`}>{displayLang}</span>
                <span>Code Editor</span>
              </div>
              <div className="pane-actions">
                <label className="upload-btn" title="Upload file">
                  <Upload size={13} /><span>Upload</span>
                  <input
                    type="file"
                    accept=".js,.ts,.tsx,.jsx,.py,.java,.go,.rs,.cpp,.cc,.c,.h"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
                <button
                  className="clear-btn"
                  onClick={() => { setCode(''); resetReview(); }}
                  title="Clear editor"
                >
                  <RotateCcw size={13} />
                </button>
                <button
                  className={`review-btn ${isReviewing ? 'reviewing' : ''}`}
                  onClick={handleReview}
                  disabled={isReviewing || !isConnected || !code.trim()}
                >
                  {isReviewing ? (
                    <>
                      <span className="btn-spinner" />
                      Reviewing...
                    </>
                  ) : (
                    <>
                      <Play size={13} />
                      Review Code
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="editor-wrapper">
              <CodeMirror
                value={code}
                onChange={(val) => { setCode(val); if (review) resetReview(); }}
                extensions={getEditorExtensions()}
                theme={oneDark}
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLineGutter: true,
                  highlightActiveLine: true,
                  foldGutter: true,
                  autocompletion: true,
                }}
                style={{ height: '100%', fontSize: '13px' }}
              />
            </div>

            <div className="editor-footer">
              <span>{code.split('\n').length} lines</span>
              <span>{code.length} chars</span>
            </div>
          </div>

          {/* Divider */}
          <div className="pane-divider" />

          {/* Review Pane */}
          <div className="pane review-pane">
            <div className="pane-header">
              <div className="pane-title"><span>AI Review</span></div>
              {review && (
                <button className="clear-btn" onClick={resetReview} title="Clear review">
                  <RotateCcw size={13} />
                </button>
              )}
            </div>

            <div className="review-wrapper">
              <ReviewPanel
                status={status}
                streamedChunks={streamedChunks}
                review={review}
                error={error}
                onFixRequest={(_issue: ReviewIssue, _category: string) => {
                  alert(`Fix request for: ${_issue.description}`);
                }}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
