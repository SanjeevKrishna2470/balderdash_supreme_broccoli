import type { QualityPreset } from '../world/cityTypes';
import { useWorldStore } from '../state/useWorldStore';
import './SettingsModal.css';

interface Props {
  onClose: () => void;
}

export function SettingsModal({ onClose }: Props) {
  const viewMode = useWorldStore((s) => s.viewMode);
  const setViewMode = useWorldStore((s) => s.setViewMode);
  const qualityPreset = useWorldStore((s) => s.qualityPreset);
  const setQualityPreset = useWorldStore((s) => s.setQualityPreset);
  const reducedMotion = useWorldStore((s) => s.reducedMotion);
  const setReducedMotion = useWorldStore((s) => s.setReducedMotion);
  const reducedEffects = useWorldStore((s) => s.reducedEffects);
  const setReducedEffects = useWorldStore((s) => s.setReducedEffects);

  return (
    <div className="settings-scrim" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="City View Settings">
        <div className="settings-header">
          <h2 className="settings-title">City &amp; Graphics Settings</h2>
          <button className="settings-close" onClick={onClose} aria-label="Close settings">
            &times;
          </button>
        </div>

        <div className="settings-body">
          {/* View Mode */}
          <div className="settings-group">
            <label className="settings-label">Projection Mode</label>
            <div className="settings-segmented">
              <button
                className={`settings-seg-btn ${viewMode === '3d' ? 'active' : ''}`}
                onClick={() => setViewMode('3d')}
              >
                3D Explore Mode
              </button>
              <button
                className={`settings-seg-btn ${viewMode === '2d' ? 'active' : ''}`}
                onClick={() => setViewMode('2d')}
              >
                2D Map Mode
              </button>
            </div>
          </div>

          {/* Graphics Quality */}
          <div className="settings-group">
            <label className="settings-label">Graphics Quality</label>
            <div className="settings-segmented">
              {(['high', 'balanced', 'performance'] as QualityPreset[]).map((q) => (
                <button
                  key={q}
                  className={`settings-seg-btn ${qualityPreset === q ? 'active' : ''}`}
                  onClick={() => setQualityPreset(q)}
                >
                  {q.charAt(0).toUpperCase() + q.slice(1)}
                </button>
              ))}
            </div>
            <p className="settings-hint">
              {qualityPreset === 'high' && 'Full soft shadows, high foliage instance counts, and rich lighting.'}
              {qualityPreset === 'balanced' && 'Optimized shadows, balanced environmental density, steady 60 FPS.'}
              {qualityPreset === 'performance' && 'No shadows, essential foliage only, maximized for modest laptops.'}
            </p>
          </div>

          {/* Accessibility & Motion */}
          <div className="settings-group">
            <label className="settings-label">Comfort &amp; Accessibility</label>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
              />
              <span>Reduced motion (instant camera cuts, static lights)</span>
            </label>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={reducedEffects}
                onChange={(e) => setReducedEffects(e.target.checked)}
              />
              <span>Reduced visual effects (subdued glows &amp; pulses)</span>
            </label>
          </div>
        </div>

        <div className="settings-footer">
          <button className="settings-btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
