"use client";

import * as THREE from "three";

const FONT = "IBM Plex Mono";

function fontFamily() {
  if (typeof window === "undefined") return `"${FONT}", monospace`;
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-plex-mono").trim();
  return v ? `${v}, monospace` : `"${FONT}", monospace`;
}

/** 10×10 atlas of the numbers 00–99, used for lattice / telemetry labels. */
export function createDigitAtlas(): THREE.CanvasTexture {
  const cell = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = cell * 10;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `500 30px ${fontFamily()}`;
  for (let i = 0; i < 100; i++) {
    const x = (i % 10) * cell + cell / 2;
    const y = Math.floor(i / 10) * cell + cell / 2;
    ctx.fillText(String(i).padStart(2, "0"), x, y);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Renders a project's name into a texture that is "frozen" inside its
 * crystal. Large display type with a framed monogram, like an embedded logo.
 */
export function createTitleTexture(title: string, index: number): THREE.CanvasTexture {
  const w = 1024;
  const h = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);

  // Framed monogram.
  const initials = title
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 34;
  const box = 520;
  const bx = (w - box) / 2;
  const by = 150;
  const r = 70;
  ctx.beginPath();
  ctx.moveTo(bx + r, by);
  ctx.arcTo(bx + box, by, bx + box, by + box, r);
  ctx.arcTo(bx + box, by + box, bx, by + box, r);
  ctx.arcTo(bx, by + box, bx, by, r);
  ctx.arcTo(bx, by, bx + box, by, r);
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const display = getComputedStyle(document.documentElement).getPropertyValue("--font-unbounded").trim();
  ctx.font = `800 250px ${display || fontFamily()}`;
  ctx.fillText(initials, w / 2, by + box / 2 + 10);

  ctx.font = `500 64px ${fontFamily()}`;
  let label = title.toUpperCase();
  while (ctx.measureText(label).width > w * 0.9 && label.length > 4) label = label.slice(0, -1);
  ctx.fillText(label, w / 2, by + box + 120);
  ctx.font = `400 40px ${fontFamily()}`;
  ctx.fillText(`DG_${String(index + 1).padStart(2, "0")}`, w / 2, by + box + 190);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Samples filled pixels of a glyph string to build particle targets. */
export function sampleGlyphPoints(text: string, count: number, depth = 0.6): Float32Array {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const display = getComputedStyle(document.documentElement).getPropertyValue("--font-unbounded").trim();
  let fs = 210;
  ctx.font = `800 ${fs}px ${display || fontFamily()}`;
  while (ctx.measureText(text).width > size * 0.88 && fs > 40) {
    fs -= 6;
    ctx.font = `800 ${fs}px ${display || fontFamily()}`;
  }
  ctx.fillText(text, size / 2, size / 2 + fs * 0.04);
  const data = ctx.getImageData(0, 0, size, size).data;
  const filled: number[] = [];
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      if (data[(y * size + x) * 4 + 3] > 128) filled.push(x, y);
    }
  }
  const out = new Float32Array(count * 3);
  const n = filled.length / 2;
  for (let i = 0; i < count; i++) {
    if (n === 0) break;
    const j = Math.floor(Math.random() * n);
    const x = filled[j * 2] + Math.random() * 2;
    const y = filled[j * 2 + 1] + Math.random() * 2;
    out[i * 3] = (x / size - 0.5) * 4.2;
    out[i * 3 + 1] = (0.5 - y / size) * 4.2;
    out[i * 3 + 2] = (Math.random() - 0.5) * depth * (0.6 + Math.random() * 0.4);
  }
  return out;
}
