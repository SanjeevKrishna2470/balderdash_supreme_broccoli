/**
 * Deterministic pseudo-random number generation.
 * The same seed must always produce the same sequence, on every
 * machine and every reload — this is what lets a user's city stay
 * in the same place across sessions.
 */

/** Hash an arbitrary string (e.g. a repo id or login) into a 32-bit seed. */
export function hashSeed(input: string | number): number {
  const str = String(input);
  let h = 2166136261; // FNV-1a offset basis
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, good-enough statistical quality for layout. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Create a seeded rand() function directly from any identifier. */
export function seededRandom(input: string | number): () => number {
  return mulberry32(hashSeed(input));
}

/** Deterministic float in [min, max). */
export function randRange(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min);
}

/** Deterministic integer in [min, max]. */
export function randInt(rand: () => number, min: number, max: number): number {
  return Math.floor(randRange(rand, min, max + 1));
}

/** Deterministic pick from a list. */
export function randPick<T>(rand: () => number, list: T[]): T {
  return list[Math.floor(rand() * list.length) % list.length];
}
