import type { CityWorldModel } from '../world/cityTypes';
import type { DataSource } from '../state/useWorldStore';
import './TopBar.css';

interface Props {
  user: CityWorldModel['user'];
  source: DataSource;
  hoveredName: string | null;
  legendOpen: boolean;
  onToggleLegend: () => void;
  onOpenSearch: () => void;
  onOpenCreateRepo?: () => void;
  onLogout?: () => void;
  onEnablePrivate?: () => void;
}

export function TopBar({
  user,
  source,
  hoveredName,
  legendOpen,
  onToggleLegend,
  onOpenSearch,
  onOpenCreateRepo,
  onLogout,
  onEnablePrivate,
}: Props) {
  return (
    <div className="topbar">
      <div className="topbar-row">
        <div className="topbar-brand">
          <span className="topbar-wordmark">GitWorld</span>
          {source === 'demo' && <span className="topbar-badge">Demo city</span>}
        </div>

        {hoveredName && <span className="topbar-hovered">{hoveredName}</span>}

        <div className="topbar-actions">
          {onOpenCreateRepo && (
            <button
              className="topbar-btn topbar-btn--create"
              onClick={onOpenCreateRepo}
              title="Break ground on a new repository in construction works"
            >
              <PlusIcon />
              <span className="topbar-btn-label">Break ground</span>
            </button>
          )}

          <button className="topbar-btn" onClick={onOpenSearch} aria-label="Search repositories">
            <SearchIcon />
            <span className="topbar-btn-label">Search</span>
            <kbd className="topbar-kbd">/</kbd>
          </button>

          <button
            className="topbar-btn topbar-btn-icon"
            onClick={onToggleLegend}
            aria-label="Toggle world key"
            aria-pressed={legendOpen}
          >
            <KeyIcon />
          </button>

          <a className="topbar-identity" href={user.htmlUrl} target="_blank" rel="noreferrer">
            <img src={user.avatarUrl} alt="" className="topbar-avatar" />
            <span className="topbar-name">{user.displayName}</span>
          </a>

          {onEnablePrivate && source === 'live' && (
            <button className="topbar-btn" onClick={onEnablePrivate} title="Allow GitWorld to include private repositories">
              Private repos
            </button>
          )}

          {onLogout && (
            <button className="topbar-btn topbar-btn--logout" onClick={onLogout} title="Log out / Leave realm">
              <LogoutIcon />
              <span className="topbar-btn-label">Logout</span>
            </button>
          )}
        </div>
      </div>


      {legendOpen && (
        <div className="topbar-legend">
          <h3 className="topbar-legend-title">World key</h3>
          <ul className="topbar-legend-list">
            <li>
              <span className="legend-swatch legend-swatch--active" /> Active — pushed within 30 days
            </li>
            <li>
              <span className="legend-swatch legend-swatch--quiet" /> Quiet — pushed within 6 months
            </li>
            <li>
              <span className="legend-swatch legend-swatch--dormant" /> Dormant — untouched longer
            </li>
            <li>
              <span className="legend-swatch legend-swatch--tower" /> Height &amp; size scale with stars
            </li>
            <li>
              <span className="legend-swatch legend-swatch--road" /> Roads connect related repositories
            </li>
            <li>
              <span className="legend-swatch legend-swatch--flag" /> Flags mark open issues
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="4.5" cy="10.5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.5 8.5L12.5 2.5M12.5 2.5H9.5M12.5 2.5V5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
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

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
