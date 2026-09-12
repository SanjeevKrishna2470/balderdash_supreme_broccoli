import { useEffect, useMemo, useState } from 'react';
import { fetchPublicWorldManifests, type PublicWorldManifest } from '../world/api';
import './OpenSourceRealm.css';

interface Props {
  onExplore: (ownerHandle: string) => void;
}

const activityLabel: Record<PublicWorldManifest['activityState'], string> = {
  active: 'Active district',
  quiet: 'Quiet district',
  dormant: 'Dormant district',
};

export function OpenSourceRealm({ onExplore }: Props) {
  const [manifests, setManifests] = useState<PublicWorldManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchPublicWorldManifests()
      .then((items) => mounted && setManifests(items))
      .catch(() => mounted && setError(true))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const visible = useMemo(() => (expanded ? manifests : manifests.slice(0, 3)), [expanded, manifests]);

  return (
    <section className="open-realm" aria-labelledby="open-realm-title">
      <div className="open-realm-heading">
        <div>
          <p className="open-realm-kicker">Community atlas</p>
          <h2 id="open-realm-title">Open Source Realm</h2>
          <p className="open-realm-description">
            Walk through public projects shaped into districts, landmarks, and living software neighborhoods.
          </p>
        </div>
        <span className="open-realm-mark" aria-hidden="true">◎</span>
      </div>

      {loading && (
        <div className="open-realm-state" role="status">
          <span className="open-realm-pulse" /> Surveying the public districts…
        </div>
      )}

      {!loading && error && (
        <div className="open-realm-state open-realm-state--error">
          The atlas is temporarily quiet. Try exploring a GitHub username above.
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="open-realm-grid">
            {visible.map((manifest) => (
              <button
                type="button"
                className="open-realm-card"
                key={manifest.worldId}
                onClick={() => onExplore(manifest.ownerHandle)}
                aria-label={`Explore ${manifest.displayName} by ${manifest.ownerHandle}`}
              >
                <span className="open-realm-card-topline">
                  <span className="open-realm-region">{manifest.regionName || manifest.regionId}</span>
                  <span className={`open-realm-status open-realm-status--${manifest.activityState}`}>
                    {activityLabel[manifest.activityState]}
                  </span>
                </span>
                <span className="open-realm-card-title">{manifest.displayName}</span>
                <span className="open-realm-card-repo">{manifest.ownerHandle}/{manifest.repositoryName}</span>
                <span className="open-realm-card-description">{manifest.description}</span>
                <span className="open-realm-card-meta">
                  <span>{manifest.primaryLanguage || 'Mixed'} · {formatCount(manifest.stars)} stars</span>
                  <span className="open-realm-enter">Enter realm <span aria-hidden="true">→</span></span>
                </span>
              </button>
            ))}
          </div>
          {manifests.length > 3 && (
            <button type="button" className="open-realm-more" onClick={() => setExpanded((value) => !value)}>
              {expanded ? 'Show featured districts' : `Browse all ${manifests.length} districts`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function formatCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return String(value);
}

export default OpenSourceRealm;

