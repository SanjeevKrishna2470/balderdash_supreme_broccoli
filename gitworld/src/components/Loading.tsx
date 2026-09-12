import { useEffect, useState } from 'react';
import './Loading.css';

interface Props {
  slow?: boolean;
}

const PHRASES = [
  'Preparing your districts',
  'Constructing repository landmarks',
  'Lighting active projects',
  'Connecting dependencies',
  'Cultivating ecological surroundings',
];

export function Loading({ slow }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => Math.min(s + 1, PHRASES.length - 1));
    }, 650);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="loading">
      <div className="loading-city" aria-hidden="true">
        {Array.from({ length: 7 }).map((_, i) => (
          <span
            key={i}
            className="loading-block"
            style={{
              animationDelay: `${i * 90}ms`,
              height: 18 + ((i * 37) % 56),
              opacity: i <= step * 1.6 ? 1 : 0.15,
            }}
          />
        ))}
      </div>

      <p className="loading-phrase">{PHRASES[step]}&hellip;</p>

      <div className="loading-bar">
        <div className="loading-bar-fill" style={{ width: `${((step + 1) / PHRASES.length) * 100}%` }} />
      </div>

      {slow && <p className="loading-slow">GitHub is taking a little longer than usual to respond.</p>}
    </div>
  );
}
