import { useEffect } from 'react';
import type { RepoBuilding } from '../world/repoWorldTypes';
import { CATEGORY_NAMES } from '../world/repoWorldBuilder';
import { formatBytes } from '../world/format';
import './RepoWorldPanel.css';

interface Props {
  building: RepoBuilding | null;
  onClose: () => void;
  onViewCode?: (building: RepoBuilding) => void;
}

export function RepoWorldPanel({ building, onClose, onViewCode }: Props) {
  useEffect(() => {
    if (!building) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [building, onClose]);

  if (!building) return null;

  return (
    <>
      <div className="repoworldpanel-scrim" onClick={onClose} />
      <aside className="repoworldpanel" key={building.id} role="dialog" aria-label={`${building.name} details`}>
        <button className="repoworldpanel-close" onClick={onClose} aria-label="Close panel">
          <CloseIcon />
        </button>

        <div className="repoworldpanel-header" style={{ background: building.style.primary }}>
          <span className="repoworldpanel-path">{building.path}</span>
          <h2 className="repoworldpanel-name">{building.name}</h2>
          {building.isEntryPoint && <span className="repoworldpanel-badge">Entry point</span>}
        </div>

        <div className="repoworldpanel-body">
          <div className="repoworldpanel-meta">
            <span className="repoworldpanel-lang">
              <span className="repoworldpanel-lang-dot" style={{ background: building.style.primary }} />
              {building.language || CATEGORY_NAMES[building.category]}
            </span>
            <span className="repoworldpanel-sep">&middot;</span>
            <span>{CATEGORY_NAMES[building.category]}</span>
          </div>

          <div className="repoworldpanel-stats">
            <Stat label="Size" value={formatBytes(building.bytes)} />
            {building.fileCount ? <Stat label="Files" value={String(building.fileCount)} /> : null}
          </div>

          {onViewCode && (
            <button className="repoworldpanel-cta" onClick={() => onViewCode(building)}>
              <CodeIcon />
              View Source Code
            </button>
          )}

          <a className="repoworldpanel-cta repoworldpanel-cta--secondary" href={building.githubUrl} target="_blank" rel="noreferrer">
            View on GitHub
            <ExternalIcon />
          </a>
        </div>
      </aside>
    </>
  );
}


function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="repoworldpanel-stat">
      <span className="repoworldpanel-stat-value tabular">{value}</span>
      <span className="repoworldpanel-stat-label">{label}</span>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M4 9L9 4M9 4H5M9 4V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M4.5 4L1.5 7L4.5 10M9.5 4L12.5 7L9.5 10M8 2.5L6 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

