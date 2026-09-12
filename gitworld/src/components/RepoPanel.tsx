import { useState, useEffect } from 'react';
import type { CityBuilding } from '../world/cityTypes';
import './RepoPanel.css';

interface Props {
  building: CityBuilding | null;
  onClose: () => void;
  onEnter: (building: CityBuilding) => void;
  onBrowseCode?: (building: CityBuilding) => void;
}

const ACTIVITY_LABEL: Record<string, string> = {
  active: 'Active — pushed within the last 30 days',
  quiet: 'Quiet — pushed within the last 6 months',
  dormant: 'Dormant — untouched for a while',
};

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  return `${Math.round(days / 365)} years ago`;
}

export function RepoPanel({ building, onClose, onEnter, onBrowseCode }: Props) {
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (!building) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [building, onClose]);

  if (!building) return null;
  const repo = building.repo;
  const owner = repo.fullName.split('/')[0];
  const profile = building.visualProfile;

  return (
    <>
      <div className="repopanel-scrim" onClick={onClose} />
      <aside className="repopanel" key={building.id} role="dialog" aria-label={`${repo.name} details`}>
        <button className="repopanel-close" onClick={onClose} aria-label="Close panel">
          <CloseIcon />
        </button>

        {/* 1. Repository identity and plain-language activity state */}
        <div className="repopanel-header" style={{ background: building.style.primary }}>
          <span className="repopanel-owner">{owner}</span>
          <h2 className="repopanel-name">{repo.name}</h2>
          <span className={`repopanel-activity repopanel-activity--${building.activity}`}>
            <span className="repopanel-dot" />
            {ACTIVITY_LABEL[building.activity]}
          </span>
        </div>

        <div className="repopanel-body">
          {/* 2. Description and project type */}
          {repo.description && <p className="repopanel-desc">{repo.description}</p>}

          <div className="repopanel-meta">
            <span className="repopanel-lang">
              <span className="repopanel-lang-dot" style={{ background: building.style.primary }} />
              {repo.primaryLanguage || 'Unknown'}
            </span>
            {profile && (
              <>
                <span className="repopanel-sep">&middot;</span>
                <span className="repopanel-type-badge">{profile.projectType}</span>
              </>
            )}
            <span className="repopanel-sep">&middot;</span>
            <span>Last activity {timeAgo(repo.lastPushedAt)}</span>
          </div>

          {/* 3. Visual summary / Traceable building profile inspector */}
          {profile && (
            <div className="repopanel-visual-profile">
              <button
                type="button"
                className="repopanel-profile-toggle"
                onClick={() => setShowProfile(!showProfile)}
                aria-expanded={showProfile}
              >
                <span>Why does this building look this way?</span>
                <span className={`repopanel-profile-chevron ${showProfile ? 'open' : ''}`}>▼</span>
              </button>

              {showProfile && (
                <div className="repopanel-profile-content">
                  <div className="repopanel-profile-row">
                    <span className="repopanel-profile-label">Architectural Tier</span>
                    <span className="repopanel-profile-val">{profile.tier.toUpperCase()} ({profile.tierReason})</span>
                  </div>
                  <div className="repopanel-profile-row">
                    <span className="repopanel-profile-label">Roof &amp; Motif</span>
                    <span className="repopanel-profile-val">{profile.architecturalMotif} crown &bull; {profile.massingGrammar.replace('_', ' ')}</span>
                  </div>
                  <div className="repopanel-profile-row">
                    <span className="repopanel-profile-label">Ecological Aging</span>
                    <span className="repopanel-profile-val">{profile.ecologicalAgeDescription}</span>
                  </div>
                  {profile.signalsSummary && profile.signalsSummary.length > 0 && (
                    <ul className="repopanel-profile-signals">
                      {profile.signalsSummary.map((sig, idx) => (
                        <li key={idx}>{sig}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4. Essential facts: stars, forks, contributors, issues, PRs */}
          <div className="repopanel-stats">
            <Stat label="Stars" value={repo.stars} />
            <Stat label="Forks" value={repo.forks} />
            <Stat label="Open issues" value={repo.openIssues} />
            {repo.openPullRequests !== undefined && <Stat label="Open PRs" value={repo.openPullRequests} />}
          </div>

          {building.contributorCount > 0 && (
            <p className="repopanel-contributors">
              {building.contributorCount === 1
                ? '1 contributor walking nearby'
                : `${building.contributorCount} contributors walking nearby`}
            </p>
          )}

          {building.hasConstruction && (
            <p className="repopanel-flag repopanel-flag--build">Under construction — open pull requests</p>
          )}
          {repo.openIssues > 0 && (
            <p className="repopanel-flag repopanel-flag--issue">
              {repo.openIssues} open {repo.openIssues === 1 ? 'issue' : 'issues'} marked on the building
            </p>
          )}

          {/* 5. Clear primary action & secondary actions */}
          <button className="repopanel-cta" onClick={() => onEnter(building)}>
            Explore repository interior
            <EnterIcon />
          </button>

          {onBrowseCode && (
            <button className="repopanel-cta repopanel-cta--secondary" onClick={() => onBrowseCode(building)}>
              Browse &amp; View Code
              <CodeIcon />
            </button>
          )}

          <a className="repopanel-cta repopanel-cta--secondary" href={repo.htmlUrl} target="_blank" rel="noreferrer">
            Open on GitHub
            <ExternalIcon />
          </a>
        </div>
      </aside>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="repopanel-stat">
      <span className="repopanel-stat-value tabular">{value}</span>
      <span className="repopanel-stat-label">{label}</span>
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

function EnterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 7H10M10 7L6.5 3.5M10 7L6.5 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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
