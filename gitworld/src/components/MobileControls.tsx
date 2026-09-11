import { useRef } from 'react';
import './MobileControls.css';

interface Props {
  onMove: (dx: number, dy: number) => void;
}

const DIRS: Array<{ key: string; dx: number; dy: number; label: string }> = [
  { key: 'up', dx: 0, dy: -1, label: 'Move up' },
  { key: 'left', dx: -1, dy: 0, label: 'Move left' },
  { key: 'down', dx: 0, dy: 1, label: 'Move down' },
  { key: 'right', dx: 1, dy: 0, label: 'Move right' },
];

export function MobileControls({ onMove }: Props) {
  const intervalRef = useRef<number | null>(null);

  const start = (dx: number, dy: number) => {
    onMove(dx, dy);
    intervalRef.current = window.setInterval(() => onMove(dx, dy), 16);
  };
  const stop = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return (
    <div className="mobile-controls" aria-hidden={false}>
      <div className="mobile-pad">
        {DIRS.map((d) => (
          <button
            key={d.key}
            className={`mobile-pad-btn mobile-pad-btn--${d.key}`}
            aria-label={d.label}
            onPointerDown={(e) => {
              e.preventDefault();
              start(d.dx, d.dy);
            }}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
          >
            <Arrow dir={d.key} />
          </button>
        ))}
      </div>
    </div>
  );
}

function Arrow({ dir }: { dir: string }) {
  const rotation = { up: 0, right: 90, down: 180, left: 270 }[dir] ?? 0;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" style={{ transform: `rotate(${rotation}deg)` }}>
      <path d="M8 2L13 12H3L8 2Z" fill="currentColor" />
    </svg>
  );
}
