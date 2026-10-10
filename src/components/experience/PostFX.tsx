"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { live } from "@/lib/store";
import { TEXNOISE } from "@/shaders/chunks";
import { COLORS, shared } from "./shared";

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uChroma: { value: 0 },
    uRadial: { value: 0 },
    uFog: { value: 0 },
    uFogColor: { value: COLORS.fog.clone() },
    uDim: { value: 0 },
    uNoise: shared.uNoise,
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    ${TEXNOISE}
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uRes;
    uniform float uChroma;
    uniform float uRadial;
    uniform float uFog;
    uniform vec3 uFogColor;
    uniform float uDim;
    varying vec2 vUv;

    vec3 aces(vec3 x){
      const float a = 2.51; const float b = 0.03; const float c = 2.43; const float d = 0.59; const float e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }
    vec3 toSRGB(vec3 c){
      return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
    }

    void main(){
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float len = length(c);

      // Chromatic aberration grows toward the edges, plus a horizontal
      // smear when transitions are at full intensity.
      vec2 dir = c * (0.012 + len * 0.03) * uChroma;
      dir.x += uChroma * uChroma * 0.004 * (nz(vec2(uv.y * 3.0, uTime * 0.7)).g * 2.0 - 1.0);

      vec3 col = vec3(0.0);
      float total = 0.0;
      const int STEPS = 10;
      for (int i = 0; i < STEPS; i++){
        float k = float(i) / float(STEPS - 1);
        float s = 1.0 - k * uRadial * 0.09;
        vec2 suv = 0.5 + c * s;
        float w = 1.0 - k * 0.5;
        col.r += texture2D(tDiffuse, suv + dir).r * w;
        col.g += texture2D(tDiffuse, suv).g * w;
        col.b += texture2D(tDiffuse, suv - dir).b * w;
        total += w;
        if (uRadial < 0.001) break;
      }
      col /= total;

      // Fog wipe used to hide scene cuts.
      float mist = uFog > 0.001 ? nfbm(uv * vec2(uRes.x / uRes.y, 1.0) * 0.35 + uTime * 0.02) * 0.5 + 0.5 : 0.5;
      float cover = smoothstep(0.0, 1.0, uFog * 1.7 - (1.0 - mist) * 0.7);
      vec3 fogCol = uFogColor * (1.4 + mist * 1.6) + vec3(0.03, 0.012, 0.012) * mist;
      col = mix(col, fogCol, cover);

      col *= 1.0 - uDim;

      // Grade: ACES, keep blacks in the identity's warm ink.
      col = aces(col * 1.15);
      col = toSRGB(col);
      col = max(col, vec3(0.039, 0.012, 0.012) * (1.0 - len));

      // Vignette + grain.
      col *= 1.0 - smoothstep(0.35, 0.95, len) * 0.55;
      float g = hash12(gl_FragCoord.xy + fract(uTime * 13.7) * 100.0) - 0.5;
      col += g * 0.035;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function PostFX() {
  const { gl, scene, camera, size, viewport } = useThree();

  const { composer, final, bloom } = useMemo(() => {
    const composer = new EffectComposer(gl);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 0.85, 0.6, 0.85);
    composer.addPass(bloom);
    const final = new ShaderPass(FinalShader);
    composer.addPass(final);
    return { composer, final, bloom };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);

  useEffect(() => {
    composer.setPixelRatio(viewport.dpr);
    composer.setSize(size.width, size.height);
    final.uniforms.uRes.value.set(size.width, size.height);
  }, [composer, final, size, viewport.dpr]);

  useEffect(
    () => () => {
      bloom.dispose();
      final.dispose();
      composer.dispose();
    },
    [composer, bloom, final],
  );

  useFrame((_, delta) => {
    const u = final.uniforms;
    u.uTime.value += delta;
    u.uChroma.value = live.fx.chroma;
    u.uRadial.value = live.fx.radial;
    u.uFog.value = Math.max(live.fx.fog, live.fx.flash);
    u.uDim.value = live.project.t * 0.35;
    bloom.strength = 0.85 + live.project.t * 0.4;
    composer.render(delta);
  }, 1);

  return null;
}
