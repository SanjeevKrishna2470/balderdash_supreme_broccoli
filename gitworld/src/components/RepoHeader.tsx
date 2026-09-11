import { useEffect, useMemo, useRef, useState } from 'react';
import type { RepoWorldModel } from '../world/repoWorldTypes';
import { formatBytes } from '../world/format';
import './RepoHeader.css';

interface Props {
  world: RepoWorldModel;
  districtName: string;
  hoveredName: string | null;
  onExit: () => void;
  onSelectBuilding: (id: string) => void;
  onLogout?: () => void;
}

export function RepoHeader({ world, districtName, hoveredName, onExit, onSelectBuilding, onLogout }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return world.buildings
      .filter((b) => b.name.toLowerCase().includes(q) || b.path.toLowerCase().includes(q))
      .slice(0, 6);
  }, [world.buildings, query]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDocClick);
    return () => window.removeEventListener('mousedown', onDocClick);
  }, []);

  const topLanguage = Object.entries(world.languages).sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <div className="repoheader">
      <div className="repoheader-row">
        <button className="repoheader-back" onClick={onExit} title="Exit repository and return to town (Esc or Q)">
          <BackIcon />
          <span>Exit to Town</span>
          <kbd className="repoheader-kbd">Esc</kbd>
        </button>

        <div className="repoheader-breadcrumb">
          <span>Town</span>
          <span className="repoheader-crumb-sep">/</span>
          <span>{districtName}</span>
          <span className="repoheader-crumb-sep">/</span>
          <span className="repoheader-crumb-current">{world.repoName}</span>
        </div>

        {hoveredName && <span className="repoheader-hovered">{hoveredName}</span>}

        <div className="repoheader-search" ref={boxRef}>
          <SearchIcon />
          <input
            className="repoheader-search-input"
            placeholder="Search files & folders&hellip;"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
          {open && query.trim() && (
            <ul className="repoheader-results">
              {results.length === 0 ? (
                <li className="repoheader-results-empty">No matches</li>
              ) : (
                results.map((b) => (
                  <li key={b.id}>
                    <button
                      className="repoheader-result"
                      onClick={() => {
                        onSelectBuilding(b.id);
                        setOpen(false);
                      }}
                    >
                      <span className="repoheader-result-swatch" style={{ background: b.style.primary }} />
                      <span className="repoheader-result-text">
                        <span className="repoheader-result-name">{b.name}</span>
                        <span className="repoheader-result-path">{b.path}</span>
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {onLogout && (
          <button className="repoheader-btn--logout" onClick={onLogout} title="Log out / Leave realm">
            <LogoutIcon />
            <span className="repoheader-logout-text">Logout</span>
          </button>
        )}
      </div>

      <div className="repoheader-summary">
        {world.projectType} &middot; {world.totalFiles.toLocaleString()} files &middot; {formatBytes(world.totalBytes)}
        {topLanguage && <> &middot; {topLanguage}</>}
        {world.truncated && <span className="repoheader-truncated">Showing a partial view of a very large repository</span>}
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M9 2L3 7L9 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
      <path d="M5.5 2.5H3C2.44772 2.5 2 2.94772 2 3.5V11.5C2 12.0523 2.44772 12.5 3 12.5H5.5M10 4.5L13 7.5M13 7.5L10 10.5M13 7.5H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

