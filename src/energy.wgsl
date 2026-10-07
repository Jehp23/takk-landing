struct Params { time: f32, aspect: f32, pointer: vec2f }
@group(0) @binding(0) var<uniform> params: Params;
@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let center = vec2f(0.76, 0.46) + (params.pointer - vec2f(0.5)) * 0.04;
  let p = (uv - center) * vec2f(params.aspect, 1.0);
  let r = length(p);
  let angle = atan2(p.y, p.x);
  let pulse = 0.82 + sin(params.time * 1.1) * 0.12;
  let ring = pow(max(0.0, 1.0 - abs(fract(r * 3.5 - params.time * 0.15) - 0.5) * 2.0), 24.0) * exp(-r * 1.6);
  let rays = pow(max(0.0, sin(angle * 9.0 + r * 4.0 - params.time * 0.4)), 40.0) * exp(-r * 3.0);
  let streak = exp(-abs(p.y + p.x * 0.27 + sin(params.time * 0.5) * 0.02) * 75.0) * exp(-abs(p.x) * 1.8);
  let color = mix(vec3f(1.0, 0.0, 0.72), vec3f(0.0, 0.92, 1.0), clamp(p.x * 2.0 + 0.5, 0.0, 1.0));
  let mask = smoothstep(0.44, 0.69, uv.x);
  let energy = (ring * 0.23 + rays * 0.38 + streak * 0.65 + exp(-r * 6.0) * 0.2) * pulse * mask;
  return vec4f(color * energy, energy);
}
