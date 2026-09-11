import { useMemo, useState } from 'react';
import './Landing.css';

interface Props {
  onEnterDemo: () => void;
  onSignIn: () => void;
  onExploreUsername?: (username: string) => void;
}

interface Silhouette {
  x: number;
  w: number;
  h: number;
  color: string;
  windows: { x: number; y: number; delay: number }[];
}

function makeSkyline(seed: number): Silhouette[] {
  const colors = ['#4d7fb3', '#5a8f8a', '#c1694a', '#5fb0c9', '#8b6bb0', '#c25a6b'];
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const buildings: Silhouette[] = [];
  let x = 0;
  let i = 0;
  while (x < 1200) {
    const w = 46 + rand() * 60;
    const h = 60 + rand() * 170;
    const color = colors[i % colors.length];
    const windows: Silhouette['windows'] = [];
    const rows = Math.floor(h / 22);
    const cols = Math.floor(w / 18);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rand() > 0.45) continue;
        windows.push({ x: c * 18 + 7, y: r * 22 + 10, delay: rand() * 6 });
      }
    }
    buildings.push({ x, w, h, color, windows });
    x += w + 10 + rand() * 14;
    i++;
  }
  return buildings;
}

export function Landing({ onEnterDemo, onSignIn, onExploreUsername }: Props) {
  const skyline = useMemo(() => makeSkyline(42), []);
  const [usernameInput, setUsernameInput] = useState('');

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim() && onExploreUsername) {
      onExploreUsername(usernameInput.trim());
    }
  };

  return (
    <div className="landing">
      <div className="landing-skyline" aria-hidden="true">
        <svg viewBox="0 0 1200 260" preserveAspectRatio="xMidYMax slice">
          {skyline.map((b, i) => (
            <g key={i} transform={`translate(${b.x}, ${260 - b.h})`}>
              <rect width={b.w} height={b.h} fill={b.color} opacity={0.5} rx={3} />
              {b.windows.map((w, wi) => (
                <rect
                  key={wi}
                  x={w.x}
                  y={w.y}
                  width={4}
                  height={6}
                  rx={1}
                  fill="#f0d78a"
                  className="landing-window"
                  style={{ animationDelay: `${w.delay}s` }}
                />
              ))}
            </g>
          ))}
        </svg>
      </div>

      <div className="landing-content">
        <span className="landing-eyebrow">GitWorld</span>
        <h1 className="landing-title">Explore the shape of your code.</h1>
        <p className="landing-sub">
          Your repositories become buildings, your contributors become people walking between
          them, and your dependencies become the roads that connect it all. Watch
          your GitHub account turn into a place.
        </p>

        {onExploreUsername && (
          <form className="landing-lookup" onSubmit={handleLookup}>
            <input
              type="text"
              className="landing-lookup-input"
              placeholder="Enter GitHub username (e.g. torvalds, octocat)"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              aria-label="GitHub username"
            />
            <button type="submit" className="landing-lookup-btn">
              Explore
            </button>
          </form>
        )}

        <div className="landing-divider">or connect your account</div>

        <div className="landing-actions">
          <button className="landing-cta" onClick={onSignIn}>
            Sign in with GitHub
          </button>
          <button className="landing-secondary" onClick={onEnterDemo}>
            Try demo city
          </button>
        </div>

        <p className="landing-trust">
          Read-only access. We only look at repository metadata — private repositories are
          included only if you explicitly opt in during sign-in.
        </p>
      </div>
    </div>
  );
}
