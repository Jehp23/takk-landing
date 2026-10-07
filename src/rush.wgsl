struct Params { time: f32, aspect: f32, pointer: vec2f, carrier: f32, burst: f32 }
@group(0) @binding(0) var<uniform> params: Params;
fn palette(i: f32) -> vec3f {
  if (i < 0.5) { return vec3f(0.0, 0.92, 1.0); }
  if (i < 1.5) { return vec3f(1.0, 0.0, 0.72); }
  if (i < 2.5) { return vec3f(0.74, 1.0, 0.0); }
  return vec3f(0.62, 0.15, 1.0);
}
fn rotate(p: vec3f, a: f32) -> vec3f {
  return vec3f(cos(a)*p.x-sin(a)*p.z,p.y,sin(a)*p.x+cos(a)*p.z);
}
fn crystalSpace(p: vec3f) -> vec3f {
  let yaw = rotate(p, params.time * 0.22 + 0.52);
  let tilt = 0.06 + sin(params.time * 0.18) * 0.035;
  return vec3f(yaw.x, cos(tilt)*yaw.y-sin(tilt)*yaw.z, sin(tilt)*yaw.y+cos(tilt)*yaw.z);
}
fn core(p: vec3f) -> f32 {
  // Eight triangular planes meet at a wide waist and two long, sharp tips.
  let q = abs(crystalSpace(p) / vec3f(0.72,0.85,0.72));
  return (q.x+q.y+q.z-1.0) * 0.415;
}
fn prism(seed: f32) -> vec3f {
  let cyan = vec3f(0.34,0.91,1.0);
  let pink = vec3f(1.0,0.34,0.9);
  let violet = vec3f(0.66,0.55,1.0);
  let hue = fract(sin(seed*17.31+4.2)*437.13);
  if (hue < 0.34) { return mix(cyan,vec3f(0.96,1.0,1.0),hue*1.9); }
  if (hue < 0.7) { return mix(violet,pink,(hue-0.34)*2.78); }
  return mix(pink,vec3f(1.0,0.98,1.0),(hue-0.7)*3.33);
}
fn segment(p: vec2f,a: vec2f,b: vec2f) -> f32 {
  let d=b-a;
  return length(p-a-d*clamp(dot(p-a,d)/dot(d,d),0.0,1.0));
}
@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let p = (uv-vec2f(0.5,0.45) - (params.pointer-vec2f(0.5))*0.025)*vec2f(params.aspect,1.0);
  let tint = palette(params.carrier);
  var color = vec3f(0.023,0.016,0.05) + tint * exp(-length(p)*5.0)*0.1;
  // A projected tactical floor. Parallel lines converge toward the Core.
  let depth = max(0.08,uv.y*0.8+0.08);
  let floorUV = vec2f(p.x/depth,1.0/depth);
  let grid = abs(fract(floorUV*4.0)-0.5);
  let gridLine = 1.0-smoothstep(0.012,0.032,min(grid.x,grid.y));
  color += vec3f(0.15,0.055,0.3)*gridLine*0.5;
  let orbit = vec2f(p.x,p.y*2.3);
  let radius = length(orbit);
  color += tint * exp(-abs(radius-0.55)*100.0)*0.45;
  color += vec3f(0.36,0.08,1.0)*exp(-abs(radius-0.8)*110.0)*0.3;
  // Each carrier has an angular escape route. Dashes run toward the object.
  for (var i=0; i<4; i++) {
    let index=f32(i);
    let angle=index*1.5708+0.4+sin(params.time*0.35+index)*0.12;
    let outer=vec2f(cos(angle)*0.66,sin(angle)*0.29);
    let elbow=vec2f(outer.x*0.42,outer.y);
    let route=min(segment(p,outer,elbow),segment(p,elbow,vec2f(0.0,0.11)));
    let carrierColor=palette(index);
    let selected=select(0.23,0.75,abs(index-params.carrier)<0.1);
    let dash=0.5+0.5*sin(length(p-outer)*70.0-params.time*7.0);
    color += carrierColor*exp(-route*150.0)*selected*(0.35+dash*0.65);
    let t=fract(params.time*0.13+index*0.23);
    let runner=mix(outer,elbow,t);
    let d=length((p-runner)*vec2f(1.0,1.65));
    color += carrierColor*(exp(-d*130.0)*1.7+exp(-d*30.0)*0.12);
    let diamond=abs(p.x-runner.x)+abs((p.y-runner.y)*1.65);
    color += carrierColor*(1.0-smoothstep(0.016,0.02,diamond))*0.9;
  }
  // Bounded raymarch of the floating prismatic crystal.
  let ro=vec3f(0.0,0.0,2.8);
  let rd=normalize(vec3f(p.x*2.4,-p.y*2.4,-2.3));
  var distance=0.0;
  var hit=false;
  for (var step=0;step<48;step++) {
    let d=core(ro+rd*distance);
    if (d<0.0015) { hit=true; break; }
    distance+=d;
    if (distance>5.0) { break; }
  }
  if (hit) {
    let point=ro+rd*distance;
    let e=0.002;
    let normal=normalize(vec3f(core(point+vec3f(e,0,0))-core(point-vec3f(e,0,0)),core(point+vec3f(0,e,0))-core(point-vec3f(0,e,0)),core(point+vec3f(0,0,e))-core(point-vec3f(0,0,e))));
    let view = -rd;
    let local = crystalSpace(point);
    let q = abs(local / vec3f(0.72,0.85,0.72));
    let bary = q / (q.x+q.y+q.z);
    // A barycentric triangular lattice subdivides each main face into 16 facets.
    let lattice = bary*4.0;
    let cell = floor(lattice);
    let fractional = fract(lattice);
    let inverted = select(0.0,1.0,fractional.x+fractional.y+fractional.z>1.5);
    let side = dot(sign(local),vec3f(1.0,3.0,7.0));
    let seed = dot(cell,vec3f(3.17,7.11,13.37))+inverted*5.3+side;
    let faceColor = prism(seed);
    let lineDistance = min(min(min(fractional.x,1.0-fractional.x),min(fractional.y,1.0-fractional.y)),min(fractional.z,1.0-fractional.z));
    let seams = 1.0-smoothstep(0.009,0.027,lineDistance);
    let light = normalize(vec3f(-0.7,0.85,1.2));
    let facing = max(0.0,dot(normal,view));
    let illumination = max(0.0,dot(normal,light));
    let fresnel = pow(1.0-facing,2.5);
    // Back-lit facets stay luminous: no dark metallic ceiling or chrome bands.
    color = faceColor*(0.67+illumination*0.28);
    color = mix(color,vec3f(0.98,0.97,1.0),0.2+facing*0.08);
    color += vec3f(0.9,0.95,1.0)*seams*0.26;
    let nucleus = exp(-length(p*vec2f(1.0,0.86))*22.0);
    color += vec3f(1.0,0.94,1.0)*nucleus*0.8;
    let edgeTint = mix(vec3f(0.15,0.9,1.0),vec3f(1.0,0.08,0.79),smoothstep(-0.3,0.3,p.x));
    color += edgeTint*fresnel*0.35;
    let waist = exp(-abs(local.y)*32.0);
    color += vec3f(1.0,0.91,1.0)*waist*0.12;

  }
  // Localized halo follows the projected pointed diamond silhouette.
  let outline = abs(p.x)/0.265+abs(p.y)/0.29;
  let halo = exp(-abs(outline-1.0)*19.0);
  let prismGlow = mix(vec3f(0.12,0.69,1.0),vec3f(1.0,0.02,0.75),smoothstep(-0.2,0.2,p.x));
  color += prismGlow*halo*0.17;
  color += vec3f(0.7,0.12,1.0)*exp(-length(p)*10.0)*0.13;
  let wave=params.burst*0.85;
  color += tint*exp(-abs(radius-wave)*65.0)*max(0.0,1.0-params.burst)*select(0.0,1.4,params.burst>0.001);
  color *= 1.0-smoothstep(0.42,0.82,length(p))*0.45;
  return vec4f(color,1.0);
}
