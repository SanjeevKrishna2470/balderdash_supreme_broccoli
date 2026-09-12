import { useState, useEffect } from 'react';
import './ControlsHint.css';

interface Props {
  interactionLabel: string | null;
  onTriggerInteraction?: () => void;
  onRecenter?: () => void;
  viewMode: '3d' | '2d';
}

export function ControlsHint({
  interactionLabel,
  onTriggerInteraction,
  onRecenter,
  viewMode,
}: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
        setHasMoved(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="controls-hint-container" role="region" aria-label="Controls and Actions">
      {/* 1. Proximity Action Prompt (high priority when near an object) */}
      {interactionLabel && (
        <button
          type="button"
          className="controls-interaction-prompt"
          onClick={onTriggerInteraction}
          title="Press E or click to interact"
        >
          <kbd className="controls-kbd-action">E</kbd>
          <span className="controls-action-text">{interactionLabel}</span>
          <span className="controls-action-arrow">&rarr;</span>
        </button>
      )}

      {/* 2. Movement & Navigation Hint (calm, subtle, collapsible) */}
      {!dismissed && (
        <div className={`controls-hint-bar ${hasMoved ? 'controls-hint-bar--compact' : ''}`}>
          <div className="controls-hint-keys">
            <span className="controls-group">
              <kbd className="controls-kbd">W</kbd>
              <kbd className="controls-kbd">A</kbd>
              <kbd className="controls-kbd">S</kbd>
              <kbd className="controls-kbd">D</kbd>
              <span className="controls-label">Move</span>
            </span>

            <span className="controls-sep">&bull;</span>

            <span className="controls-group">
              <span className="controls-label">Click ground</span>
              <span className="controls-sublabel">Navigate</span>
            </span>

            {viewMode === '3d' && onRecenter && (
              <>
                <span className="controls-sep">&bull;</span>
                <button
                  type="button"
                  className="controls-recenter-btn"
                  onClick={onRecenter}
                  title="Recenter camera on player"
                >
                  <kbd className="controls-kbd">Space</kbd>
                  <span>Recenter</span>
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            className="controls-hint-dismiss"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss controls hint"
            title="Dismiss hint"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
