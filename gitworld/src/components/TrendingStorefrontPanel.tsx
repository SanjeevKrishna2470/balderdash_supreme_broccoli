import { useMultiplayerStore } from '../state/useMultiplayerStore';
import './TrendingStorefrontPanel.css';

interface Props {
  onEnterRepo?: (repoFullName: string) => void;
}

export function TrendingStorefrontPanel({ onEnterRepo }: Props) {
  const selectedStorefront = useMultiplayerStore((s) => s.selectedStorefront);
  const selectStorefront = useMultiplayerStore((s) => s.selectStorefront);

  if (!selectedStorefront) return null;

  const { manifest } = selectedStorefront;

  return (
    <div className="storefront-backdrop" onClick={() => selectStorefront(null)}>
      <div
        className="storefront-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Trending Repository: ${manifest.fullName}`}
      >
        {/* Top Header & Rank Badge */}
        <div className="storefront-header">
          <div className="storefront-rank-badge">
            #{manifest.rank} TRENDING
          </div>
          <button
            type="button"
            className="storefront-close-btn"
            onClick={() => selectStorefront(null)}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {/* Title and Category */}
        <div className="storefront-title-row">
          <h2 className="storefront-repo-name">{manifest.fullName}</h2>
          <span className="storefront-category-pill">{manifest.category}</span>
        </div>

        {/* Description */}
        <p className="storefront-desc">{manifest.description}</p>

        {/* Stats Grid */}
        <div className="storefront-stats-grid">
          <div className="storefront-stat-card">
            <span className="storefront-stat-label">Stars</span>
            <span className="storefront-stat-val">★ {(manifest.stars / 1000).toFixed(1)}k</span>
          </div>
          <div className="storefront-stat-card">
            <span className="storefront-stat-label">Today</span>
            <span className="storefront-stat-val storefront-stat-val--hot">+{manifest.starsToday ?? 120}</span>
          </div>
          <div className="storefront-stat-card">
            <span className="storefront-stat-label">Language</span>
            <span className="storefront-stat-val">{manifest.primaryLanguage}</span>
          </div>
          <div className="storefront-stat-card">
            <span className="storefront-stat-label">Forks</span>
            <span className="storefront-stat-val">{manifest.forks}</span>
          </div>
        </div>

        {/* Why It's Trending Editorial Callout */}
        <div className="storefront-why-trending">
          <div className="storefront-why-title">WHY IT'S TRENDING</div>
          <div className="storefront-why-text">{manifest.trendReasonText}</div>
        </div>

        {/* Action Buttons */}
        <div className="storefront-actions">
          <a
            href={manifest.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="storefront-action-btn storefront-action-btn--secondary"
          >
            View on GitHub &nearr;
          </a>

          <button
            type="button"
            className="storefront-action-btn storefront-action-btn--primary"
            onClick={() => {
              selectStorefront(null);
              onEnterRepo?.(manifest.fullName);
            }}
          >
            Enter Repo World &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
