import { init, surface, effect, frameLoop } from 'vgpu';
import heroShader from './energy.wgsl';
import rushShader from './rush.wgsl';

// Two scenes share one context and one capped loop. Invisible scenes encode no pass.
export async function createEnergy(canvases, onFailure) {
  const gpu = await init({ powerPreference: 'low-power' });
  let loop;
  let previous = 0;
  let carrier = 0;
  let burst = 1;
  let disposed = false;
  const scenes = [];
  function stop() {
    loop?.stop();
    loop = undefined;
    scenes.forEach(({ canvas }) => { canvas.dataset.renderState = 'paused'; });
  }
  function failure(error) {
    if (disposed) return;
    stop();
    onFailure(error);
  }
  try {
    gpu.onError(failure);
    gpu.gpu.lost.then(failure);
    const format = navigator.gpu.getPreferredCanvasFormat();
    for (const [name, canvas] of Object.entries(canvases)) {
      const target = surface(gpu, canvas, { autoResize: false, size: [1, 1], dpr: 1, format });
      const pointer = [0.5, 0.5];
      const params = name === 'rush'
        ? { time: 0, aspect: 1, pointer, carrier, burst }
        : { time: 0, aspect: 1, pointer };
      const shader = effect(gpu, name === 'rush' ? rushShader : heroShader, {
        label: `TAKK ${name} energy`, set: { params },
      });
      scenes.push({ name, canvas, target, shader, pointer, active: false, time: 0, frames: 0 });
      // A swapchain exists only inside frames. Prewarm the explicit target signature.
      await shader.compile({ colors: [format] });
      canvas.dataset.gpuState = 'ready';
    }
    function resize() {
      scenes.forEach(({ name, canvas, target, shader }) => {
        const rect = canvas.getBoundingClientRect();
        const scale = Math.min(1, (name === 'hero' ? 1280 : 960) / Math.max(rect.width, 1));
        target.resize([Math.max(1, rect.width * scale), Math.max(1, rect.height * scale)]);
        shader.set({ params: { aspect: rect.width / Math.max(rect.height, 1) } });
      });
    }
    function sync() {
      const active = scenes.some((scene) => scene.active);
      scenes.forEach(({ canvas, active }) => { canvas.dataset.renderState = active ? 'playing' : 'paused'; });
      if (!active) { stop(); return; }
      if (loop) return;
      previous = performance.now();
      loop = frameLoop(gpu, (frame) => {
        try {
          const now = performance.now();
          const delta = Math.min((now - previous) / 1000, 0.1);
          previous = now;
          for (const scene of scenes) {
            if (!scene.active) continue;
            scene.time += delta;
            if (scene.name === 'rush') burst = Math.min(1, burst + delta * 1.1);
            scene.shader.set({ params: scene.name === 'rush'
              ? { time: scene.time, pointer: scene.pointer, carrier, burst }
              : { time: scene.time, pointer: scene.pointer } });
            frame.pass(scene.target, scene.shader);
            scene.frames++;
            if (scene.frames % 15 === 0) scene.canvas.dataset.frameCount = String(scene.frames);
          }
        } catch (error) { failure(error); }
      }, { fps: 30 });
    }
    resize();
    return {
      resize,
      active(states) {
        scenes.forEach((scene) => { scene.active = Boolean(states[scene.name]); });
        sync();
      },
      pointer(name, x, y) {
        const scene = scenes.find((scene) => scene.name === name);
        if (scene) { scene.pointer[0] = x; scene.pointer[1] = y; }
      },
      steal(value) { carrier = value; burst = 0; },
      stop,
      dispose() { disposed = true; stop(); gpu.dispose(); },
    };
  } catch (error) { disposed = true; stop(); gpu.dispose(); throw error; }
}
