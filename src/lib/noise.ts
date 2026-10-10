import { rng } from "./math";

const fade = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smooth 3D value noise in [-1, 1], deterministic per seed. */
export function valueNoise3(seed: number) {
  const r = rng(seed);
  const perm = new Uint8Array(512);
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    perm[i] = i;
    vals[i] = r() * 2 - 1;
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = perm[i];
    perm[i] = perm[j];
    perm[j] = t;
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const v = (x: number, y: number, z: number) => vals[perm[(perm[(perm[x & 255] + y) & 511] + z) & 511]];
  return (x: number, y: number, z: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const xf = fade(x - xi);
    const yf = fade(y - yi);
    const zf = fade(z - zi);
    return mix(
      mix(mix(v(xi, yi, zi), v(xi + 1, yi, zi), xf), mix(v(xi, yi + 1, zi), v(xi + 1, yi + 1, zi), xf), yf),
      mix(
        mix(v(xi, yi, zi + 1), v(xi + 1, yi, zi + 1), xf),
        mix(v(xi, yi + 1, zi + 1), v(xi + 1, yi + 1, zi + 1), xf),
        yf,
      ),
      zf,
    );
  };
}

/** Fractal sum of `noise` with the given number of octaves. */
export function fbm3(noise: (x: number, y: number, z: number) => number, octaves = 5) {
  return (x: number, y: number, z: number) => {
    let a = 0.5;
    let s = 0;
    let f = 1;
    for (let i = 0; i < octaves; i++) {
      s += a * noise(x * f, y * f, z * f);
      f *= 2.03;
      a *= 0.5;
    }
    return s;
  };
}

/**
 * Tileable RGBA noise (256²) for shaders, so materials sample a texture
 * instead of evaluating procedural noise per pixel.
 *  R: fbm, low frequency   G: fbm, high frequency
 *  B: ridged noise         A: white noise
 */
export function generateNoiseData(size = 256): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  const r = rng(99);
  const grids = [4, 8, 16, 32, 64].map((n) => {
    const g = new Float32Array(n * n);
    for (let i = 0; i < g.length; i++) g[i] = r() * 2 - 1;
    return { n, g };
  });
  const sample = (lvl: number, u: number, v: number) => {
    const { n, g } = grids[lvl];
    const x = u * n;
    const y = v * n;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = fade(x - x0);
    const fy = fade(y - y0);
    const at = (i: number, j: number) => g[((j + n) % n) * n + ((i + n) % n)];
    return mix(mix(at(x0, y0), at(x0 + 1, y0), fx), mix(at(x0, y0 + 1), at(x0 + 1, y0 + 1), fx), fy);
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const low = sample(0, u, v) * 0.5 + sample(1, u, v) * 0.3 + sample(2, u, v) * 0.2;
      const high = sample(2, u, v) * 0.5 + sample(3, u, v) * 0.3 + sample(4, u, v) * 0.2;
      const ridge = 1 - Math.abs(sample(1, u, v) * 0.6 + sample(3, u, v) * 0.4);
      const i = (y * size + x) * 4;
      data[i] = Math.round((low * 0.5 + 0.5) * 255);
      data[i + 1] = Math.round((high * 0.5 + 0.5) * 255);
      data[i + 2] = Math.round(Math.min(1, Math.max(0, ridge)) * 255);
      data[i + 3] = Math.round(r() * 255);
    }
  }
  return data;
}
