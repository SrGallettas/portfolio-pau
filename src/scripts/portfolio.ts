import { createIcons, ArrowUpRight, ArrowDownRight, ArrowRight, Asterisk, Pause, Play, RotateCcw, SlidersHorizontal, Check, MousePointer2, Braces, CircleDot, Plus, Download } from 'lucide';

const icons = { ArrowUpRight, ArrowDownRight, ArrowRight, Asterisk, Pause, Play, RotateCcw, SlidersHorizontal, Check, MousePointer2, Braces, CircleDot, Plus, Download };
const refreshIcons = () => createIcons({ icons });
refreshIcons();

const menuButton = document.querySelector<HTMLButtonElement>('.menu-toggle');
const mainNav = document.querySelector<HTMLElement>('#main-nav');
menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  const label = menuButton.querySelector<HTMLElement>('.sr-only');
  if (label) label.textContent = open ? 'Cerrar menú' : 'Abrir menú';
  mainNav?.classList.toggle('is-open', open);
});
mainNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  menuButton?.setAttribute('aria-expanded', 'false');
  mainNav.classList.remove('is-open');
}));

const ticker = document.querySelector<HTMLElement>('.ticker');
const tickerTrack = ticker?.querySelector<HTMLElement>('.ticker-track');
const tickerRun = tickerTrack?.querySelector<HTMLElement>('.ticker-run');
if (ticker && tickerTrack && tickerRun) {
  function fillTicker() {
    tickerTrack!.replaceChildren(tickerRun!);
    const distance = tickerRun!.getBoundingClientRect().width;
    if (!distance) return;
    tickerTrack!.style.setProperty('--ticker-distance', `${distance}px`);
    while (tickerTrack!.scrollWidth < ticker!.clientWidth + distance * 2 && tickerTrack!.children.length < 30) {
      tickerTrack!.appendChild(tickerRun!.cloneNode(true));
    }
  }
  fillTicker();
  document.fonts.ready.then(fillTicker);
  window.addEventListener('resize', fillTicker);
}

type Piece = { x: number; y: number; angle: number; scale: number };
type Design = { title: string; accent: 'blue' | 'coral' | 'green'; radius: number; dark: boolean; pieces: Piece[] };
const defaultPieces: Piece[] = [
  { x: 31, y: 52, angle: -30, scale: 1 },
  { x: 40, y: 48, angle: -15, scale: 1 },
  { x: 50, y: 50, angle: 0, scale: 1 },
  { x: 60, y: 48, angle: 15, scale: 1 },
  { x: 69, y: 52, angle: 30, scale: 1 },
];
const defaults: Design = { title: 'Mi próxima idea', accent: 'blue', radius: 4, dark: false, pieces: defaultPieces };
const freshDefaults = (): Design => ({ ...defaults, pieces: defaultPieces.map(piece => ({ ...piece })) });
let state = freshDefaults();
const colors = { blue: '#294ae8', coral: '#b83d4b', green: '#366b50' };
const storageKey = 'pau-playground-v2';
let saved = '';
const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const title = el<HTMLInputElement>('project-title');
const radius = el<HTMLInputElement>('radius');
const dark = el<HTMLInputElement>('dark');
const preview = el<HTMLElement>('design-preview');
const valid = () => state.title.trim().length > 0;
const pieceIsValid = (piece: unknown): piece is Piece => {
  if (!piece || typeof piece !== 'object') return false;
  const candidate = piece as Record<string, unknown>;
  return typeof candidate.x === 'number' && candidate.x >= 10 && candidate.x <= 90
    && typeof candidate.y === 'number' && candidate.y >= 20 && candidate.y <= 80
    && typeof candidate.angle === 'number' && candidate.angle >= -60 && candidate.angle <= 60
    && typeof candidate.scale === 'number' && candidate.scale >= .7 && candidate.scale <= 1.3;
};

// Restore only supported properties, including their bounds.
try {
  const raw = localStorage.getItem(storageKey);
  if (raw) {
    const data = JSON.parse(raw);
    if (typeof data?.title === 'string' && data.title.trim() && data.title.length <= 36 && Object.hasOwn(colors, data.accent) && Number.isInteger(data.radius) && data.radius >= 0 && data.radius <= 8 && typeof data.dark === 'boolean') {
      state = { title: data.title, accent: data.accent, radius: data.radius, dark: data.dark,
        pieces: Array.isArray(data.pieces) && data.pieces.length === 5 && data.pieces.every(pieceIsValid)
          ? data.pieces : defaultPieces.map(piece => ({ ...piece })) };
      saved = JSON.stringify(state);
    }
  }
} catch { /* Browser storage may be unavailable. */ }

function render() {
  preview.style.setProperty('--accent', colors[state.accent]);
  preview.style.borderRadius = `${state.radius}px`;
  preview.classList.toggle('dark', state.dark);
  const previewTitle = el('preview-title');
  previewTitle.textContent = state.title.trim() || 'Sin título';
  previewTitle.style.fontSize = state.title.length > 24 ? '16px' : state.title.length > 18 ? '20px' : '';
  el('radius-output').textContent = `${state.radius} px`;
  title.setAttribute('aria-invalid', String(!valid()));
  el('title-error').textContent = valid() ? 'Hasta 36 caracteres.' : 'Escribe un nombre para guardar.';
  el('title-error').classList.toggle('error', !valid());
  document.querySelectorAll<HTMLButtonElement>('[data-color]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.color === state.accent)));
  document.querySelectorAll<HTMLElement>('[data-piece]').forEach((piece, index) => {
    const position = state.pieces[index];
    piece.style.left = `${position.x}%`;
    piece.style.top = `${position.y}%`;
    piece.style.setProperty('--angle', `${position.angle}deg`);
    piece.style.setProperty('--scale', String(position.scale));
  });
  el('state-json').textContent = JSON.stringify({ ...state, pieces: state.pieces.map(piece => [Math.round(piece.x), Math.round(piece.y)]) }, null, 2);
  el('validation-state').textContent = valid() ? 'Válida' : 'Inválida';
  el('validation-result').textContent = valid() ? 'Nombre válido' : 'Falta el nombre';
  el('save-result').textContent = !saved ? 'Sin guardar' : saved === JSON.stringify(state) ? 'Actualizado' : 'Cambios pendientes';
}
function syncControls() { title.value = state.title; radius.value = String(state.radius); dark.checked = state.dark; render(); }
function changed() { render(); el('save-status').textContent = saved === JSON.stringify(state) ? 'Sin cambios pendientes.' : 'Cambios sin guardar.'; }
title.addEventListener('input', () => { state.title = title.value; changed(); });
radius.addEventListener('input', () => { state.radius = Number(radius.value); changed(); });
dark.addEventListener('change', () => { state.dark = dark.checked; changed(); });
document.querySelectorAll<HTMLButtonElement>('[data-color]').forEach(button => button.addEventListener('click', () => { state.accent = button.dataset.color as Design['accent']; changed(); }));
el('design-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!valid()) { el('save-status').textContent = 'Falta el nombre del diseño.'; title.focus(); return; }
  try { localStorage.setItem(storageKey, JSON.stringify(state)); saved = JSON.stringify(state); render(); el('save-status').textContent = 'Diseño guardado en este navegador.'; }
  catch { el('save-status').textContent = 'El navegador no permite guardar el diseño.'; }
});
el('reset').addEventListener('click', () => { state = freshDefaults(); syncControls(); changed(); });
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const random = (min: number, max: number) => min + Math.random() * (max - min);
el('mix-design').addEventListener('click', () => {
  state.pieces = defaultPieces.map((_, index) => ({
    x: Math.round(clamp(20 + index * 15 + random(-7, 7), 12, 88)),
    y: Math.round(random(33, 67)),
    angle: Math.round(random(-42, 42)),
    scale: Math.round(random(.8, 1.2) * 100) / 100,
  }));
  state.accent = (['blue', 'coral', 'green'] as const)[Math.floor(Math.random() * 3)];
  syncControls(); changed();
});
const art = el<HTMLElement>('preview-art');
document.querySelectorAll<HTMLButtonElement>('[data-piece]').forEach(piece => {
  const index = Number(piece.dataset.piece);
  let drag: { pointerId: number; x: number; y: number; originX: number; originY: number } | null = null;
  piece.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY,
      originX: state.pieces[index].x, originY: state.pieces[index].y };
    piece.setPointerCapture(event.pointerId);
    piece.classList.add('dragging');
  });
  piece.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const bounds = art.getBoundingClientRect();
    state.pieces[index].x = clamp(drag.originX + (event.clientX - drag.x) / bounds.width * 100, 10, 90);
    state.pieces[index].y = clamp(drag.originY + (event.clientY - drag.y) / bounds.height * 100, 20, 80);
    changed();
  });
  const stopDrag = () => { if (!drag) return; drag = null; piece.classList.remove('dragging'); };
  piece.addEventListener('pointerup', stopDrag);
  piece.addEventListener('pointercancel', stopDrag);
  piece.addEventListener('lostpointercapture', stopDrag);
  piece.addEventListener('keydown', event => {
    const amount = event.shiftKey ? 10 : 2;
    const position = state.pieces[index];
    if (event.key === 'ArrowLeft') position.x = clamp(position.x - amount, 10, 90);
    else if (event.key === 'ArrowRight') position.x = clamp(position.x + amount, 10, 90);
    else if (event.key === 'ArrowUp') position.y = clamp(position.y - amount, 20, 80);
    else if (event.key === 'ArrowDown') position.y = clamp(position.y + amount, 20, 80);
    else return;
    event.preventDefault(); changed();
  });
});
const designPanel = el<HTMLElement>('design-panel');
const logicPanel = el<HTMLElement>('logic-panel');
function matchLogicHeight() {
  if (document.querySelector<HTMLElement>('#visual-playground')?.hidden) return;
  const wasHidden = designPanel.hidden;
  if (wasHidden) { logicPanel.hidden = true; designPanel.hidden = false; }
  logicPanel.style.height = `${designPanel.getBoundingClientRect().height}px`;
  if (wasHidden) { designPanel.hidden = true; logicPanel.hidden = false; }
}
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-view]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
  if (button.dataset.view === 'logic') {
    matchLogicHeight();
    designPanel.hidden = true;
    logicPanel.hidden = false;
  } else {
    logicPanel.hidden = true;
    designPanel.hidden = false;
    logicPanel.style.height = '';
  }
}));
window.addEventListener('resize', () => { if (!logicPanel.hidden) matchLogicHeight(); });
syncControls();
if (saved) el('save-status').textContent = 'Diseño recuperado de este navegador.';

const canvas = el<HTMLCanvasElement>('sculpture');
const hero = document.querySelector<HTMLElement>('.hero')!;
const media = matchMedia('(prefers-reduced-motion: reduce)');
let paused = media.matches;
const motion = el<HTMLButtonElement>('motion');
function motionLabel() {
  const label = paused ? 'Reanudar animación' : 'Pausar animación';
  motion.setAttribute('aria-label', label); motion.title = label;
  motion.setAttribute('aria-pressed', String(paused));
  motion.innerHTML = `<i data-lucide="${paused ? 'play' : 'pause'}"></i>`;
  refreshIcons();
}
motionLabel();
async function initSculpture() {
try {
  const THREE = await import('three');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 12);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x798b61, 3));
  const light = new THREE.DirectionalLight(0xffffff, 4); light.position.set(-3, 6, 8); scene.add(light);
  const sculpture = new THREE.Group();
  const geometry = new THREE.BoxGeometry(3.2, .12, 1.65);
  const palette = [0xd9f87a, 0xd9f87a, 0x294ae8, 0x252922];
  for (let index = 0; index < 23; index++) {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: palette[Math.floor(index / 6) % palette.length], roughness: .32, metalness: .15 }));
    mesh.position.y = (index - 11) * .155;
    mesh.rotation.y = index * .115;
    sculpture.add(mesh);
  }
  sculpture.rotation.set(.4, .3, -.3); scene.add(sculpture);
  let targetX = 0, targetY = 0, phase = 0, visible = true, frame = 0, previous = 0;
  function resize() {
    const phoneLayout = hero.clientWidth <= 700;
    const width = phoneLayout ? canvas.clientWidth : hero.clientWidth;
    const height = phoneLayout ? canvas.clientHeight : hero.clientHeight;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    const phone = hero.clientWidth <= 700;
    const tablet = hero.clientWidth > 700 && hero.clientWidth <= 1050;
    const scale = phone ? (hero.clientHeight < 600 ? .28 : .36) : tablet ? .76 : .98;
    sculpture.scale.setScalar(scale);
    sculpture.position.set(phone ? .85 : tablet ? 1.35 : 2.45, phone ? -.25 : tablet ? -.15 : .3, 0);
    renderer.render(scene, camera);
  }
  new ResizeObserver(resize).observe(hero);
  hero.addEventListener('pointermove', event => { if (media.matches) return; const bounds = hero.getBoundingClientRect(); targetX = ((event.clientX - bounds.left) / bounds.width - .5) * .4; targetY = ((event.clientY - bounds.top) / bounds.height - .5) * .3; });
  hero.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; });
  function draw(now: number) {
    frame = 0;
    if (!visible || document.hidden || paused) { previous = 0; return; }
    const delta = previous ? Math.min((now - previous) / 1000, .05) : 0;
    previous = now; phase += delta * .22;
    sculpture.rotation.y = .3 + phase + targetX;
    sculpture.rotation.x += (.4 + targetY - sculpture.rotation.x) * .06;
    renderer.render(scene, camera); frame = requestAnimationFrame(draw);
  }
  function start() { if (!frame && !paused && visible && !document.hidden) frame = requestAnimationFrame(draw); }
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; start(); }).observe(hero);
  document.addEventListener('visibilitychange', start);
  motion.addEventListener('click', () => { paused = !paused; motionLabel(); start(); });
  media.addEventListener('change', () => { paused = media.matches; motionLabel(); start(); });
  resize(); start();
} catch {
  canvas.hidden = true; motion.hidden = true;
}
}
void initSculpture();
