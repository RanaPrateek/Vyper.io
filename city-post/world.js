// Shared world for Population: You episodes (Episode 2 onward).
// Ground, roads, trees, street lights, sky/lighting, the population sign, and builders for houses,
// special buildings, the pigeon and vote plots. Episode 1 (main.js) predates this and stays frozen.
import * as THREE from './node_modules/three/build/three.module.js';
export { THREE };

export const params = new URLSearchParams(location.search);

// ---------------------------------------------------------------- helpers
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
export const easeOut = (k) => 1 - Math.pow(1 - clamp(k), 3);
export const easeInOut = (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
export const easeOutBack = (k) => { k = clamp(k); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
let seed = 7;
export const setSeed = (s) => { seed = s; };
export const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

export function canvasTex(w, h, draw, { repeat = false, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.userData.ctx = g;
  return t;
}

// ---------------------------------------------------------------- renderer
export const VIEW = { w: parseInt(params.get('w'), 10) || 1080, h: parseInt(params.get('h'), 10) || 1920 };
export const canvas = document.getElementById('gl');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(VIEW.w, VIEW.h, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const ANISO = renderer.capabilities.getMaxAnisotropy();

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(52, VIEW.w / VIEW.h, 1.0, 5000);
scene.fog = new THREE.Fog(0xc9d9e6, 350, 1700);

// ---------------------------------------------------------------- sky + lights
const skyUniforms = {
  top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() },
  sunDir: { value: v3(0, 0.1, -1).normalize() }, sunColor: { value: new THREE.Color() }, sunSize: { value: 0 },
};
scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(4000, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyUniforms,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor; uniform float sunSize; varying vec3 vDir;
      void main(){ float h = clamp(vDir.y, 0.0, 1.0); vec3 col = mix(horizon, top, pow(h, 0.55));
        float d = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
        col += sunColor * (smoothstep(0.99985, 0.99992, d) * 1.6 + pow(d, 300.0) * 0.5 + pow(d, 12.0) * 0.35) * sunSize;
        gl_FragColor = vec4(col, 1.0); }`,
  })
));
const hemi = new THREE.HemisphereLight(0xbcd6ff, 0x6b7d4a, 1.0);
const sun = new THREE.DirectionalLight(0xffffff, 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.4;
scene.add(hemi, sun, sun.target);

export const LOOKS = {
  day: { top: 0x4f86d4, horizon: 0xd3e2ee, fog: 0xc8d8e5, fogNear: 350, fogFar: 1700, sun: 0xfff6ea, sunI: 2.7, sunDir: v3(0.45, 0.85, 0.35), hemiSky: 0xbcd6ff, hemiGround: 0x6b7d4a, hemiI: 1.05, exposure: 1.0, sunSize: 0 },
  golden: { top: 0x5a7fc0, horizon: 0xf5c48a, fog: 0xe8c9a0, fogNear: 300, fogFar: 1500, sun: 0xffd29a, sunI: 2.9, sunDir: v3(-0.5, 0.35, -0.6), hemiSky: 0xc8c6e0, hemiGround: 0x6b6040, hemiI: 0.95, exposure: 1.02, sunSize: 0 },
  dusk: { top: 0x1d2547, horizon: 0xc77a5a, fog: 0x7a5a6a, fogNear: 200, fogFar: 1300, sun: 0xffb27a, sunI: 1.3, sunDir: v3(-0.2, 0.12, -1), hemiSky: 0x7a7aaa, hemiGround: 0x3a3a40, hemiI: 0.95, exposure: 1.3, sunSize: 0 },
  sunset: { top: 0x37476a, horizon: 0xff9440, fog: 0xd58a52, fogNear: 120, fogFar: 1100, sun: 0xffa45a, sunI: 3.2, sunDir: v3(-0.03, 0.028, -1), lightDir: v3(-0.15, 0.3, -1), hemiSky: 0x8a7a90, hemiGround: 0x5a3a20, hemiI: 0.75, exposure: 1.05, sunSize: 1 },
};
export function applyLook(L, focus, span) {
  skyUniforms.top.value.set(L.top); skyUniforms.horizon.value.set(L.horizon);
  skyUniforms.sunDir.value.copy(L.sunDir).normalize(); skyUniforms.sunColor.value.set(L.sun); skyUniforms.sunSize.value = L.sunSize;
  scene.fog.color.set(L.fog); scene.fog.near = L.fogNear; scene.fog.far = L.fogFar;
  sun.color.set(L.sun); sun.intensity = L.sunI;
  hemi.color.set(L.hemiSky); hemi.groundColor.set(L.hemiGround); hemi.intensity = L.hemiI;
  renderer.toneMappingExposure = L.exposure;
  sun.target.position.copy(focus);
  sun.position.copy(focus).addScaledVector((L.lightDir || L.sunDir).clone().normalize(), 600);
  const c = sun.shadow.camera; c.left = c.bottom = -span; c.right = c.top = span; c.near = 1; c.far = 1400; c.updateProjectionMatrix();
}

// ---------------------------------------------------------------- ground
export const BLOCK = 50, ROAD = 10, GRID = 16, HALF = (BLOCK * GRID) / 2; // grid spans -400..400
/** centre of the plot in column i, row j (plots are centred at 25 + 50k) */
export const plot = (x, z) => v3(x, 0, z);

{
  const roadTex = canvasTex(512, 512, (g, W) => {
    const s = W / BLOCK, r = ROAD / 2;
    g.fillStyle = '#3a4558'; g.fillRect(0, 0, W, W);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`; g.fillRect(Math.random() * W, Math.random() * W, 2, 2); }
    g.fillStyle = '#9ea4ac'; g.fillRect(r * s, r * s, (BLOCK - ROAD) * s, (BLOCK - ROAD) * s);
    g.fillStyle = '#c8b39b'; g.fillRect((r + 1.4) * s, (r + 1.4) * s, (BLOCK - ROAD - 2.8) * s, (BLOCK - ROAD - 2.8) * s);
    for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(90,60,30,${Math.random() * 0.06})`; g.fillRect((r + 1.4) * s + Math.random() * (BLOCK - ROAD - 2.8) * s, (r + 1.4) * s + Math.random() * (BLOCK - ROAD - 2.8) * s, 3, 3); }
    g.fillStyle = '#f2f2f2';
    for (let x = 12; x < 38; x += 6) for (const e of [0, W]) { g.fillRect(x * s, e - 0.18 * s, 3 * s, 0.36 * s); g.fillRect(e - 0.18 * s, x * s, 0.36 * s, 3 * s); }
    const zebra = (x0, y0, horiz) => { for (let k = 0.4; k < r - 0.4; k += 1.0) { if (horiz) g.fillRect(x0 * s, (y0 + k) * s, 3 * s, 0.5 * s); else g.fillRect((y0 + k) * s, x0 * s, 0.5 * s, 3 * s); } };
    for (const x0 of [r + 0.6, BLOCK - r - 3.6]) for (const y0 of [0, BLOCK - r]) { zebra(x0, y0, true); zebra(x0, y0, false); }
  }, { repeat: true });
  roadTex.repeat.set(GRID, GRID); roadTex.anisotropy = ANISO;
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(BLOCK * GRID, BLOCK * GRID), new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  grid.rotation.x = -Math.PI / 2; grid.receiveShadow = true; scene.add(grid);

  const grassTex = canvasTex(512, 512, (g, W) => {
    g.fillStyle = '#6d8749'; g.fillRect(0, 0, W, W);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = [`rgba(70,95,45,0.5)`, `rgba(130,150,80,0.45)`, `rgba(150,145,95,0.35)`, `rgba(55,80,40,0.5)`][i % 4];
      g.fillRect(Math.random() * W, Math.random() * W, 2 + Math.random() * 4, 2 + Math.random() * 4);
    }
  }, { repeat: true });
  grassTex.repeat.set(300, 300); grassTex.anisotropy = ANISO;
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2; grass.position.y = -0.2; grass.receiveShadow = true; scene.add(grass);

  const hwTex = canvasTex(256, 512, (g, W, H) => {
    g.fillStyle = '#3a4558'; g.fillRect(0, 0, W, H); g.fillStyle = '#f4f4f4';
    g.fillRect(6, 0, 4, H); g.fillRect(W - 10, 0, 4, H); g.fillRect(W / 2 - 2, 0, 4, H * 0.45);
    g.fillRect(W / 4 - 1, 0, 3, H * 0.3); g.fillRect(3 * W / 4 - 2, 0, 3, H * 0.3);
  }, { repeat: true });
  hwTex.repeat.set(1, 120); hwTex.anisotropy = ANISO;
  const hw = new THREE.Mesh(new THREE.PlaneGeometry(24, 1800), new THREE.MeshStandardMaterial({ map: hwTex, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  hw.rotation.x = -Math.PI / 2; hw.position.set(0, 0.04, HALF + 900); hw.receiveShadow = true; scene.add(hw);
}

// ---------------------------------------------------------------- trees + street lights (instanced)
{
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 1, 6); trunkGeo.translate(0, 0.5, 0);
  const N = 2600;
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x6b5236, roughness: 1 }), N);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x3f5d2c, roughness: 1, flatShading: true }), N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  let n = 0; setSeed(99);
  while (n < N) {
    const belt = n < 1900, ang = rand() * Math.PI * 2;
    const rr = belt ? HALF + 25 + rand() * 110 : HALF + 140 + rand() * 1100;
    let x = Math.cos(ang) * rr, z = Math.sin(ang) * rr;
    if (belt) { const k = (HALF + 25 + rand() * 110) / Math.max(Math.abs(Math.cos(ang)), Math.abs(Math.sin(ang))); x = Math.cos(ang) * k; z = Math.sin(ang) * k; }
    if (Math.abs(x) < 26 && z > 0) continue;
    if (Math.abs(x) < 60 && z > HALF && z < HALF + 140) continue;
    const palm = rand() < 0.55, h = palm ? 7 + rand() * 6 : 3 + rand() * 3;
    m.compose(v3(x, 0, z), q.identity(), v3(1, h, 1)); trunks.setMatrixAt(n, m);
    const cs = palm ? 2.6 + rand() * 1.4 : 2.8 + rand() * 2;
    q.setFromEuler(new THREE.Euler(0, rand() * 6, 0));
    m.compose(v3(x, h + cs * 0.2, z), q, v3(cs, palm ? cs * 0.45 : cs * 0.9, cs)); crowns.setMatrixAt(n, m);
    col.setHSL(0.25 + rand() * 0.06, 0.35 + rand() * 0.15, 0.22 + rand() * 0.1); crowns.setColorAt(n, col);
    n++;
  }
  trunks.castShadow = crowns.castShadow = true; scene.add(trunks, crowns);

  const pts = [];
  for (let z = HALF + 20; z < HALF + 900; z += 34) { pts.push([-14, z, 1]); if (z + 17 < HALF + 40 || z + 17 > HALF + 100) pts.push([14, z + 17, -1]); }
  for (let i = -GRID / 2; i <= GRID / 2; i++) for (let j = -GRID / 2; j <= GRID / 2; j++) if (!((i + j) % 2)) pts.push([i * BLOCK + 6.2, j * BLOCK + 6.2, -1]);
  const poleGeo = new THREE.CylinderGeometry(0.16, 0.22, 9, 6).translate(0, 4.5, 0);
  const armGeo = new THREE.BoxGeometry(2.6, 0.18, 0.18).translate(1.3, 8.9, 0);
  const lampGeo = new THREE.BoxGeometry(1.1, 0.25, 0.5).translate(2.5, 8.75, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0x8f969e, metalness: 0.4, roughness: 0.5 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xf3f3f0, emissive: 0x333330 });
  const poles = new THREE.InstancedMesh(poleGeo, mat, pts.length), arms = new THREE.InstancedMesh(armGeo, mat, pts.length), lamps = new THREE.InstancedMesh(lampGeo, lampMat, pts.length);
  pts.forEach(([x, z, dir], k) => { m.makeRotationY(dir > 0 ? 0 : Math.PI); m.setPosition(x, 0, z); poles.setMatrixAt(k, m); arms.setMatrixAt(k, m); lamps.setMatrixAt(k, m); });
  poles.castShadow = arms.castShadow = true; scene.add(poles, arms, lamps);
}

// ---------------------------------------------------------------- population sign
export const SIGN_POS = v3(19, 0, HALF + 62);
export const SIGN_CENTER = SIGN_POS.clone().add(v3(0, 3.6 + 3.2, 0));
const signTex = canvasTex(1024, 620, () => {});
let signCity = 'YOUR CITY', signShown = null;
function drawSign(n) {
  const g = signTex.userData.ctx, W = 1024, H = 620;
  const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#36a868'); grd.addColorStop(1, '#23874f');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 10; g.strokeRect(22, 22, W - 44, H - 44);
  g.fillStyle = '#f4f7f2'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '500 92px Inter, sans-serif'; g.fillText(signCity, W / 2, 150);
  g.font = '500 76px Inter, sans-serif'; g.fillText('POPULATION', W / 2, 300);
  g.font = '600 150px Inter, sans-serif'; g.fillText(typeof n === 'number' ? n.toLocaleString('en-US') : String(n), W / 2, 470);
  signTex.needsUpdate = true;
}
export const sign = new THREE.Group();
{
  const postMat = new THREE.MeshStandardMaterial({ color: 0x9aa1a8, metalness: 0.5, roughness: 0.45 });
  const W = 10.5, H = 6.4, B = 3.6;
  for (const x of [-W * 0.32, W * 0.32]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, B + H, 10), postMat);
    p.position.set(x, (B + H) / 2, -0.25); p.castShadow = true; sign.add(p);
  }
  const board = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.25), [postMat, postMat, postMat, postMat,
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.35 }), new THREE.MeshStandardMaterial({ color: 0x2b6e48 })]);
  board.position.y = B + H / 2; board.castShadow = true; sign.add(board);
  sign.position.copy(SIGN_POS); sign.rotation.y = -0.38;
  scene.add(sign);
}
export function setSign(n, cityName) {
  if (cityName && cityName !== signCity) { signCity = cityName; signShown = null; }
  if (n !== signShown) { drawSign(n); signShown = n; }
}

// ---------------------------------------------------------------- materials + shapes
export function roofGeo(w, d, h) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return g;
}
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
export const ROOF_COLOURS = [0xd2653b, 0x3a7bd5, 0xe0b23a, 0x4fa36a, 0xc4507a, 0x7a5ac4, 0x2fb0b8, 0xe2733a];
const frameMat = std(0xf4f4f4, { roughness: 0.6 });
const glassMat = std(0x4f78a3, { roughness: 0.2, metalness: 0.15 });
const doorTex = canvasTex(64, 128, (g, w, h) => {
  g.fillStyle = '#7a5a3c'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 8) { g.fillStyle = x % 16 ? '#6c4f34' : '#86664a'; g.fillRect(x, 0, 7, h); }
});
const doorMat = new THREE.MeshStandardMaterial({ map: doorTex, roughness: 0.8 });

function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

/** Nameplate mesh; supports emoji (Noto Color Emoji is installed). */
export function nameplate(text, w = 4.2, h = 0.9, { bg = '#3b4450', fg = '#f2f4f6' } = {}) {
  const tex = canvasTex(512, Math.round(512 * h / w), (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 6; g.strokeRect(4, 4, W - 8, H - 8);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = Math.round(H * 0.56); const font = (s) => `700 ${s}px Inter, "Noto Color Emoji", sans-serif`;
    g.font = font(fs); while (g.measureText(text).width > W - 40 && fs > 10) { fs -= 2; g.font = font(fs); }
    g.fillText(text, W / 2, H / 2 + 2);
  });
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), [frameMat, frameMat, frameMat, frameMat, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }), frameMat]);
}

/** A citizen's house, facing +z. opts: roof colour, wall colour, neon (emissive pink). Returns group with userData.plate (world pos helper). */
export function makeHouse(name, { roof = 0xd2653b, wall = 0xe9e6e1, neon = false, scale = 1 } = {}) {
  const g = new THREE.Group();
  const W = 8, H = 4.6, D = 7;
  const wallMat = neon ? new THREE.MeshStandardMaterial({ color: 0xff4fb8, emissive: 0xff2aa6, emissiveIntensity: 0.55, roughness: 0.5 }) : std(wall, { roughness: 0.9 });
  const roofMat = neon ? new THREE.MeshStandardMaterial({ color: 0xff7ad0, emissive: 0xff3cb4, emissiveIntensity: 0.7, roughness: 0.4, flatShading: true }) : std(roof, { flatShading: true });
  box(W, H, D, wallMat, 0, H / 2, 0, g);
  const r = new THREE.Mesh(roofGeo(W + 1.0, D + 1.0, 2.6), roofMat); r.position.y = H; r.castShadow = true; g.add(r);
  const fz = D / 2;
  for (const x of [-2.6, 2.6]) { box(1.9, 1.5, 0.2, frameMat, x, 2.9, fz + 0.05, g); box(1.6, 1.2, 0.22, neon ? std(0xffe0f4, { emissive: 0xffb0e0, emissiveIntensity: 0.6 }) : glassMat, x, 2.9, fz + 0.07, g); }
  box(1.4, 2.4, 0.2, doorMat, 0, 1.2, fz + 0.05, g);
  const plate = nameplate(name, 3.6, 0.8, neon ? { bg: '#ffffff', fg: '#ff2aa6' } : undefined);
  plate.position.set(0, 3.85, fz + 0.1); g.add(plate);
  if (neon) { const glow = new THREE.PointLight(0xff4fb8, 40, 30, 2); glow.position.set(0, 3, fz + 4); g.add(glow); }
  g.scale.setScalar(scale);
  g.userData = { kind: 'house', name, front: v3(0, 3.6 * scale, fz * scale + 0.1) };
  return g;
}

/** "A car as a house": a car with a mailbox, a doormat and a nameplate on the door. Faces +z (side on). */
export function makeCarHouse(name) {
  const g = new THREE.Group();
  const paint = std(0x2fb0b8, { roughness: 0.35, metalness: 0.3 });
  box(10, 1.8, 4.4, paint, 0, 1.5, 0, g);
  box(5.6, 1.7, 4.0, paint, -0.6, 3.2, 0, g);
  for (const [x, z] of [[-1.8, 2.01], [1.2, 2.01]]) box(2.4, 1.3, 0.1, glassMat, x - 0.6, 3.25, z, g);
  box(0.2, 1.2, 3.8, glassMat, 2.25, 3.25, 0, g);
  const wheelMat = std(0x1d2024, { roughness: 0.9 });
  for (const x of [-3.2, 3.2]) for (const z of [-2.2, 2.2]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.7, 16), wheelMat); w.rotation.x = Math.PI / 2; w.position.set(x, 1.0, z); w.castShadow = true; g.add(w);
  }
  box(0.6, 0.5, 4.2, std(0xffe9a8, { emissive: 0xffe08a, emissiveIntensity: 0.4 }), 5.0, 1.8, 0, g); // headlights
  const plate = nameplate(name, 2.8, 0.65); plate.position.set(-0.4, 1.7, 2.27); g.add(plate);
  // tiny chimney on the roof + mailbox + doormat: it's a home now
  box(0.6, 1.2, 0.6, std(0xb5533a), -2.4, 4.6, -0.8, g);
  box(0.15, 1.6, 0.15, std(0x555b62), 3.4, 0.8, 4.4, g); box(0.7, 0.5, 0.9, std(0x3c4249, { metalness: 0.4 }), 3.4, 1.75, 4.4, g);
  box(1.6, 0.05, 1.0, std(0x9b6b3a), -0.4, 0.03, 3.2, g);
  g.userData = { kind: 'car', name, front: v3(-0.4, 2.2, 2.3) };
  return g;
}

/** A mansion: white walls, columns, navy roof, two wings. Faces +z. */
export function makeMansion(name) {
  const g = new THREE.Group();
  const wall = std(0xf3efe8, { roughness: 0.85 }), roof = std(0x2f3e66, { flatShading: true });
  box(18, 8, 12, wall, 0, 4, 0, g);
  for (const x of [-12, 12]) box(7, 6, 10, wall, x, 3, 0, g);
  const r = new THREE.Mesh(roofGeo(19, 13, 4), roof); r.position.y = 8; r.castShadow = true; g.add(r);
  for (const x of [-12, 12]) { const rw = new THREE.Mesh(roofGeo(7.6, 10.6, 2.6), roof); rw.position.set(x, 6, 0); g.add(rw); }
  // portico with columns and pediment
  box(10, 0.6, 3.6, wall, 0, 7.3, 7.6, g);
  for (const x of [-4.2, -1.4, 1.4, 4.2]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 7, 12), wall); c.position.set(x, 3.5, 8.8); c.castShadow = true; g.add(c); }
  const ped = new THREE.Mesh(roofGeo(10.4, 3.8, 2), wall); ped.position.set(0, 7.6, 7.6); g.add(ped);
  box(10, 0.4, 4.4, std(0xd9d2c6), 0, 0.2, 8.2, g);
  box(2.2, 3.8, 0.2, doorMat, 0, 1.9, 6.05, g);
  for (let x = -7; x <= 7; x += 3.5) if (Math.abs(x) > 2) for (const y of [2.6, 5.8]) { box(1.6, 1.9, 0.2, frameMat, x, y, 6.05, g); box(1.3, 1.6, 0.22, glassMat, x, y, 6.07, g); }
  const plate = nameplate(name, 5.2, 1.0, { bg: '#2f3e66', fg: '#f5e6b8' }); plate.position.set(0, 7.3, 9.45); g.add(plate);
  g.userData = { kind: 'mansion', name, front: v3(0, 5.5, 9.5) };
  return g;
}

/** The giant mall: glass-fronted box with a big sign. Faces +z. Built bottom-up via scale.y. */
export function makeMall(label = 'GIANT MALL') {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const facadeTex = canvasTex(256, 128, (c, W, H) => {
    c.fillStyle = '#cfe3f2'; c.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 32) { c.fillStyle = 'rgba(40,70,100,0.55)'; c.fillRect(x, 0, 3, H); }
    for (let y = 0; y < H; y += 42) { c.fillStyle = 'rgba(40,70,100,0.55)'; c.fillRect(0, y, W, 3); }
    const grd = c.createLinearGradient(0, 0, W, H); grd.addColorStop(0, 'rgba(255,255,255,0.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = grd; c.fillRect(0, 0, W, H);
  }, { repeat: true });
  facadeTex.repeat.set(5, 2);
  const glass = new THREE.MeshStandardMaterial({ map: facadeTex, roughness: 0.15, metalness: 0.35 });
  const concrete = std(0xe9e4dc, { roughness: 0.9 });
  box(34, 16, 28, concrete, 0, 8, -1, body);
  box(30, 12, 0.4, glass, 0, 7, 13.1, body);
  for (const x of [-17.1, 17.1]) box(0.4, 12, 22, glass, x, 7, -1, body);
  box(36, 1.2, 30, std(0xd9d2c6), 0, 16.4, -1, body);
  box(12, 0.6, 5, std(0xff6a13, { roughness: 0.5 }), 0, 6.2, 15.4, body); // canopy
  for (const x of [-5.6, 5.6]) box(0.4, 6, 0.4, std(0xb0b6bd, { metalness: 0.5 }), x, 3, 17.6, body);
  const signTex2 = canvasTex(1024, 200, (c, W, H) => {
    c.fillStyle = '#ff6a13'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 130px "Inter Display", Inter, sans-serif';
    c.fillText(label, W / 2, H / 2 + 6);
  });
  const sgn = new THREE.Mesh(new THREE.BoxGeometry(26, 5, 0.5), [frameMat, frameMat, frameMat, frameMat, new THREE.MeshStandardMaterial({ map: signTex2, emissive: 0xffffff, emissiveMap: signTex2, emissiveIntensity: 0.25 }), frameMat]);
  sgn.position.set(0, 19.6, 12); sgn.castShadow = true; g.add(sgn);
  g.userData = { kind: 'mall', body, sign: sgn };
  return g;
}

/** The pigeon who lives on the sign. userData.animate(t) bobs the head. */
export function makePigeon() {
  const g = new THREE.Group();
  const grey = std(0x8d93a0, { roughness: 0.7 }), dark = std(0x5d6270, { roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), grey); body.scale.set(1, 0.85, 1.35); body.position.y = 0.75; body.castShadow = true; g.add(body);
  const wing = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), dark);
  for (const x of [-0.5, 0.5]) { const w = wing.clone(); w.scale.set(0.35, 0.7, 1.3); w.position.set(x, 0.8, -0.1); g.add(w); }
  const tail = box(0.55, 0.12, 0.8, dark, 0, 0.75, -0.95, g); tail.rotation.x = -0.35;
  const head = new THREE.Group(); head.position.set(0, 1.35, 0.55); g.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), std(0x7d8392, { roughness: 0.6 })); head.add(skull);
  const neck = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.12, 8, 18), std(0x3f9b7c, { roughness: 0.3, metalness: 0.5, emissive: 0x213a50, emissiveIntensity: 0.3 }));
  neck.rotation.x = Math.PI / 2; neck.position.y = -0.3; head.add(neck);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 8), std(0x3a3a3a)); beak.rotation.x = Math.PI / 2; beak.position.set(0, -0.04, 0.4); head.add(beak);
  const cere = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), std(0xf2f2f2)); cere.position.set(0, 0.04, 0.3); head.add(cere);
  for (const x of [-0.2, 0.2]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), std(0xff8a1c, { emissive: 0x7a3000, emissiveIntensity: 0.3 })); eye.position.set(x, 0.08, 0.22); head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), std(0x111111)); pupil.position.set(x * 1.05, 0.09, 0.29); head.add(pupil);
  }
  for (const x of [-0.18, 0.18]) box(0.07, 0.35, 0.07, std(0xd9707a), x, 0.2, 0.05, g);
  g.userData = {
    head,
    animate(t) { // pigeon head-bob + the occasional judgemental turn
      const bob = Math.sin(t * 7) ; head.position.z = 0.55 + Math.max(0, bob) * 0.12; head.position.y = 1.35 + Math.abs(bob) * 0.03;
      head.rotation.y = Math.sin(t * 0.9) > 0.85 ? 0.6 : Math.sin(t * 0.9) < -0.9 ? -0.5 : 0;
    },
  };
  return g;
}

/** Dashed plot marker with a big letter (vote options). */
export function plotMarker(letter, colour = '#ff8a2a') {
  const tex = canvasTex(512, 512, (g, W) => {
    g.fillStyle = 'rgba(255,150,60,0.10)'; g.fillRect(0, 0, W, W);
    g.strokeStyle = colour; g.lineWidth = 9; g.setLineDash([34, 22]); g.strokeRect(14, 14, W - 28, W - 28);
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '800 250px Inter, sans-serif'; g.fillText(letter, W / 2, W / 2 + 10);
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(37, 37), new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false, toneMapped: false }));
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

/** World point -> stage pixel coordinates. */
export function project(p) {
  const v = p.clone().project(camera);
  return { x: (v.x * 0.5 + 0.5) * VIEW.w, y: (-v.y * 0.5 + 0.5) * VIEW.h, visible: v.z < 1 };
}

// ================================================================ Episode 3 additions
/** Many ordinary citizens' houses as instanced meshes (fast to render), each with its own nameplate.
 *  entries: [{ name, x, z, y?, rot?, roof?, wall?, scale? }]. Call field.setScale(i, s) then field.commit(). */
export function makeHouseField(entries) {
  const n = entries.length;
  const g = new THREE.Group();
  const W = 8, H = 4.6, D = 7;
  const parts = [
    { geo: new THREE.BoxGeometry(W, H, D).translate(0, H / 2, 0), mat: new THREE.MeshStandardMaterial({ roughness: 0.9 }), colour: 'wall', off: [[0, 0, 0]] },
    { geo: roofGeo(W + 1.0, D + 1.0, 2.6).translate(0, H, 0), mat: new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }), colour: 'roof', off: [[0, 0, 0]] },
    { geo: new THREE.BoxGeometry(1.9, 1.5, 0.2), mat: frameMat, off: [[-2.6, 2.9, D / 2 + 0.05], [2.6, 2.9, D / 2 + 0.05]] },
    { geo: new THREE.BoxGeometry(1.6, 1.2, 0.22), mat: glassMat, off: [[-2.6, 2.9, D / 2 + 0.07], [2.6, 2.9, D / 2 + 0.07]] },
    { geo: new THREE.BoxGeometry(1.4, 2.4, 0.2), mat: doorMat, off: [[0, 1.2, D / 2 + 0.05]] },
  ];
  const meshes = parts.map((p) => {
    const m = new THREE.InstancedMesh(p.geo, p.mat, n * p.off.length);
    m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
  });
  const col = new THREE.Color();
  entries.forEach((e, i) => {
    parts.forEach((p, k) => {
      if (!p.colour) return;
      col.set(p.colour === 'wall' ? (e.wall ?? 0xe9e6e1) : (e.roof ?? 0xd2653b));
      meshes[k].setColorAt(i, col);
    });
  });
  meshes.forEach((m) => { if (m.instanceColor) m.instanceColor.needsUpdate = true; });
  const plates = entries.map((e) => { const p = nameplate(e.name, 3.6, 0.8); g.add(p); return p; });
  const scales = new Float32Array(n).fill(1);
  const M = new THREE.Matrix4(), L = new THREE.Matrix4(), q = new THREE.Quaternion(), up = v3(0, 1, 0);
  function commit() {
    entries.forEach((e, i) => {
      const s = Math.max(scales[i], 0.0001);
      q.setFromAxisAngle(up, e.rot || 0);
      M.compose(v3(e.x, e.y || 0, e.z), q, v3(s * (e.scale || 1), s * (e.scale || 1), s * (e.scale || 1)));
      parts.forEach((p, k) => p.off.forEach((o, j) => { L.makeTranslation(o[0], o[1], o[2]); meshes[k].setMatrixAt(i * p.off.length + j, M.clone().multiply(L)); }));
      L.makeTranslation(0, 3.85, D / 2 + 0.1); const pm = M.clone().multiply(L);
      pm.decompose(plates[i].position, plates[i].quaternion, plates[i].scale); plates[i].visible = scales[i] > 0.01;
    });
    meshes.forEach((m) => (m.instanceMatrix.needsUpdate = true));
  }
  commit();
  return { group: g, entries, setScale: (i, s) => { scales[i] = s; }, commit, front: (i) => v3(entries[i].x, (entries[i].y || 0) + 3.4, entries[i].z + D / 2) };
}

/** Simple mansion for Billionaires' Hill: identical on purpose ("it's a tie"). Faces +z. */
export function makeVilla(name, colour = 0xf3efe8) {
  const g = new THREE.Group();
  const wall = std(colour, { roughness: 0.85 }), roof = std(0x2f3e66, { flatShading: true });
  box(14, 7, 10, wall, 0, 3.5, 0, g);
  for (const x of [-9, 9]) box(5, 5, 8, wall, x, 2.5, 0, g);
  const r = new THREE.Mesh(roofGeo(15, 11, 3.2), roof); r.position.y = 7; r.castShadow = true; g.add(r);
  for (const x of [-2.4, 2.4]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 6, 10), wall); c.position.set(x, 3, 6.4); c.castShadow = true; g.add(c); }
  box(6.4, 0.5, 2.6, wall, 0, 6.2, 6.0, g);
  box(1.8, 3.2, 0.2, doorMat, 0, 1.6, 5.05, g);
  box(16, 0.06, 4, std(0x3fb0d8, { roughness: 0.1, metalness: 0.2 }), 0, 0.04, 9, g); // pool
  const plate = nameplate(name, 4.4, 0.9, { bg: '#2f3e66', fg: '#f5e6b8' }); plate.position.set(0, 6.9, 7.35); g.add(plate);
  g.userData = { kind: 'villa', name };
  return g;
}

/** Raised lawn "hill" for a district, with a big district sign at the front. */
export function makeDistrict(cx, cz, w, d, h, label) {
  const g = new THREE.Group();
  const lawnTex = canvasTex(256, 256, (c, W) => {
    c.fillStyle = '#79a356'; c.fillRect(0, 0, W, W);
    for (let i = 0; i < 2500; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '40,70,30' : '160,190,110'},0.25)`; c.fillRect(Math.random() * W, Math.random() * W, 3, 3); }
  }, { repeat: true });
  lawnTex.repeat.set(w / 20, d / 20);
  const lawn = new THREE.MeshStandardMaterial({ map: lawnTex, roughness: 1 }), stone = std(0xc9c1b2, { roughness: 0.95 });
  const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [stone, stone, lawn, stone, stone, stone]);
  p.position.set(cx, h / 2, cz); p.receiveShadow = true; p.castShadow = true; g.add(p);
  const tex = canvasTex(1024, 256, (c, W, H) => {
    const grd = c.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#2f3e66'); grd.addColorStop(1, '#1d2747');
    c.fillStyle = grd; c.fillRect(0, 0, W, H); c.strokeStyle = '#e8c86a'; c.lineWidth = 12; c.strokeRect(14, 14, W - 28, H - 28);
    c.fillStyle = '#f5e6b8'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 120px "Inter Display", Inter, sans-serif';
    let fs = 120; while (c.measureText(label).width > W - 90) { fs -= 4; c.font = `900 ${fs}px "Inter Display", Inter, sans-serif`; }
    c.fillText(label, W / 2, H / 2 + 6);
  });
  const sgn = new THREE.Mesh(new THREE.BoxGeometry(36, 9, 0.6), [frameMat, frameMat, frameMat, frameMat, new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.2 }), frameMat]);
  sgn.position.set(cx, h + 9, cz + d / 2 - 4); sgn.castShadow = true; g.add(sgn);
  for (const x of [-12, 12]) box(0.6, 6, 0.6, std(0xb0b6bd, { metalness: 0.5 }), cx + x, h + 3, cz + d / 2 - 4.4, g);
  g.userData = { top: h, signPos: sgn.position.clone() };
  return g;
}

/** Cinema with a marquee and bulbs. Built bottom-up via userData.body.scale.y. Faces +z. */
export function makeCinema(label = 'CINEMA') {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const brick = std(0x8a2b3a, { roughness: 0.9 }), trim = std(0xf2e6c8, { roughness: 0.7 });
  box(30, 15, 24, brick, 0, 7.5, -1, body);
  box(31, 1, 25, trim, 0, 15.3, -1, body);
  box(10, 6, 0.3, glassMat, 0, 3, 11.1, body);
  for (const x of [-10, 10]) { // poster frames
    box(5, 7, 0.3, trim, x, 5, 11.1, body);
    box(4.2, 6.2, 0.35, std([0x3a6ee8, 0xe8578a][x > 0 ? 1 : 0], { emissive: [0x1a3070, 0x70203a][x > 0 ? 1 : 0], emissiveIntensity: 0.5 }), x, 5, 11.15, body);
  }
  const markTex = canvasTex(1024, 256, (c, W, H) => {
    c.fillStyle = '#1b1b22'; c.fillRect(0, 0, W, H);
    for (let x = 30; x < W; x += 60) for (const y of [22, H - 22]) { c.fillStyle = '#ffe9a0'; c.beginPath(); c.arc(x, y, 11, 0, 7); c.fill(); }
    c.fillStyle = '#ffd23a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 130px "Inter Display", Inter, sans-serif'; c.fillText(label, W / 2, H / 2 + 6);
  });
  const mq = new THREE.Mesh(new THREE.BoxGeometry(22, 5.5, 3), [trim, trim, trim, trim, new THREE.MeshStandardMaterial({ map: markTex, emissive: 0xffffff, emissiveMap: markTex, emissiveIntensity: 0.6 }), trim]);
  mq.position.set(0, 9, 12.4); mq.castShadow = true; g.add(mq);
  g.userData = { kind: 'cinema', body, sign: mq };
  return g;
}

/** Neon extension bolted onto the side of a house (Tamara). */
export function makeNeonExtension(colour = 0xa64dff) {
  const g = new THREE.Group();
  box(6, 4, 6, new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 0.55, roughness: 0.5 }), 0, 2, 0, g);
  const r = new THREE.Mesh(roofGeo(6.8, 6.8, 2), new THREE.MeshStandardMaterial({ color: 0xc58aff, emissive: colour, emissiveIntensity: 0.7, flatShading: true })); r.position.y = 4; g.add(r);
  const glow = new THREE.PointLight(colour, 30, 25, 2); glow.position.set(0, 3, 5); g.add(glow);
  return g;
}

// ---- special houses (each faces +z, nameplate on the front, footprint about 10 x 10)
function plateOn(g, name, x, y, z, w = 3.4) { const p = nameplate(name, w, 0.75); p.position.set(x, y, z); g.add(p); return p; }
function doorOn(g, x, y, z) { box(1.3, 2.2, 0.2, doorMat, x, y + 1.1, z, g); }

export function makePotatoHouse(name) {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(5, 24, 16); const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); const k = 1 + 0.08 * Math.sin(x * 1.3) * Math.cos(z * 1.1) + 0.05 * Math.sin(y * 2.1); pos.setXYZ(i, x * 1.25 * k, y * 0.8 * k, z * k); }
  geo.computeVertexNormals();
  const skin = new THREE.Mesh(geo, std(0xb58a55, { roughness: 1 })); skin.position.y = 3.6; skin.castShadow = true; g.add(skin);
  for (let i = 0; i < 9; i++) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), std(0x7a5a33)); const a = i * 1.7, b = (i % 3) * 0.6 - 0.4; e.position.set(Math.cos(a) * 5.6, 3.6 + b * 3, Math.sin(a) * 4.6); g.add(e); }
  doorOn(g, 0, 0.2, 4.6); for (const x of [-2.6, 2.6]) { box(1.4, 1.1, 0.2, glassMat, x, 4.4, 4.2, g); }
  plateOn(g, name, 0, 3.2, 4.85);
  box(0.5, 1.4, 0.5, std(0x5b4a3a), 3, 7.4, -1, g); // chimney
  g.userData = { kind: 'potato', name, front: v3(0, 3.5, 5) };
  return g;
}

export function makeDuckHouse(name) {
  const g = new THREE.Group();
  const pink = std(0xff8fc8, { roughness: 0.35 }), beakM = std(0xff9a2e, { roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(5, 24, 16), pink); body.scale.set(1.25, 0.75, 1); body.position.y = 3.6; body.castShadow = true; g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3, 12), pink); tail.rotation.x = -1.0; tail.position.set(0, 5.6, -5.4); g.add(tail);
  const head = new THREE.Mesh(new THREE.SphereGeometry(2.8, 20, 14), pink); head.position.set(0, 8.6, 2.0); head.castShadow = true; g.add(head);
  const beak = new THREE.Mesh(new THREE.SphereGeometry(1.4, 14, 10), beakM); beak.scale.set(1.3, 0.45, 1); beak.position.set(0, 8.1, 4.6); g.add(beak);
  for (const x of [-1.2, 1.2]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), std(0x1a1a1a)); eye.position.set(x, 9.4, 4.3); g.add(eye); }
  doorOn(g, 0, 0.3, 4.9); plateOn(g, name, 0, 4.6, 4.75);
  g.userData = { kind: 'duck', name, front: v3(0, 4.5, 5) };
  return g;
}

export function makeShoeHouse(name) {
  const g = new THREE.Group();
  const leather = std(0xd8262e, { roughness: 0.45 }), sole = std(0xf7f5f0, { roughness: 0.8 }), lace = std(0xffffff);
  box(16, 1.2, 8, sole, 0, 0.6, 0, g);
  const toe = new THREE.Mesh(new THREE.SphereGeometry(4, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), leather); toe.scale.set(1.2, 0.9, 1); toe.position.set(4, 1.2, 0); toe.castShadow = true; g.add(toe);
  box(8, 6.5, 7.6, leather, -3.2, 4.4, 0, g);
  box(8.4, 0.8, 8, sole, -3.2, 7.9, 0, g);
  box(2.2, 3.2, 7.8, sole, -7.4, 3.4, 0, g); // heel tab
  for (const z of [-3.9, 3.9]) box(9, 0.9, 0.1, sole, 0.5, 2.6, z, g); // side stripe
  for (let i = 0; i < 4; i++) box(0.25, 0.25, 6.8, lace, -0.8 + i * 1.4, 4 + i * 1.2, 0, g);
  box(1.4, 2.4, 0.2, doorMat, -3.2, 2.4, 3.85, g);
  for (const y of [5.2, 7.4]) box(1.5, 1.1, 0.2, glassMat, -5.5, y, 3.85, g);
  plateOn(g, name, -1, 6.4, 3.9, 3.2);
  g.rotation.y = 0; g.userData = { kind: 'shoe', name, front: v3(-2, 4.5, 4) };
  return g;
}

export function makeOstrichHouse(name) {
  const g = new THREE.Group();
  const feathers = std(0x2b2b2e, { roughness: 0.9 }), skinM = std(0xe8b7a0, { roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(4.5, 20, 14), feathers); body.scale.set(1.2, 0.85, 1); body.position.y = 8; body.castShadow = true; g.add(body);
  const tail = new THREE.Mesh(new THREE.SphereGeometry(2.6, 14, 10), std(0xf2f2f2, { roughness: 1 })); tail.position.set(0, 9, -4.2); g.add(tail);
  for (const x of [-1.6, 1.6]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 5, 8), skinM); leg.position.set(x, 2.5, 0); leg.castShadow = true; g.add(leg); box(1.4, 0.4, 2.2, skinM, x, 0.2, 0.6, g); }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 7, 10), skinM); neck.position.set(0, 13.5, 3.2); neck.rotation.x = 0.35; g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.3, 14, 10), skinM); head.position.set(0, 17, 4.6); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.6, 8), std(0xd9a066)); beak.rotation.x = Math.PI / 2; beak.position.set(0, 16.8, 6); g.add(beak);
  for (const x of [-0.7, 0.7]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), std(0x111111)); eye.position.set(x, 17.3, 5.5); g.add(eye); }
  // the house part: a door and a window in the belly, and a little ladder up to it
  box(1.4, 2.2, 0.2, doorMat, 0, 7.4, 4.7, g); box(1.4, 1.0, 0.2, glassMat, 2.2, 8.4, 4.35, g);
  for (let i = 0; i < 6; i++) box(1.6, 0.15, 0.4, std(0x9b6b3a), 0, 1 + i * 1.05, 5.6 - i * 0.1, g);
  plateOn(g, name, 0, 9.8, 4.75, 3.0);
  g.userData = { kind: 'ostrich', name, front: v3(0, 8, 5) };
  return g;
}

export function makeNuggetHouse(name) {
  const g = new THREE.Group();
  const geo = new THREE.DodecahedronGeometry(5, 1); const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); const k = 1 + 0.1 * Math.sin(x * 2.3 + z) * Math.cos(y * 1.7); pos.setXYZ(i, x * 1.3 * k, y * 0.75 * k, z * k); }
  geo.computeVertexNormals();
  const n = new THREE.Mesh(geo, std(0xd99a3c, { roughness: 1, flatShading: true })); n.position.y = 3.4; n.castShadow = true; g.add(n);
  const dip = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 1.8, 2.4, 20), std(0xc0392b, { roughness: 0.4 })); dip.position.set(8.5, 1.2, 2); dip.castShadow = true; g.add(dip);
  doorOn(g, 0, 0.3, 4.3); plateOn(g, name, 0, 3.4, 4.65);
  for (const x of [-3, 3]) box(1.3, 1.0, 0.2, glassMat, x, 4.2, 4.0, g);
  g.userData = { kind: 'nugget', name, front: v3(0, 3.4, 5) };
  return g;
}

/** A giant statue of the pigeon on a plinth, with a door in the plinth (Kacee lives inside). */
export function makePigeonStatue(name) {
  const g = new THREE.Group();
  const stone = std(0xd8d4cc, { roughness: 0.95 });
  box(10, 5, 10, stone, 0, 2.5, 0, g);
  box(11, 0.6, 11, stone, 0, 5.1, 0, g);
  const p = makePigeon(); p.scale.setScalar(5.2); p.position.set(0, 5.3, 0); g.add(p);
  doorOn(g, 0, 0.2, 5.05); box(1.2, 0.9, 0.2, glassMat, 3, 3.2, 5.05, g); box(1.2, 0.9, 0.2, glassMat, -3, 3.2, 5.05, g);
  plateOn(g, name, 0, 3.9, 5.1, 2.6);
  g.userData = { kind: 'statue', name, pigeon: p, front: v3(0, 4, 5) };
  return g;
}
