export interface LanguageStyle {
  primary: string;
  secondary: string;
  glow: string;
  motif: 'peak' | 'block' | 'spire' | 'dome' | 'terrace' | 'silo' | 'lattice';
}

const STYLES: Record<string, LanguageStyle> = {
  TypeScript: { primary: '#4d7fb3', secondary: '#385f8a', glow: '#8fb8e6', motif: 'spire' },
  JavaScript: { primary: '#d9b35a', secondary: '#a9873c', glow: '#f0d78a', motif: 'block' },
  Python: { primary: '#5a8f8a', secondary: '#3f6864', glow: '#8fc4bd', motif: 'dome' },
  Go: { primary: '#5fb0c9', secondary: '#3f8397', glow: '#9adcef', motif: 'silo' },
  Rust: { primary: '#c1694a', secondary: '#914e36', glow: '#e79671', motif: 'peak' },
  Java: { primary: '#b3763f', secondary: '#84582d', glow: '#dba668', motif: 'block' },
  'C++': { primary: '#8b6bb0', secondary: '#654e84', glow: '#b79bd9', motif: 'lattice' },
  C: { primary: '#7d8bad', secondary: '#5b667f', glow: '#aab6d4', motif: 'block' },
  Ruby: { primary: '#c25a6b', secondary: '#8f3f4d', glow: '#e2909e', motif: 'dome' },
  Swift: { primary: '#c2734f', secondary: '#8f5238', glow: '#e6a37d', motif: 'terrace' },
  Kotlin: { primary: '#9068ad', secondary: '#684a7f', glow: '#bd9adf', motif: 'peak' },
  PHP: { primary: '#7b83b8', secondary: '#575e8a', glow: '#a7aede', motif: 'block' },
  HTML: { primary: '#b96a4c', secondary: '#894c37', glow: '#dd9a7d', motif: 'terrace' },
  CSS: { primary: '#6c93c4', secondary: '#4c6c96', glow: '#a0c1ea', motif: 'terrace' },
  Shell: { primary: '#6f9c72', secondary: '#4f7452', glow: '#a1c9a3', motif: 'silo' },
  Vue: { primary: '#66a687', secondary: '#477a61', glow: '#9cd0b4', motif: 'dome' },
};

const FALLBACK: LanguageStyle = {
  primary: '#8b87a8',
  secondary: '#63607e',
  glow: '#b6b3cf',
  motif: 'block',
};

export function getLanguageStyle(language: string | undefined | null): LanguageStyle {
  if (!language) return FALLBACK;
  return STYLES[language] ?? FALLBACK;
}
