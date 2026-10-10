# DG Portfolio V3

Diya Gupta's portfolio — a scroll-driven WebGL experience (Next.js 16, React 19, Three.js / React Three Fiber, GSAP, custom GLSL).

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
npm run lint
```

Append `?nowebgl` to any URL to preview the accessible no-WebGL fallback.

## Structure

```
src/content/            ← all copy and data (see CONTENT_GUIDE.md)
src/app/                ← routes: / and /projects/[slug] (statically generated), 404
src/components/site/    ← DOM layer: HUD, project callouts, overlay, carousel, chrome
src/components/ui/      ← Decode (character-shift text reveal), Reveal
src/components/experience/
  Scene.tsx             ← Canvas, intro timeline, shader pre-compilation
  CameraRig.tsx         ← applies choreography.ts to the camera, publishes FX intensities
  choreography.ts       ← pure camera poses per scene (enter / scroll / exit)
  PostFX.tsx            ← bloom + chroma, radial blur, fog-cut wipe, grade, grain
  intro/ work/ about/ contact/  ← the four scenes
src/lib/                ← store (live + UI state), scroll driver, audio synth, noise
src/shaders/chunks.ts   ← shared GLSL (palette, fog, texture noise)
```

### How it fits together

- The root layout mounts one persistent canvas plus the semantic page (`HomeSections`). Project routes render only an overlay, so the scene never reloads.
- `lib/driver.ts` turns native scroll into smoothed per-section progress. The page scrolls normally, so keyboard, touch and assistive tech work as usual.
- Scenes live at separate world origins. Moving between them happens under a full-screen fog wipe, the same cut technique as the reference.
- All HUD text is real DOM. `Decode` animates a visual copy while the real text stays available to screen readers.
- Sound is synthesised with Web Audio. It's off by default and starts only from the Sound toggle.
- Quality adapts at runtime: the pixel ratio steps down when frames get slow. Constrained devices get lighter geometry, and `prefers-reduced-motion` disables the intro flight, decode and transition effects.
