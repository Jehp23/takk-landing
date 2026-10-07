const root = document.documentElement;
const toggle = document.querySelector('#motion-toggle');
const stage = document.querySelector('.rush-stage');
const status = document.querySelector('#rush-status');
const carrierLabel = document.querySelector('.rush-carrier');
const scenes = {
  hero: { element: document.querySelector('.hero'), canvas: document.querySelector('.hero-energy'), visible: false },
  rush: { element: stage, canvas: document.querySelector('.rush-energy'), visible: false },
};
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const compact = matchMedia('(max-width: 700px), (pointer: coarse)');
const carriers = ['cyan', 'pink', 'lime', 'violet'];
let enabled = true;
let renderer;
let loading = false;
let failed = false;
let steals = 0;
try { enabled = localStorage.getItem('takk-motion') !== 'off'; } catch {}
Object.values(scenes).forEach(({ canvas }) => {
  canvas.dataset.gpuState = 'idle';
  canvas.dataset.renderState = 'paused';
  canvas.dataset.frameCount = '0';
});
function fallback(error) {
  failed = true;
  renderer?.dispose();
  Object.values(scenes).forEach(({ canvas }) => {
    canvas.dataset.gpuState = 'fallback';
    canvas.dataset.renderState = 'paused';
    canvas.hidden = true;
    if (error) canvas.dataset.failure = error.code || error.name || 'unavailable';
  });
  stage.dataset.renderState = 'paused';
}
async function loadEnergy() {
  if (loading || renderer || failed) return;
  if (!navigator.gpu) { fallback(); return; }
  loading = true;
  Object.values(scenes).forEach(({ canvas }) => { canvas.dataset.gpuState = 'loading'; });
  try {
    const { createEnergy } = await import('./gpu.js');
    renderer = await createEnergy(Object.fromEntries(Object.entries(scenes).map(([name, scene]) => [name, scene.canvas])), fallback);
    if (failed) { renderer.dispose(); return; }
    renderer.steal(steals % carriers.length);
  } catch (error) { fallback(error); }
  finally { loading = false; update(); }
}
function update() {
  const active = enabled && !reduced.matches;
  const playing = active && !document.hidden;
  root.classList.toggle('motion-active', playing);
  root.classList.toggle('motion-paused', !playing);
  root.dataset.motionState = playing ? 'playing' : 'paused';
  root.dataset.heroVisible = String(scenes.hero.visible);
  toggle.setAttribute('aria-pressed', String(active));
  toggle.textContent = active ? 'Motion on' : 'Motion off';
  toggle.setAttribute('aria-label', reduced.matches ? 'Motion disabled by system preference' : active ? 'Pause animations' : 'Enable animations');
  toggle.disabled = reduced.matches;
  const states = {};
  for (const [name, scene] of Object.entries(scenes)) {
    states[name] = playing && scene.visible && !compact.matches && !failed;
    scene.canvas.hidden = !states[name];
    scene.canvas.dataset.renderState = states[name] && renderer ? 'playing' : 'paused';
  }
  stage.dataset.renderState = states.rush && renderer ? 'playing' : 'paused';
  if (renderer && !failed) { renderer.resize(); renderer.active(states); }
  else if (Object.values(states).some(Boolean)) loadEnergy();
}
toggle.addEventListener('click', () => {
  enabled = !enabled;
  try { localStorage.setItem('takk-motion', enabled ? 'on' : 'off'); } catch {}
  update();
});
document.querySelector('#steal-core').addEventListener('click', () => {
  steals++;
  const carrier = carriers[steals % carriers.length];
  stage.dataset.carrier = carrier;
  stage.dataset.steals = String(steals);
  scenes.rush.canvas.dataset.carrier = carrier;
  carrierLabel.textContent = `CARRIER / ${carrier.toUpperCase()}`;
  status.textContent = `${carrier[0].toUpperCase() + carrier.slice(1)} stole the Core. The chase changes direction.`;
  renderer?.steal(steals % carriers.length);
});
reduced.addEventListener('change', update);
compact.addEventListener('change', update);
document.addEventListener('visibilitychange', update);
for (const [name, scene] of Object.entries(scenes)) {
  new IntersectionObserver(([entry]) => {
    scene.visible = entry.isIntersecting;
    update();
  }, { threshold: 0.05 }).observe(scene.element);
  scene.element.addEventListener('pointermove', (event) => {
    if (!renderer || compact.matches || root.dataset.motionState !== 'playing') return;
    const rect = scene.element.getBoundingClientRect();
    renderer.pointer(name, (event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
  }, { passive: true });
  scene.element.addEventListener('pointerleave', () => renderer?.pointer(name, 0.5, 0.5));
}
for (const element of document.querySelectorAll('.passport, .arena-feature')) {
  new IntersectionObserver(([entry]) => {
    element.dataset.motionVisible = String(entry.isIntersecting);
  }, { threshold: 0.1 }).observe(element);
}
const card = document.querySelector('.passport-card');
card.addEventListener('pointermove', (event) => {
  if (compact.matches || root.dataset.motionState !== 'playing') return;
  const rect = card.getBoundingClientRect();
  card.style.setProperty('--tilt-x', `${(0.5 - (event.clientY - rect.top) / rect.height) * 8}deg`);
  card.style.setProperty('--tilt-y', `${((event.clientX - rect.left) / rect.width - 0.5) * 8}deg`);
}, { passive: true });
card.addEventListener('pointerleave', () => {
  card.style.setProperty('--tilt-x', '0deg');
  card.style.setProperty('--tilt-y', '0deg');
});
window.addEventListener('resize', () => renderer?.resize(), { passive: true });
window.addEventListener('pagehide', () => renderer?.stop());
window.addEventListener('pageshow', update);
// Copy and controls never move; only the decorative passport enters.
if (enabled && !reduced.matches) {
  card.classList.add('reveal-ready');
  const reveal = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { card.classList.add('revealed'); reveal.disconnect(); }
  }, { threshold: 0.12 });
  reveal.observe(card);
}
update();
