import { useEffect, useMemo, useRef, useState } from 'react';
import type { CityBuilding } from '../world/cityTypes';
import './SearchOverlay.css';

interface Props {
  buildings: CityBuilding[];
  onClose: () => void;
  onSelect: (id: string) => void;
}

export function SearchOverlay({ buildings, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return buildings.slice().sort((a, b) => b.repo.stars - a.repo.stars).slice(0, 8);
    }
    return buildings
      .filter((b) => b.repo.name.toLowerCase().includes(q) || b.repo.fullName.toLowerCase().includes(q))
      .sort((a, b) => b.repo.stars - a.repo.stars)
      .slice(0, 8);
  }, [buildings, query]);

  useEffect(() => setActiveIndex(0), [query]);

  const commit = (id: string) => {
    onSelect(id);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[activeIndex];
      if (target) commit(target.id);
    }
  };

  return (
    <div className="search-scrim" onClick={onClose}>
      <div className="search-panel" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-row">
          <SearchIcon />
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Search your repositories&hellip;"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Search repositories"
          />
          <kbd className="search-esc">Esc</kbd>
        </div>

        {results.length === 0 ? (
          <div className="search-empty">
            <p>No repositories match &ldquo;{query}&rdquo;.</p>
            <span>Try a different name, or check the district it might live in.</span>
          </div>
        ) : (
          <ul className="search-results" role="listbox">
            {results.map((b, i) => (
              <li key={b.id}>
                <button
                  className={`search-result ${i === activeIndex ? 'search-result--active' : ''}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => commit(b.id)}
                  role="option"
                  aria-selected={i === activeIndex}
                >
                  <span className="search-result-swatch" style={{ background: b.style.primary }} />
                  <span className="search-result-text">
                    <span className="search-result-name">{b.repo.name}</span>
                    <span className="search-result-owner">{b.repo.fullName.split('/')[0]}</span>
                  </span>
                  <span className={`search-result-activity search-result-activity--${b.activity}`} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
