// Deterministic PRNG so mock data is stable across requests/reloads without
// a database. Swap this whole `data/` directory for real API/DB calls later
// (see lib/fpl/adapter.ts) — nothing outside this folder depends on how the
// numbers were produced.

export function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

export function seededRandomInRange(rng: () => number, min: number, max: number) {
  return min + rng() * (max - min);
}

export function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
