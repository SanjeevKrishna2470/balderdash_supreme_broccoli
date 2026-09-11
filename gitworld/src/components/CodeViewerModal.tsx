import { useEffect, useState, useMemo, useCallback } from 'react';
import type { CodeViewerTarget } from '../state/useWorldStore';
import { fetchRepoFileContent, fetchRepoTree, type RepoFileContent } from '../world/repoApi';
import type { RepoDirectoryNode, RepoFileNode } from '../world/repoWorldTypes';
import { highlightCode } from './syntaxHighlighter';
import { formatBytes } from '../world/format';
import './CodeViewerModal.css';

interface Props {
  target: CodeViewerTarget | null;
  onClose: () => void;
}

interface NavFile {
  name: string;
  path: string;
  isEntryPoint?: boolean;
}

export function CodeViewerModal({ target, onClose }: Props) {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [fileData, setFileData] = useState<RepoFileContent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [availableFiles, setAvailableFiles] = useState<NavFile[]>([]);

  // Parse owner and repo
  const { owner, repo } = useMemo(() => {
    if (!target) return { owner: '', repo: '' };
    const parts = target.repoFullName.split('/');
    return {
      owner: parts[0] || '',
      repo: parts[1] || parts[0] || '',
    };
  }, [target]);

  // Load tree to get list of files for the sidebar switcher
  useEffect(() => {
    if (!owner || !repo) return;
    let cancelled = false;

    async function loadTree() {
      try {
        const tree = await fetchRepoTree(owner, repo);
        if (cancelled) return;

        const files: NavFile[] = [];
        function walk(node: RepoDirectoryNode) {
          for (const child of node.children) {
            if ('children' in child) {
              walk(child);
            } else {
              const fileNode = child as RepoFileNode;
              files.push({
                name: fileNode.name,
                path: fileNode.path,
                isEntryPoint: Boolean(fileNode.isEntryPoint),
              });
            }
          }
        }
        walk(tree.root);

        // Sort: Entry points and README first, then alphabetically
        files.sort((a, b) => {
          if (a.isEntryPoint && !b.isEntryPoint) return -1;
          if (!a.isEntryPoint && b.isEntryPoint) return 1;
          if (a.path.toLowerCase().includes('readme')) return -1;
          if (b.path.toLowerCase().includes('readme')) return 1;
          return a.path.localeCompare(b.path);
        });

        setAvailableFiles(files);

        // If target did not specify a filePath, auto-select the first file
        if (!target?.filePath && files.length > 0) {
          setCurrentPath(files[0].path);
        }
      } catch (err) {
        console.warn('Could not fetch repo tree for navigation sidebar:', err);
      }
    }

    loadTree();
    return () => {
      cancelled = true;
    };
  }, [owner, repo, target?.filePath]);

  // Set initial path when target changes
  useEffect(() => {
    if (target?.filePath) {
      setCurrentPath(target.filePath);
    }
  }, [target?.filePath]);

  // Fetch file content when currentPath changes
  useEffect(() => {
    if (!owner || !repo || !currentPath) return;
    let cancelled = false;

    async function loadContent() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchRepoFileContent(owner, repo, currentPath);
        if (!cancelled) {
          setFileData(result);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to read file from realm.');
          setLoading(false);
        }
      }
    }

    loadContent();
    return () => {
      cancelled = true;
    };
  }, [owner, repo, currentPath]);

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Copy code handler
  const handleCopy = useCallback(() => {
    if (!fileData?.content) return;
    navigator.clipboard.writeText(fileData.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [fileData?.content]);

  // Syntax highlighting computation
  const highlightedLines = useMemo(() => {
    if (!fileData?.content) return [];
    return highlightCode(fileData.content, fileData.language);
  }, [fileData?.content, fileData?.language]);

  if (!target) return null;

  const activeFileName = currentPath.split('/').pop() || currentPath;
  const externalGithubUrl = `https://github.com/${target.repoFullName}/blob/main/${currentPath}`;

  return (
    <>
      <div className="codeviewer-scrim" onClick={onClose} />
      <div className="codeviewer-container">
        <aside className="codeviewer-modal" role="dialog" aria-label={`Source code of ${activeFileName}`}>
          {/* Header Bar */}
          <header className="codeviewer-header">
            <div className="codeviewer-breadcrumbs">
              <span className="codeviewer-repo-badge">{target.repoFullName}</span>
              <span className="codeviewer-sep">/</span>
              <span className="codeviewer-path">{currentPath || 'Select a file'}</span>
            </div>

            <div className="codeviewer-actions">
              {fileData && (
                <>
                  <span className="codeviewer-badge">
                    <span className="codeviewer-lang-dot" />
                    {fileData.language.toUpperCase()}
                  </span>
                  <span className="codeviewer-badge tabular">{formatBytes(fileData.size)}</span>
                  <span className="codeviewer-badge tabular">{highlightedLines.length} lines</span>
                </>
              )}

              <button
                className={`codeviewer-btn ${copied ? 'codeviewer-btn--copied' : ''}`}
                onClick={handleCopy}
                disabled={!fileData || loading}
                title="Copy file contents"
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              <a
                className="codeviewer-btn"
                href={externalGithubUrl}
                target="_blank"
                rel="noreferrer"
                title="View original on GitHub"
              >
                <span>GitHub</span>
                <ExternalIcon />
              </a>

              <button
                className="codeviewer-btn codeviewer-btn--exit"
                onClick={onClose}
                title="Exit code view (Esc)"
              >
                <CloseIcon />
                <span>Exit Code</span>
                <kbd style={{ fontSize: 10, opacity: 0.75, background: 'rgba(0,0,0,0.35)', padding: '1px 4px', borderRadius: 3 }}>Esc</kbd>
              </button>

              <button className="codeviewer-close-btn" onClick={onClose} aria-label="Close code viewer">
                <CloseIcon />
              </button>
            </div>
          </header>


          {/* Main Area with Sidebar + Editor */}
          <div className="codeviewer-workspace">
            {/* Left Nav File Tree */}
            <nav
              className={`codeviewer-sidebar ${sidebarOpen ? '' : 'codeviewer-sidebar--collapsed'}`}
              aria-label="Repository files"
            >
              <div className="codeviewer-sidebar-header">Repository Files ({availableFiles.length})</div>
              <ul className="codeviewer-file-list">
                {availableFiles.map((file) => {
                  const isActive = file.path === currentPath;
                  return (
                    <li
                      key={file.path}
                      className={`codeviewer-file-item ${isActive ? 'codeviewer-file-item--active' : ''}`}
                      onClick={() => setCurrentPath(file.path)}
                      title={file.path}
                    >
                      <span className="codeviewer-file-icon">{file.isEntryPoint ? '⭐' : '📄'}</span>
                      <span className="codeviewer-file-name">{file.path}</span>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Code Content Container */}
            <main className="codeviewer-content">
              {loading ? (
                <div className="codeviewer-loading">
                  <div className="codeviewer-spinner" />
                  <h3 className="codeviewer-status-title">Unrolling the manuscript…</h3>
                  <p className="codeviewer-status-sub">Retrieving source text directly from the realm ledger.</p>
                </div>
              ) : error ? (
                <div className="codeviewer-error">
                  <h3 className="codeviewer-status-title">Manuscript Unavailable</h3>
                  <p className="codeviewer-status-sub">{error}</p>
                  <button className="codeviewer-btn" onClick={() => setCurrentPath(currentPath)}>
                    Retry Retrieval
                  </button>
                </div>
              ) : (
                <div className="codeviewer-editor">
                  {/* Line Numbers Gutter */}
                  <div className="codeviewer-gutters" aria-hidden="true">
                    {highlightedLines.map((line) => (
                      <span key={line.lineNumber} className="codeviewer-gutter-line tabular">
                        {line.lineNumber}
                      </span>
                    ))}
                  </div>

                  {/* Highlighted Code Lines */}
                  <div className="codeviewer-code-lines">
                    {highlightedLines.map((line) => (
                      <div key={line.lineNumber} className="codeviewer-code-line">
                        {line.tokens.map((token, ti) => (
                          <span key={ti} className={token.className}>
                            {token.text}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer status */}
              <footer className="codeviewer-footer">
                <button
                  className="codeviewer-sidebar-toggle"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  title={sidebarOpen ? 'Hide files panel' : 'Show files panel'}
                >
                  <FolderIcon />
                  <span>{sidebarOpen ? 'Hide Files' : 'Show Files'}</span>
                </button>

                <div className="codeviewer-footer-info">
                  <span>UTF-8</span>
                  <span>{fileData ? `${highlightedLines.length} lines` : ''}</span>
                </div>
              </footer>
            </main>
          </div>
        </aside>
      </div>
    </>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <rect x="4.5" y="4.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9.5 2H2.5C1.94772 2 1.5 2.44772 1.5 3V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
      <path d="M4 9L9 4M9 4H5M9 4V8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M1.5 3.5C1.5 2.67157 2.17157 2 3 2H5.2C5.6 2 5.95 2.2 6.15 2.55L6.85 3.75C7.05 4.1 7.4 4.3 7.8 4.3H11C11.8284 4.3 12.5 4.97157 12.5 5.8V10.5C12.5 11.3284 11.8284 12 11 12H3C2.17157 12 1.5 11.3284 1.5 10.5V3.5Z" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
