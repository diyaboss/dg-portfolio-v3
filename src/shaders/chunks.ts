/**
 * Shared GLSL. All scene materials are custom ShaderMaterials that output
 * linear HDR colour; tone mapping, grading and sRGB encoding happen once in
 * the final post-processing pass.
 */

export const NOISE = /* glsl */ `
// Simplex 3D noise — Ashima Arts / Stefan Gustavson (MIT).
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){
  float a=0.5; float s=0.0;
  for(int i=0;i<5;i++){ s+=a*snoise(p); p*=2.03; a*=0.5; }
  return s;
}
float hash12(vec2 p){
  vec3 p3=fract(vec3(p.xyx)*0.1031);
  p3+=dot(p3,p3.yzx+33.33);
  return fract((p3.x+p3.y)*p3.z);
}
`;

/**
 * Palette in linear space. Derived from #0A0303 / #D41C1C / #F2ECE9 and the
 * secondary wine / plum / mauve tones of the original identity.
 */
export const PALETTE = /* glsl */ `
const vec3 C_INK    = vec3(0.0030, 0.0010, 0.0010);
const vec3 C_FOG    = vec3(0.0230, 0.0068, 0.0072);
const vec3 C_ASH    = vec3(0.115, 0.082, 0.080);
const vec3 C_BONE   = vec3(0.888, 0.838, 0.815);
const vec3 C_EMBER  = vec3(0.658, 0.011, 0.011);
const vec3 C_HOT    = vec3(1.000, 0.069, 0.046);
const vec3 C_WINE   = vec3(0.258, 0.006, 0.020);
const vec3 C_MAUVE  = vec3(0.651, 0.479, 0.651);
`;

/**
 * Cheap noise from the shared tileable texture (see lib/noise.ts):
 * R low-freq fbm, G high-freq fbm, B ridged, A white noise.
 */
export const TEXNOISE = /* glsl */ `
uniform sampler2D uNoise;
vec4 nz(vec2 p){ return texture2D(uNoise, p); }
// fbm-like value in [-1, 1].
float nfbm(vec2 p){
  return (texture2D(uNoise, p).r * 0.62 + texture2D(uNoise, p * 3.7 + 0.31).g * 0.38) * 2.0 - 1.0;
}
// Pseudo-3D noise in [-1, 1] from two planar lookups.
float n3(vec3 p){
  return texture2D(uNoise, p.xy * 0.13 + p.z * 0.071).r + texture2D(uNoise, p.yz * 0.13 - p.x * 0.053).g - 1.0;
}
float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
`;

/** Exponential-squared distance fog toward the shared fog colour. */
export const FOG = /* glsl */ `
uniform vec3 uFogColor;
uniform float uFogDensity;
vec3 applyFog(vec3 col, float dist){
  float f = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
  return mix(col, uFogColor, clamp(f, 0.0, 1.0));
}
`;
