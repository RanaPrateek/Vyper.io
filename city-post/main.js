// "Population: 1" — community city-builder post, recreated as a procedural Three.js scene.
// Everything is a pure function of time t (seconds) so frames render deterministically.
import * as THREE from './node_modules/three/build/three.module.js';

const params = new URLSearchParams(location.search);
const CFG = {
  handle: params.get('handle') || '@your_handle',
  resident: params.get('name') || '@YOUR_NAME',
  city: (params.get('city') || 'YOUR CITY').toUpperCase(),
  follower: params.get('pop') ? parseInt(params.get('pop'), 10) : 582,
};
export const DURATION = 40;

// ---------------------------------------------------------------- helpers
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const easeOut = (k) => 1 - Math.pow(1 - clamp(k), 3);
const easeOutBack = (k) => { k = clamp(k); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
let seed = 7;
const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

function canvasTex(w, h, draw, { repeat = false, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.userData.ctx = g;
  return t;
}

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(1080, 1920, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const ANISO = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(52, 1080 / 1920, 0.5, 5000);
scene.fog = new THREE.Fog(0xc9d9e6, 350, 1700);

// ---------------------------------------------------------------- sky
const skyUniforms = {
  top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() },
  sunDir: { value: v3(0, 0.1, -1).normalize() }, sunColor: { value: new THREE.Color() }, sunSize: { value: 0 },
};
const sky = new THREE.Mesh(
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
);
scene.add(sky);

const hemi = new THREE.HemisphereLight(0xbcd6ff, 0x6b7d4a, 1.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.4;
scene.add(sun, sun.target);

// ---------------------------------------------------------------- ground
const BLOCK = 50, ROAD = 10, GRID = 16, HALF = (BLOCK * GRID) / 2; // grid spans -400..400

const roadTex = canvasTex(512, 512, (g, W) => {
  const s = W / BLOCK; // px per unit
  g.fillStyle = '#3a4558'; g.fillRect(0, 0, W, W);
  // subtle asphalt noise
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`; g.fillRect(Math.random() * W, Math.random() * W, 2, 2); }
  const r = ROAD / 2;
  g.fillStyle = '#9ea4ac'; g.fillRect(r * s, r * s, (BLOCK - ROAD) * s, (BLOCK - ROAD) * s); // sidewalk
  g.fillStyle = '#c8b39b'; g.fillRect((r + 1.4) * s, (r + 1.4) * s, (BLOCK - ROAD - 2.8) * s, (BLOCK - ROAD - 2.8) * s); // plot
  for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(90,60,30,${Math.random() * 0.06})`; g.fillRect((r + 1.4) * s + Math.random() * (BLOCK - ROAD - 2.8) * s, (r + 1.4) * s + Math.random() * (BLOCK - ROAD - 2.8) * s, 3, 3); }
  g.fillStyle = '#f2f2f2';
  // centre dashes (straddle tile edges so tiling joins them)
  for (let x = 12; x < 38; x += 6) {
    for (const e of [0, W]) { g.fillRect(x * s, e - 0.18 * s, 3 * s, 0.36 * s); g.fillRect(e - 0.18 * s, x * s, 0.36 * s, 3 * s); }
  }
  // zebra crossings beside each intersection
  const zebra = (x0, y0, horizontalRoad) => {
    for (let k = 0.4; k < r - 0.4; k += 1.0) {
      if (horizontalRoad) { g.fillRect(x0 * s, (y0 + k) * s, 3 * s, 0.5 * s); }
      else { g.fillRect((y0 + k) * s, x0 * s, 0.5 * s, 3 * s); }
    }
  };
  for (const x0 of [r + 0.6, BLOCK - r - 3.6]) for (const y0 of [0, BLOCK - r]) { zebra(x0, y0, true); zebra(x0, y0, false); }
}, { repeat: true });
roadTex.repeat.set(GRID, GRID); roadTex.anisotropy = ANISO;
const grid = new THREE.Mesh(new THREE.PlaneGeometry(BLOCK * GRID, BLOCK * GRID), new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.92 }));
grid.rotation.x = -Math.PI / 2; grid.receiveShadow = true;
scene.add(grid);

const grassTex = canvasTex(512, 512, (g, W) => {
  g.fillStyle = '#6d8749'; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 9000; i++) {
    const c = [`rgba(70,95,45,0.5)`, `rgba(130,150,80,0.45)`, `rgba(150,145,95,0.35)`, `rgba(55,80,40,0.5)`][i % 4];
    g.fillStyle = c; g.fillRect(Math.random() * W, Math.random() * W, 2 + Math.random() * 4, 2 + Math.random() * 4);
  }
}, { repeat: true });
grassTex.repeat.set(300, 300); grassTex.anisotropy = ANISO;
const grass = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
grass.rotation.x = -Math.PI / 2; grass.position.y = -0.06; grass.receiveShadow = true;
scene.add(grass);

// entrance highway (x = 0, from the grid edge out to the horizon on +z)
const hwTex = canvasTex(256, 512, (g, W, H) => {
  g.fillStyle = '#3a4558'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#f4f4f4';
  g.fillRect(6, 0, 4, H); g.fillRect(W - 10, 0, 4, H);
  g.fillRect(W / 2 - 2, 0, 4, H * 0.45);
  g.fillRect(W / 4 - 1, 0, 3, H * 0.3); g.fillRect(3 * W / 4 - 2, 0, 3, H * 0.3);
}, { repeat: true });
hwTex.repeat.set(1, 120); hwTex.anisotropy = ANISO;
const hw = new THREE.Mesh(new THREE.PlaneGeometry(24, 1800), new THREE.MeshStandardMaterial({ map: hwTex, roughness: 0.9 }));
hw.rotation.x = -Math.PI / 2; hw.position.set(0, 0.01, HALF + 900); hw.receiveShadow = true;
scene.add(hw);

// ---------------------------------------------------------------- trees (instanced)
{
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 1, 6); trunkGeo.translate(0, 0.5, 0);
  const crownGeo = new THREE.IcosahedronGeometry(1, 0);
  const N = 2600;
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x6b5236, roughness: 1 }), N);
  const crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ color: 0x3f5d2c, roughness: 1, flatShading: true }), N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  let n = 0;
  seed = 99;
  while (n < N) {
    // dense belt around the city + scattered further out
    const belt = n < 1900;
    const ang = rand() * Math.PI * 2;
    const rr = belt ? HALF + 25 + rand() * 110 : HALF + 140 + rand() * 1100;
    let x = Math.cos(ang) * rr, z = Math.sin(ang) * rr;
    // squarer belt
    if (belt) { const k = (HALF + 25 + rand() * 110) / Math.max(Math.abs(Math.cos(ang)), Math.abs(Math.sin(ang))); x = Math.cos(ang) * k; z = Math.sin(ang) * k; }
    if (Math.abs(x) < 26 && z > 0) continue;                // keep highway clear
    if (Math.abs(x) < 60 && z > HALF && z < HALF + 140) continue; // keep sign area clear
    const palm = rand() < 0.55;
    const h = palm ? 7 + rand() * 6 : 3 + rand() * 3;
    m.compose(v3(x, 0, z), q.identity(), v3(1, h, 1)); trunks.setMatrixAt(n, m);
    const cs = palm ? 2.6 + rand() * 1.4 : 2.8 + rand() * 2;
    q.setFromEuler(new THREE.Euler(0, rand() * 6, 0));
    m.compose(v3(x, h + cs * 0.2, z), q, v3(cs, palm ? cs * 0.45 : cs * 0.9, cs)); crowns.setMatrixAt(n, m);
    col.setHSL(0.25 + rand() * 0.06, 0.35 + rand() * 0.15, 0.22 + rand() * 0.1); crowns.setColorAt(n, col);
    n++;
  }
  trunks.castShadow = crowns.castShadow = true;
  scene.add(trunks, crowns);
}

// ---------------------------------------------------------------- street lights (instanced)
{
  const pts = [];
  for (let z = HALF + 20; z < HALF + 900; z += 34) { pts.push([-14, z, 1]); if (z + 17 < HALF + 40 || z + 17 > HALF + 100) pts.push([14, z + 17, -1]); }
  for (let i = -GRID / 2; i <= GRID / 2; i++) for (let j = -GRID / 2; j <= GRID / 2; j++) {
    if ((i + j) % 2) continue;
    pts.push([i * BLOCK + 6.2, j * BLOCK + 6.2, -1]);
  }
  const N = pts.length;
  const poleGeo = new THREE.CylinderGeometry(0.16, 0.22, 9, 6); poleGeo.translate(0, 4.5, 0);
  const armGeo = new THREE.BoxGeometry(2.6, 0.18, 0.18); armGeo.translate(1.3, 8.9, 0);
  const lampGeo = new THREE.BoxGeometry(1.1, 0.25, 0.5); lampGeo.translate(2.5, 8.75, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0x8f969e, metalness: 0.4, roughness: 0.5 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xf3f3f0, emissive: 0x333330 });
  const poles = new THREE.InstancedMesh(poleGeo, mat, N), arms = new THREE.InstancedMesh(armGeo, mat, N), lamps = new THREE.InstancedMesh(lampGeo, lampMat, N);
  const m = new THREE.Matrix4();
  pts.forEach(([x, z, dir], k) => {
    m.makeRotationY(dir > 0 ? 0 : Math.PI); m.setPosition(x, 0, z);
    poles.setMatrixAt(k, m); arms.setMatrixAt(k, m); lamps.setMatrixAt(k, m);
  });
  poles.castShadow = arms.castShadow = true;
  scene.add(poles, arms, lamps);
}

// ---------------------------------------------------------------- population sign
const SIGN_POS = v3(19, 0, HALF + 62);
const signTex = canvasTex(1024, 620, () => {});
function drawSign(n) {
  const g = signTex.userData.ctx, W = 1024, H = 620;
  const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#36a868'); grd.addColorStop(1, '#23874f');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 10; g.strokeRect(22, 22, W - 44, H - 44);
  g.fillStyle = '#f4f7f2'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '500 92px Inter, sans-serif'; g.fillText(CFG.city, W / 2, 150);
  g.font = '500 76px Inter, sans-serif'; g.fillText('POPULATION', W / 2, 300);
  g.font = '600 150px Inter, sans-serif'; g.fillText(n.toLocaleString('en-US'), W / 2, 470);
  signTex.needsUpdate = true;
}
const sign = new THREE.Group();
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
const SIGN_CENTER = SIGN_POS.clone().add(v3(0, 3.6 + 3.2, 0));
let signShown = -1;
function setSign(n) { if (n !== signShown) { drawSign(n); signShown = n; } }

// ---------------------------------------------------------------- city buildings
const windowTex = canvasTex(128, 256, (g, W, H) => {
  g.fillStyle = '#dfe3e8'; g.fillRect(0, 0, W, H);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) {
    const x = 6 + c * 30, y = 6 + r * 31;
    const grd = g.createLinearGradient(x, y, x + 20, y + 22);
    const l = 22 + Math.random() * 18;
    grd.addColorStop(0, `hsl(212,35%,${l + 18}%)`); grd.addColorStop(1, `hsl(214,40%,${l}%)`);
    g.fillStyle = grd; g.fillRect(x, y, 20, 22);
  }
  g.fillStyle = 'rgba(0,0,0,0.08)'; for (let r = 0; r < 8; r++) g.fillRect(0, 31 + r * 31 - 3, W, 3);
}, { repeat: true });
windowTex.anisotropy = ANISO;
const towerMat = new THREE.MeshStandardMaterial({ map: windowTex, roughness: 0.55, metalness: 0.1 });
const midTex = windowTex.clone(); midTex.needsUpdate = true;
const midMat = new THREE.MeshStandardMaterial({ map: midTex, color: 0xf2ece4, roughness: 0.7 });
const roofMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a7, roughness: 0.9 });

function texturedBox(w, h, d, side, roof) {
  const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0);
  const uv = g.attributes.uv;
  for (let f = 0; f < 6; f++) {
    let su = 1, sv = 1;
    if (f < 2) { su = Math.max(1, Math.round(d / 8)); sv = Math.max(1, Math.round(h / 16)); }
    else if (f >= 4) { su = Math.max(1, Math.round(w / 8)); sv = Math.max(1, Math.round(h / 16)); }
    for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); }
  }
  const mesh = new THREE.Mesh(g, [side, side, roof, roof, side, side]);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

const city = new THREE.Group(); scene.add(city);
const growers = []; // {obj, start}
seed = 4242;
// small houses go into instanced meshes
const houseSpots = [];
for (let i = -GRID / 2; i < GRID / 2; i++) for (let j = -GRID / 2; j < GRID / 2; j++) {
  const cx = i * BLOCK + BLOCK / 2, cz = j * BLOCK + BLOCK / 2;
  const d = Math.hypot(cx, cz);
  const delay = 7.2 + (d / 340) * 2.6 + rand() * 0.45;
  if (d < 115) {
    if (rand() < 0.35 && d > 40) { // 2x2 smaller towers
      for (const ox of [-9.5, 9.5]) for (const oz of [-9.5, 9.5]) {
        const h = 40 + rand() * 45 * (1 - d / 160);
        const b = texturedBox(15, h, 15, towerMat, roofMat); b.position.set(cx + ox, 0, cz + oz);
        city.add(b); growers.push({ obj: b, start: delay + rand() * 0.25 });
      }
    } else {
      const h = d < 40 ? 175 : 70 + rand() * 70 * (1 - d / 160);
      const w = d < 40 ? 26 : 24 + rand() * 8;
      const b = texturedBox(w, h, w, towerMat, roofMat); b.position.set(cx, 0, cz);
      city.add(b); growers.push({ obj: b, start: delay });
      if (d < 40) { const cap = texturedBox(16, 40, 16, towerMat, roofMat); cap.position.set(0, h, 0); b.add(cap); }
    }
  } else if (d < 215) {
    for (const ox of [-9.5, 9.5]) for (const oz of [-9.5, 9.5]) {
      if (rand() < 0.15) continue;
      const h = 14 + rand() * 30 * (1.3 - d / 215);
      const b = texturedBox(15, h, 15, rand() < 0.5 ? midMat : towerMat, roofMat); b.position.set(cx + ox, 0, cz + oz);
      city.add(b); growers.push({ obj: b, start: delay + rand() * 0.3 });
    }
  } else if (d < 340) {
    for (const ox of [-12, 0, 12]) for (const oz of [-12, 0, 12]) {
      if (rand() < 0.38) continue;
      houseSpots.push({ x: cx + ox + (rand() - 0.5) * 2, z: cz + oz + (rand() - 0.5) * 2, rot: rand() < 0.5 ? 0 : Math.PI / 2, start: delay + rand() * 0.4 });
    }
  }
}
const houseWallTex = canvasTex(128, 64, (g, W, H) => {
  g.fillStyle = '#e7e8ea'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#3d5168'; g.fillRect(18, 20, 28, 22); g.fillRect(82, 20, 28, 22);
});
const houseWalls = new THREE.InstancedMesh(new THREE.BoxGeometry(8, 5, 8).translate(0, 2.5, 0), new THREE.MeshStandardMaterial({ map: houseWallTex, roughness: 0.85 }), houseSpots.length);
function roofGeo(w, d, h) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return g;
}
const roofOrange = new THREE.MeshStandardMaterial({ color: 0xd2653b, roughness: 0.8, flatShading: true });
const houseRoofs = new THREE.InstancedMesh(roofGeo(9, 9, 3).translate(0, 5, 0), roofOrange, houseSpots.length);
houseWalls.castShadow = houseRoofs.castShadow = true; houseWalls.receiveShadow = true;
city.add(houseWalls, houseRoofs);

function updateCity(t, mode) {
  // mode: 'hidden' | 'grow' | 'full'
  city.visible = mode !== 'hidden';
  if (!city.visible) return;
  for (const gr of growers) {
    const k = mode === 'full' ? 1 : easeOutBack((t - gr.start) / 0.9);
    gr.obj.visible = k > 0.001;
    gr.obj.scale.set(1, Math.max(k, 0.001), 1);
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  houseSpots.forEach((h, i) => {
    const k = mode === 'full' ? 1 : easeOutBack((t - h.start) / 0.6);
    q.setFromAxisAngle(v3(0, 1, 0), h.rot);
    m.compose(v3(h.x, 0, h.z), q, v3(Math.max(k, 0.0001), Math.max(k, 0.0001), Math.max(k, 0.0001)));
    houseWalls.setMatrixAt(i, m); houseRoofs.setMatrixAt(i, m);
  });
  houseWalls.instanceMatrix.needsUpdate = houseRoofs.instanceMatrix.needsUpdate = true;
}

// ---------------------------------------------------------------- hero house (rule 2)
const HOUSE_POS = v3(-25, 0, HALF - 25);
const hero = new THREE.Group();
{
  const W = 14, H = 6.2, D = 9;
  const wallTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8f969f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  }, { repeat: true });
  wallTex.repeat.set(3, 1.5);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(W, H, D).translate(0, H / 2, 0), wallMat);
  walls.castShadow = walls.receiveShadow = true; hero.add(walls);
  // ridge runs along x
  const roof2 = new THREE.Mesh(roofGeo(D + 1.2, W + 1.2, 2.4), roofOrange); roof2.rotation.y = Math.PI / 2; roof2.position.y = H;
  roof2.castShadow = true; hero.add(roof2);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.6 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x4f78a3, roughness: 0.2, metalness: 0.15 });
  const fz = D / 2;
  const addWindow = (x, y, w, h) => {
    const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.35, h + 0.35, 0.2), frameMat); fr.position.set(x, y, fz + 0.06); hero.add(fr);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.22), glassMat); gl.position.set(x, y, fz + 0.08); hero.add(gl);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.7, 0.18, 0.45), frameMat); sill.position.set(x, y - h / 2 - 0.25, fz + 0.2); hero.add(sill);
  };
  addWindow(-4.3, 3.4, 3.0, 2.2); addWindow(4.3, 3.4, 3.0, 2.2);
  const doorTex = canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#7a5a3c'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) { g.fillStyle = x % 16 ? '#6c4f34' : '#86664a'; g.fillRect(x, 0, 7, h); }
  });
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.9, 3.4, 0.2), new THREE.MeshStandardMaterial({ map: doorTex, roughness: 0.8 }));
  door.position.set(0, 1.7, fz + 0.06); hero.add(door);
  const plateTex = canvasTex(512, 110, (g, w, h) => {
    g.fillStyle = '#3b4450'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#59636f'; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#f2f4f6'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = 58; g.font = `700 ${fs}px Inter, sans-serif`;
    while (g.measureText(CFG.resident).width > w - 50) { fs -= 2; g.font = `700 ${fs}px Inter, sans-serif`; }
    g.fillText(CFG.resident, w / 2, h / 2 + 2);
  });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.9, 0.12), [frameMat, frameMat, frameMat, frameMat, new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.5 }), frameMat]);
  plate.position.set(0, 4.5, fz + 0.1); hero.add(plate);
  // mailbox
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.4, 0.2).translate(0, 1.2, 0), new THREE.MeshStandardMaterial({ color: 0x555b62 }));
  post.position.set(5.5, 0, fz + 4); hero.add(post);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.1), new THREE.MeshStandardMaterial({ color: 0x3c4249, metalness: 0.4, roughness: 0.4 }));
  box.position.set(5.5, 2.6, fz + 4); box.castShadow = true; hero.add(box);
  hero.position.copy(HOUSE_POS);
  scene.add(hero);
}
const PLATE_WORLD = HOUSE_POS.clone().add(v3(0, 4.5, 4.6));

// ---------------------------------------------------------------- vote plots (A/B/C)
const VOTE_PLOTS = [v3(-25, 0.05, -75), v3(-25, 0.05, -25), v3(-25, 0.05, 25)];
const votePlanes = VOTE_PLOTS.map((p, i) => {
  const tex = canvasTex(512, 512, (g, W) => {
    g.fillStyle = 'rgba(255,150,60,0.10)'; g.fillRect(0, 0, W, W);
    g.strokeStyle = '#ff8a2a'; g.lineWidth = 9; g.setLineDash([34, 22]); g.strokeRect(14, 14, W - 28, W - 28);
    g.fillStyle = 'rgba(255,255,255,0.78)'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '800 250px Inter, sans-serif'; g.fillText('ABC'[i], W / 2, W / 2 + 10);
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(37, 37), new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false, toneMapped: false }));
  mesh.rotation.x = -Math.PI / 2; mesh.position.copy(p).add(v3(0, 0.1, 0));
  scene.add(mesh); return mesh;
});

// ---------------------------------------------------------------- lighting looks
const LOOKS = {
  day: { top: 0x4f86d4, horizon: 0xd3e2ee, fog: 0xc8d8e5, fogNear: 350, fogFar: 1700, sun: 0xfff6ea, sunI: 2.7, sunDir: v3(0.45, 0.85, 0.35), hemiSky: 0xbcd6ff, hemiGround: 0x6b7d4a, hemiI: 1.05, exposure: 1.0, sunSize: 0 },
  sunset: { top: 0x37476a, horizon: 0xff9440, fog: 0xd58a52, fogNear: 120, fogFar: 1100, sun: 0xffa45a, sunI: 3.2, sunDir: v3(-0.03, 0.028, -1), lightDir: v3(-0.15, 0.3, -1), hemiSky: 0x8a7a90, hemiGround: 0x5a3a20, hemiI: 0.75, exposure: 1.05, sunSize: 1 },
};
function applyLook(L, focus, span) {
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

// ---------------------------------------------------------------- shots
// Each shot: [t0, t1], camera from/to + look from/to, look, city mode, overlays.
const SHOTS = [
  { t0: 0, t1: 2.7, pill: 'DAY 0', title: 'POPULATION: 1', look: 'day', city: 'hidden', pop: () => 1,
    cam: [v3(-4.5, 2.1, HALF + 112), v3(-4.5, 2.1, HALF + 103)], at: [v3(27, 6.0, HALF + 10), v3(34, 6.0, HALF)] },
  { t0: 2.7, t1: 5.8, pill: 'DAY 0', title: 'TOTALLY EMPTY', look: 'day', city: 'hidden',
    cam: [v3(0, 30, 190), v3(0, 30, 130)], at: [v3(30, 0, 100), v3(30, 0, 40)] },
  { t0: 5.8, t1: 11.6, pill: 'THE PLAN', title: 'BUILT BY YOU', look: 'day', city: 'grow', orbit: true },
  { t0: 11.6, t1: 15.3, pill: 'RULE 1', title: 'FOLLOW = CITIZEN', look: 'day', city: 'full',
    pop: (t) => Math.round(1 + (CFG.follower - 1) * easeOut((t - 12.5) / 2.0)),
    cam: [v3(7.0, 6.6, HALF + 84), v3(8.5, 6.7, HALF + 79)], at: [SIGN_CENTER.clone().add(v3(-1, 0, 0)), SIGN_CENTER.clone().add(v3(0.4, 0, 0))] },
  { t0: 15.3, t1: 18.0, pill: 'RULE 2', title: '1 COMMENT = 1 HOUSE', look: 'day', city: 'hidden', house: true,
    cam: [HOUSE_POS.clone().add(v3(17, 3.4, 46)), HOUSE_POS.clone().add(v3(12, 3.2, 40))], at: [HOUSE_POS.clone().add(v3(0, 3.2, 0)), HOUSE_POS.clone().add(v3(0, 3.0, 0))] },
  { t0: 18.0, t1: 19.6, pill: 'RULE 2', title: '1 COMMENT = 1 HOUSE', look: 'day', city: 'hidden', house: true,
    cam: [PLATE_WORLD.clone().add(v3(4.5, -0.9, 12.5)), PLATE_WORLD.clone().add(v3(3.6, -0.9, 10.5))], at: [PLATE_WORLD.clone().add(v3(0.4, -1.4, 0)), PLATE_WORLD.clone().add(v3(0.3, -1.4, 0))] },
  { t0: 19.6, t1: 26.6, pill: 'RULE 3', title: 'TOP COMMENT RULES', look: 'sunset', city: 'hidden', card: true,
    cam: [v3(-2.5, 2.4, 300), v3(-2.5, 2.4, 195)], at: [v3(-2.5, 4, -400), v3(-2.5, 4, -500)] },
  { t0: 26.6, t1: 33.3, pill: 'VOTE NOW', title: 'BUILD WHAT FIRST?', look: 'day', city: 'hidden', vote: true, topdown: true,
    cam: [v3(-6, 300, -12), v3(-9, 255, -22)], at: [v3(-6, 0, -14), v3(-9, 0, -24)] },
  { t0: 33.3, t1: 37.0, pill: 'DAY 1', title: 'RESULTS NEXT EPISODE', look: 'day', city: 'hidden', results: true, pop: () => 1,
    cam: [v3(-4.5, 2.1, HALF + 128), v3(-4.5, 2.1, HALF + 120)], at: [v3(18, 6.0, HALF + 20), v3(25, 6.0, HALF + 10)] },
  { t0: 37.0, t1: DURATION, end: true },
];

// ---------------------------------------------------------------- captions (word start times, seconds)
const CAPTIONS = [
  [['This', 0.0], ['city', 0.33], ['has', 0.67]],
  [['one', 1.0], ['resident.', 1.33]],
  [['Me.', 2.0]],
  [['No', 2.8], ['neighbours,', 3.0]],
  [['no', 3.67], ['shops,', 4.0]],
  [['just', 4.6], ['empty', 5.0], ['roads.', 5.33]],
  [['But', 5.85], ["here's", 6.0], ['the', 6.2], ['plan.', 6.4]],
  [['Every', 7.0], ['video,', 7.33]],
  [['this', 7.67], ['city', 8.0], ['grows,', 8.33]],
  [['built', 9.33], ['by', 9.67], ['real', 9.85]],
  [['people.', 10.05]],
  [['You.', 10.9]],
  [['Rule', 11.67], ['one:', 12.0]],
  [['follow,', 12.33]],
  [['and', 13.15], ["you're", 13.33], ['officially', 13.67]],
  [['a', 14.1], ['citizen.', 14.3]],
  [['Rule', 15.33], ['two:', 15.67]],
  [['comment,', 16.33]],
  [['and', 16.67], ["I'll", 16.85], ['build', 17.0]],
  [['you', 17.33], ['a', 17.45], ['house,', 17.67]],
  [['with', 18.0], ['your', 18.33], ['name', 18.67]],
  [['on', 18.9], ['it.', 19.05]],
  [['Rule', 19.67], ['three:', 20.0]],
  [['the', 20.6], ['most', 20.75], ['liked', 21.0]],
  [['comment', 21.33], ['rules', 21.67], ['the', 21.85]],
  [['city.', 22.0]],
  [['Whatever', 23.0], ['it', 23.2], ['says,', 23.33]],
  [['I', 24.1], ['build.', 24.33]],
  [['No', 25.33], ['matter', 25.67], ['what.', 26.0]],
  [['So,', 26.67]],
  [['what', 27.0], ['do', 27.15], ['we', 27.33]],
  [['build', 27.67], ['first?', 28.0]],
  [['A,', 28.67]],
  [['a', 29.0], ['hospital.', 29.15]],
  [['B,', 30.0]],
  [['a', 30.45], ['stadium.', 30.67]],
  [['Or', 31.5], ['C,', 31.67]],
  [['a', 32.15], ['giant', 32.33], ['mall.', 32.67]],
  [['Vote', 33.33], ['in', 33.5], ['the', 33.67]],
  [['comments.', 34.0]],
  [['Results', 34.67], ['next', 35.33], ['episode.', 35.67]],
];
const CAPTION_END = 37.0;

// ---------------------------------------------------------------- DOM refs
const $ = (id) => document.getElementById(id);
const ui = { pill: $('pill'), title: $('title'), caption: $('caption'), card: $('card'), likeN: $('likeN'), end: $('end'),
  vtags: [$('vA'), $('vB'), $('vC')], opts: [$('oA'), $('oB'), $('oC')], results: $('results'), endPop: $('endPop') };
$('handle').textContent = CFG.handle;
let lastCaption = '';

function fitTitle(text) {
  ui.title.innerHTML = `<span>${text}</span>`; ui.title.style.fontSize = '104px';
  const span = ui.title.firstChild;
  let fs = 104; while (span.offsetWidth > 1000 && fs > 50) { fs -= 2; ui.title.style.fontSize = fs + 'px'; }
}
let lastTitle = '';

function project(p) {
  const v = p.clone().project(camera);
  return { x: (v.x * 0.5 + 0.5) * 1080, y: (-v.y * 0.5 + 0.5) * 1920 };
}

// ---------------------------------------------------------------- frame
export function setTime(t) {
  const shot = SHOTS.find((s) => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
  const k = (t - shot.t0) / (shot.t1 - shot.t0);
  const sinceCut = t - shot.t0;

  // ---- end card
  ui.end.style.display = shot.end ? 'flex' : 'none';
  ui.pill.style.display = ui.title.style.display = shot.end ? 'none' : 'block';
  if (shot.end) {
    ui.caption.innerHTML = ''; ui.card.style.display = 'none'; ui.results.style.display = 'none';
    ui.vtags.forEach((e) => (e.style.display = 'none'));
    const p = clamp((t - shot.t0) / 0.5);
    ui.end.style.opacity = p;
    ui.endPop.textContent = '1';
    return;
  }

  // ---- 3D state
  const L = LOOKS[shot.look];
  sign.visible = !!shot.pop || shot.city === 'full';
  if (shot.pop) setSign(shot.pop(t));
  hero.visible = !!shot.house;
  if (shot.house) {
    const s = shot.t0 === 15.3 ? easeOutBack((t - 15.9) / 0.55) : 1;
    hero.scale.setScalar(Math.max(s, 0.0001));
  }
  votePlanes.forEach((m, i) => {
    m.visible = !!shot.vote;
    const s = easeOutBack((t - (27.0 + i * 0.12)) / 0.4);
    m.scale.setScalar(Math.max(s, 0.0001));
  });

  let focus, span;
  if (shot.orbit) {
    const e = smooth(k);
    const ang = lerp(0.5, 1.05, e), rad = lerp(420, 330, e), h = lerp(250, 150, e);
    camera.position.set(Math.sin(ang) * rad, h, Math.cos(ang) * rad);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, lerp(0, 25, e), 0);
    focus = v3(0, 0, 0); span = 360;
  } else {
    const e = smooth(k) * 0.6 + k * 0.4;
    camera.position.lerpVectors(shot.cam[0], shot.cam[1], e);
    const at = new THREE.Vector3().lerpVectors(shot.at[0], shot.at[1], e);
    if (shot.topdown) camera.up.set(Math.sin(0.12), 0, -Math.cos(0.12)); else camera.up.set(0, 1, 0);
    camera.lookAt(at);
    focus = shot.house ? HOUSE_POS : shot.pop ? SIGN_POS : shot.topdown ? v3(0, 0, -20) : at.clone().setY(0);
    if (shot.look === 'sunset') focus = camera.position.clone().setY(0).add(v3(0, 0, -120));
    span = shot.house || shot.pop ? 60 : shot.topdown ? 200 : 170;
  }
  // punch-in on each cut
  camera.fov = shot.t0 === 0 ? 52 : 52 - 3 * (1 - easeOut(sinceCut / 0.35));
  camera.updateProjectionMatrix();
  applyLook(L, focus, span);
  updateCity(t, shot.city);

  renderer.render(scene, camera);

  // ---- overlays
  ui.pill.textContent = shot.pill;
  if (shot.title !== lastTitle) { fitTitle(shot.title); lastTitle = shot.title; }
  const pop = shot.t0 === 0 ? 1 : easeOutBack(sinceCut / 0.3);
  ui.title.style.transform = `scale(${0.85 + 0.15 * pop})`;
  ui.pill.style.transform = `translateX(-50%) scale(${0.85 + 0.15 * pop})`;

  // captions
  let html = '';
  if (t < CAPTION_END) {
    let ci = -1;
    for (let i = 0; i < CAPTIONS.length; i++) if (CAPTIONS[i][0][1] <= t) ci = i;
    if (ci >= 0) {
      const words = CAPTIONS[ci];
      let wi = 0; for (let i = 0; i < words.length; i++) if (words[i][1] <= t) wi = i;
      const nextStart = ci + 1 < CAPTIONS.length ? CAPTIONS[ci + 1][0][1] : CAPTION_END;
      const lastWordDone = wi === words.length - 1 && t > words[wi][1] + 0.45 && t < nextStart;
      html = words.map(([w], i) => (i === wi && !lastWordDone ? `<span class="hl">${w}</span>` : w)).join(' ');
    }
  }
  if (html !== lastCaption) { ui.caption.innerHTML = html; lastCaption = html; }

  // comment card
  const cardOn = shot.card && t >= 22.85;
  ui.card.style.display = cardOn ? 'block' : 'none';
  if (cardOn) {
    const p = easeOutBack((t - 22.85) / 0.35);
    ui.card.style.transform = `translateX(-50%) scale(${1.2 * (0.6 + 0.4 * p)})`;
    ui.card.style.opacity = clamp(p * 1.5);
    ui.likeN.textContent = Math.round(2650 + 1490 * (t - 22.85) + 260 * Math.pow(Math.max(0, t - 24.5), 2)).toLocaleString('en-US');
  }

  // vote tags
  const tagTimes = [29.15, 30.67, 32.33];
  ui.vtags.forEach((el, i) => {
    const on = shot.vote && t >= tagTimes[i];
    el.style.display = on ? 'block' : 'none';
    if (on) {
      const s = project(VOTE_PLOTS[i].clone().add(v3(-3, 0, -9)));
      const p = easeOutBack((t - tagTimes[i]) / 0.3);
      el.style.left = s.x + 'px'; el.style.top = s.y + 'px';
      el.style.transform = `translate(-100%, -50%) scale(${0.5 + 0.5 * p})`;
      el.style.transformOrigin = '100% 50%';
    }
  });

  // results row
  ui.results.style.display = shot.results ? 'flex' : 'none';
  if (shot.results) {
    [33.45, 33.85, 34.25].forEach((t0, i) => {
      const p = easeOutBack((t - t0) / 0.35);
      ui.opts[i].style.opacity = clamp((t - t0) / 0.12);
      ui.opts[i].style.transform = `scale(${Math.max(0, 0.4 + 0.6 * p)})`;
    });
  }
}

window.setTime = setTime;
window.DURATION = DURATION;
window.sceneReady = document.fonts.ready.then(() => { signShown = -1; drawSign(1); return true; });

// live preview when not driven by the renderer
if (!params.has('render')) {
  window.sceneReady.then(() => {
    const t0 = performance.now();
    const loop = () => { setTime(((performance.now() - t0) / 1000) % DURATION); requestAnimationFrame(loop); };
    loop();
  });
}
