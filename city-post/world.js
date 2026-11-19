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
