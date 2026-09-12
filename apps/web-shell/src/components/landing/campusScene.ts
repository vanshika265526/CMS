import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { GammaCorrectionShader } from "three/examples/jsm/shaders/GammaCorrectionShader.js";

const GOLD = new THREE.Color("#ffb347");
const GOLD_HOT = new THREE.Color("#ffd89b");
const BLUE = new THREE.Color("#2f7fff");
const CYAN = new THREE.Color("#7fd8ff");
const VIOLET = new THREE.Color("#8b7dff");

export interface QualityTier {
  particles: number;
  nodes: number;
  sphereSegments: number;
  bloomStrength: number;
  maxPixelRatio: number;
  beams: boolean;
}

export const QUALITY: Record<"mobile" | "tablet" | "desktop", QualityTier> = {
  mobile: {
    particles: 420,
    nodes: 4,
    sphereSegments: 96,
    bloomStrength: 0.34,
    maxPixelRatio: 1.5,
    beams: true,
  },
  tablet: {
    particles: 900,
    nodes: 6,
    sphereSegments: 128,
    bloomStrength: 0.40,
    maxPixelRatio: 1.75,
    beams: true,
  },
  desktop: {
    particles: 1700,
    nodes: 8,
    sphereSegments: 192,
    bloomStrength: 0.46,
    maxPixelRatio: 2,
    beams: true,
  },
};

/* ------------------------------------------------------------------ *
 * Shared GLSL helpers
 * ------------------------------------------------------------------ */

const NOISE_GLSL = /* glsl */ `
  vec3 hash33(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return fract(sin(p) * 43758.5453123);
  }

  float hash13(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float valueNoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash13(i + vec3(0,0,0)), hash13(i + vec3(1,0,0)), f.x),
          mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x),
          mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y),
      f.z);
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * valueNoise(p);
      p *= 2.02;
      a *= 0.5;
    }
    return v;
  }
`;

/* ------------------------------------------------------------------ *
 * The digital-campus sphere
 * ------------------------------------------------------------------ */

const planetVertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vPosL;

  void main() {
    vPosL = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vPosW = worldPos.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const planetFragment = /* glsl */ `
  uniform float uTime;
  uniform float uReveal;      // 0..1 entrance progress
  uniform float uGold;        // gold light intensity
  uniform float uBlue;        // blue light intensity
  uniform vec3  uGoldDir;
  uniform vec3  uBlueDir;
  uniform vec3  uGoldColor;
  uniform vec3  uGoldHot;
  uniform vec3  uBlueColor;
  uniform vec3  uCyanColor;
  uniform vec3  uCameraPos;

  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vPosL;

  ${NOISE_GLSL}

  // Soft wrapped diffuse so the terminator stays wide and atmospheric
  // rather than snapping to a hard day/night line.
  float wrapDiffuse(vec3 n, vec3 l, float wrap) {
    return clamp((dot(n, l) + wrap) / (1.0 + wrap), 0.0, 1.0);
  }

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(uCameraPos - vPosW);
    vec3 sphereDir = normalize(vPosL);

    // A tight wrap keeps both lights grazing. They sit off to the sides and
    // slightly behind, so the face of the sphere stays dark and the light
    // collects on the limb — the horizon glow the composition is built on.
    float goldTerm = wrapDiffuse(N, normalize(uGoldDir), 0.12);
    float blueTerm = wrapDiffuse(N, normalize(uBlueDir), 0.12);

    goldTerm = pow(goldTerm, 2.0) * uGold;
    blueTerm = pow(blueTerm, 2.0) * uBlue;

    // --- Landmass / terrain modulation ------------------------------
    float land = fbm(sphereDir * 2.6 + vec3(0.0, 0.0, uTime * 0.006));
    float continents = smoothstep(0.42, 0.62, land);
    float relief = fbm(sphereDir * 7.0) * 0.5 + 0.5;

    // Base surface is a deep, desaturated navy so the light does the talking.
    vec3 base = mix(vec3(0.004, 0.009, 0.022), vec3(0.010, 0.020, 0.042), continents * relief);

    // --- Illuminated campus structures ------------------------------
    // Dense grid of tiny emissive points, clustered onto "land" and
    // strongest on the unlit side where city light actually reads.
    float night = 1.0 - clamp(goldTerm + blueTerm, 0.0, 1.0);
    vec3 cellP = sphereDir * 120.0;
    vec3 cell = floor(cellP);
    float cityHash = hash13(cell);
    float cluster = smoothstep(0.48, 0.78, land);
    float isCity = step(0.955 - cluster * 0.075, cityHash);

    vec3 cellFract = fract(cellP) - 0.5;
    float dotFalloff = 1.0 - smoothstep(0.0, 0.42, length(cellFract));
    float twinkle = 0.72 + 0.28 * sin(uTime * 1.7 + cityHash * 62.8);

    float cityIntensity = isCity * dotFalloff * twinkle * cluster;
    vec3 cityWarm = mix(uGoldHot, uCyanColor, hash13(cell + 7.31));
    vec3 cityLights = cityWarm * cityIntensity * (0.35 + night * 1.5) * 2.4;

    // Faint grid lines suggesting mapped campus infrastructure
    vec2 grid = abs(fract(vec2(atan(sphereDir.z, sphereDir.x) * 6.0, sphereDir.y * 14.0)) - 0.5);
    float gridLine = (1.0 - smoothstep(0.0, 0.035, min(grid.x, grid.y))) * continents * night * 0.09;

    // --- Composite lighting -----------------------------------------
    vec3 lit = base;
    lit += uGoldColor * goldTerm * 1.15;
    lit += uBlueColor * blueTerm * 1.15;

    // Where the two grazing lights overlap — the top of the arc — push toward
    // a hot white-blue core, as in the reference.
    float meet = smoothstep(0.0, 0.55, goldTerm) * smoothstep(0.0, 0.55, blueTerm);
    lit += mix(uCyanColor, vec3(1.0), 0.6) * meet * 1.5;

    lit += cityLights;
    lit += uCyanColor * gridLine;

    // --- Rim / atmospheric edge -------------------------------------
    // The limb is where most of the light lives: a thin, bright arc.
    float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.6);
    vec3 rimColor = mix(uGoldColor, uBlueColor, clamp(N.x * 0.5 + 0.5, 0.0, 1.0));
    lit += rimColor * fres * 0.85 * max(uGold, uBlue);
    lit += vec3(0.55, 0.78, 1.0) * pow(fres, 1.8) * 0.35 * max(uGold, uBlue);

    // Entrance reveal sweeps light in from the horizon upward.
    float revealMask = smoothstep(-1.0, 0.65, sphereDir.y * 1.4 - (1.0 - uReveal) * 2.2);
    lit *= mix(0.06, 1.0, revealMask);

    gl_FragColor = vec4(lit, 1.0);
  }
`;

/* ------------------------------------------------------------------ *
 * Atmosphere shell (rendered backside for a glow halo)
 * ------------------------------------------------------------------ */

const atmosphereVertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vPosW = worldPos.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const atmosphereFragment = /* glsl */ `
  uniform vec3 uGoldColor;
  uniform vec3 uBlueColor;
  uniform vec3 uCameraPos;
  uniform float uReveal;
  uniform float uIntensity;

  varying vec3 vNormalW;
  varying vec3 vPosW;

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(uCameraPos - vPosW);

    // Backside rendering: the halo is brightest where the shell is edge-on.
    float fres = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), 3.2);

    float sideMix = clamp(N.x * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(uGoldColor, uBlueColor, sideMix);

    // Hot white core where the two hemispheres meet.
    float centre = 1.0 - abs(N.x);
    col += vec3(0.7, 0.85, 1.0) * pow(centre, 5.0) * 0.85;

    float alpha = fres * uIntensity * uReveal;
    gl_FragColor = vec4(col * fres * 1.6, alpha);
  }
`;

/* ------------------------------------------------------------------ *
 * Vertical light beams (the gold / blue pillars)
 * ------------------------------------------------------------------ */

const beamVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const beamFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uReveal;
  uniform float uSeed;
  uniform float uIntensity;
  varying vec2 vUv;

  ${NOISE_GLSL}

  void main() {
    // Horizontal falloff: a soft column.
    float x = abs(vUv.x - 0.5) * 2.0;
    float column = pow(1.0 - clamp(x, 0.0, 1.0), 2.4);

    // Vertical falloff: bright at the horizon, fading upward.
    float rise = pow(clamp(vUv.y, 0.0, 1.0), 0.55);
    float fade = 1.0 - smoothstep(0.25, 1.0, vUv.y);

    // Slow drifting striations so the beam feels volumetric, not flat.
    float n = fbm(vec3(vUv.x * 7.0 + uSeed, vUv.y * 2.0 - uTime * 0.05, uSeed));
    float striation = 0.68 + 0.32 * n;

    float a = column * fade * striation * uIntensity * uReveal;
    a *= smoothstep(0.0, 0.18, vUv.y) * rise;

    gl_FragColor = vec4(uColor * a * 1.7, a);
  }
`;

/* ------------------------------------------------------------------ *
 * Scene
 * ------------------------------------------------------------------ */

export class CampusScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;

  private world = new THREE.Group();
  private planetMat!: THREE.ShaderMaterial;
  private atmosphereMat!: THREE.ShaderMaterial;
  private beamMats: THREE.ShaderMaterial[] = [];
  private orbitNodes: {
    mesh: THREE.Mesh;
    radius: number;
    speed: number;
    phase: number;
    tilt: number;
    yOffset: number;
  }[] = [];
  private particles!: THREE.Points;
  private particleMat!: THREE.PointsMaterial;
  private orbitLines: THREE.Line[] = [];

  private clock = new THREE.Clock();
  private raf = 0;
  private running = false;
  private disposed = false;

  private quality: QualityTier;
  private reveal = 0;
  private scroll = 0;
  private targetScroll = 0;
  private reducedMotion: boolean;

  private baseCameraY = 0.05;
  private baseCameraZ = 6.2;

  private baseWorldY = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    tier: keyof typeof QUALITY,
    reducedMotion = false,
    // Sinks the whole scene so callers that aren't the hero can keep the
    // horizon as a quiet band rather than letting it fill the frame.
    worldOffsetY = 0
  ) {
    this.quality = QUALITY[tier];
    this.reducedMotion = reducedMotion;
    this.baseWorldY = worldOffsetY;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.maxPixelRatio));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x04070f, 0.035);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.camera.position.set(0, this.baseCameraY, this.baseCameraZ);
    this.camera.lookAt(0, -0.4, 0);

    this.scene.add(this.world);
    this.world.position.y = this.baseWorldY;

    this.buildPlanet();
    this.buildAtmosphere();
    if (this.quality.beams) this.buildBeams();
    this.buildOrbits();
    this.buildParticles();

    // Post-processing chain: bloom is what sells the volumetric light.
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // A high threshold means only the genuinely hot pixels (the limb and the
    // orbital nodes) bloom, instead of the glow bleeding across the sphere.
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      this.quality.bloomStrength,
      0.48,
      0.68
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new ShaderPass(GammaCorrectionShader));

    this.resize();
  }

  /* -------------------------------------------------------------- */

  private buildPlanet() {
    const seg = this.quality.sphereSegments;
    const geo = new THREE.SphereGeometry(4.2, seg, seg / 2);

    this.planetMat = new THREE.ShaderMaterial({
      vertexShader: planetVertex,
      fragmentShader: planetFragment,
      uniforms: {
        uTime: { value: 0 },
        uReveal: { value: 0 },
        uGold: { value: 0 },
        uBlue: { value: 0 },
        uGoldDir: { value: new THREE.Vector3(-1.0, 0.26, -0.18) },
        uBlueDir: { value: new THREE.Vector3(1.0, 0.26, -0.18) },
        uGoldColor: { value: GOLD.clone() },
        uGoldHot: { value: GOLD_HOT.clone() },
        uBlueColor: { value: BLUE.clone() },
        uCyanColor: { value: CYAN.clone() },
        uCameraPos: { value: new THREE.Vector3() },
      },
    });

    const planet = new THREE.Mesh(geo, this.planetMat);
    // Sunk below the frame so only the upper curve reads as a horizon.
    planet.position.set(0, -4.35, 0);
    this.world.add(planet);
  }

  private buildAtmosphere() {
    const geo = new THREE.SphereGeometry(4.55, 96, 48);
    this.atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: atmosphereVertex,
      fragmentShader: atmosphereFragment,
      uniforms: {
        uGoldColor: { value: GOLD.clone() },
        uBlueColor: { value: CYAN.clone() },
        uCameraPos: { value: new THREE.Vector3() },
        uReveal: { value: 0 },
        uIntensity: { value: 0.62 },
      },
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const shell = new THREE.Mesh(geo, this.atmosphereMat);
    shell.position.set(0, -4.35, 0);
    this.world.add(shell);
  }

  private buildBeams() {
    const configs = [
      { x: -2.6, color: GOLD, w: 2.4, h: 9, seed: 1.3, intensity: 0.40 },
      { x: -1.5, color: GOLD_HOT, w: 1.3, h: 7.5, seed: 4.1, intensity: 0.26 },
      { x: 2.5, color: BLUE, w: 2.3, h: 9, seed: 7.7, intensity: 0.40 },
      { x: 1.45, color: CYAN, w: 1.2, h: 7.5, seed: 11.2, intensity: 0.24 },
      { x: 0.1, color: VIOLET, w: 1.6, h: 6.4, seed: 15.5, intensity: 0.18 },
    ];

    for (const c of configs) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: beamVertex,
        fragmentShader: beamFragment,
        uniforms: {
          uColor: { value: c.color.clone() },
          uTime: { value: 0 },
          uReveal: { value: 0 },
          uSeed: { value: c.seed },
          uIntensity: { value: c.intensity },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        // Depth testing is essential: without it these additive planes paint
        // straight over the sphere and wash the whole horizon out to white.
        depthTest: true,
      });

      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(c.w, c.h, 1, 1), mat);
      // Seated well behind the sphere so the pillars only read above the limb.
      mesh.position.set(c.x, c.h / 2 - 1.35, -6.2);
      this.beamMats.push(mat);
      this.world.add(mesh);
    }
  }

  private buildOrbits() {
    const count = this.quality.nodes;

    // Thin luminous orbital paths around the horizon.
    const ringConfigs = [
      { radius: 4.95, tilt: 0.22, opacity: 0.16 },
      { radius: 5.5, tilt: -0.16, opacity: 0.12 },
      { radius: 6.1, tilt: 0.3, opacity: 0.09 },
    ];

    for (const cfg of ringConfigs) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 220; i++) {
        const t = (i / 220) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(t) * cfg.radius, 0, Math.sin(t) * cfg.radius));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color("#8fc6ff"),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      mat.userData.targetOpacity = cfg.opacity;

      const line = new THREE.Line(geo, mat);
      line.rotation.x = Math.PI / 2 + cfg.tilt;
      line.position.y = -4.35;
      this.orbitLines.push(line);
      this.world.add(line);
    }

    // Glowing nodes that ride those paths.
    const nodeGeo = new THREE.SphereGeometry(0.085, 20, 20);
    for (let i = 0; i < count; i++) {
      const goldNode = i % 2 === 0;
      const color = goldNode ? GOLD_HOT : CYAN;

      const mat = new THREE.MeshBasicMaterial({
        color: color.clone(),
        transparent: true,
        opacity: 0,
      });
      const mesh = new THREE.Mesh(nodeGeo, mat);

      // A soft halo sprite around each node so bloom has something to catch.
      const haloMat = new THREE.SpriteMaterial({
        color: color.clone(),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const halo = new THREE.Sprite(haloMat);
      halo.scale.setScalar(0.62);
      mesh.add(halo);

      const cfg = ringConfigs[i % ringConfigs.length];
      this.orbitNodes.push({
        mesh,
        radius: cfg.radius,
        speed: 0.055 + (i % 3) * 0.012,
        phase: (i / count) * Math.PI * 2,
        tilt: cfg.tilt,
        yOffset: -4.35,
      });
      this.world.add(mesh);
    }
  }

  private buildParticles() {
    const count = this.quality.particles;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Distribute in a shell hugging the atmosphere, biased upward.
      const theta = Math.random() * Math.PI * 2;
      const r = 4.5 + Math.random() * 3.4;
      const y = -4.0 + Math.pow(Math.random(), 0.65) * 7.5;

      positions[i * 3] = Math.cos(theta) * r * (0.55 + Math.random() * 0.6);
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * r * 0.5 - 1.2;

      // Tint by horizontal position so particles inherit the gold/blue split.
      const t = THREE.MathUtils.clamp((positions[i * 3] + 4) / 8, 0, 1);
      const c = GOLD.clone().lerp(CYAN, t);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    this.particleMat = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(geo, this.particleMat);
    this.world.add(this.particles);
  }

  /* -------------------------------------------------------------- */

  /** Entrance progress, 0..1. Driven by GSAP on load. */
  setReveal(v: number) {
    this.reveal = THREE.MathUtils.clamp(v, 0, 1);
  }

  /** Scroll progress through the pinned hero, 0..1. */
  setScroll(v: number) {
    this.targetScroll = THREE.MathUtils.clamp(v, 0, 1);
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.clock.start();
    this.loop();
  }

  /** Draw a single frame. Used after a resize so a paused scene never shows
   *  a stale or stretched buffer. */
  renderFrame() {
    if (this.disposed) return;
    this.render();
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private loop = () => {
    if (!this.running || this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    this.render();
  };

  private render() {
    const t = this.clock.getElapsedTime();

    // Smooth the scroll value so fast flicks catch up without snapping.
    this.scroll += (this.targetScroll - this.scroll) * 0.085;
    const s = this.scroll;

    const reveal = this.reveal;

    // --- Planet + atmosphere -------------------------------------
    this.planetMat.uniforms.uTime.value = t;
    this.planetMat.uniforms.uReveal.value = reveal;
    // Gold rises first from the left, blue follows from the right.
    this.planetMat.uniforms.uGold.value = THREE.MathUtils.smoothstep(reveal, 0.12, 0.62);
    this.planetMat.uniforms.uBlue.value = THREE.MathUtils.smoothstep(reveal, 0.3, 0.85);
    this.planetMat.uniforms.uCameraPos.value.copy(this.camera.position);

    this.atmosphereMat.uniforms.uReveal.value = reveal;
    this.atmosphereMat.uniforms.uCameraPos.value.copy(this.camera.position);
    // The halo stretches as the camera climbs into it.
    this.atmosphereMat.uniforms.uIntensity.value = 0.62 + s * 0.75;

    for (const m of this.beamMats) {
      m.uniforms.uTime.value = t;
      // Beams stretch and intensify as we rise through them, then clear.
      m.uniforms.uReveal.value = reveal * (1.0 - THREE.MathUtils.smoothstep(s, 0.72, 1.0));
    }

    // --- Orbital paths and nodes ---------------------------------
    for (const line of this.orbitLines) {
      const mat = line.material as THREE.LineBasicMaterial;
      const target = mat.userData.targetOpacity as number;
      mat.opacity = target * THREE.MathUtils.smoothstep(reveal, 0.55, 1.0) * (1 - s * 0.35);
    }

    const nodeFade = THREE.MathUtils.smoothstep(reveal, 0.62, 1.0);
    for (const node of this.orbitNodes) {
      const angle = node.phase + t * node.speed * (this.reducedMotion ? 0.35 : 1);
      const x = Math.cos(angle) * node.radius;
      const z = Math.sin(angle) * node.radius;
      // Apply the ring tilt so nodes track their path exactly.
      node.mesh.position.set(x, node.yOffset + z * Math.sin(node.tilt), z * Math.cos(node.tilt));

      const mat = node.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = nodeFade;
      const halo = node.mesh.children[0] as THREE.Sprite;
      (halo.material as THREE.SpriteMaterial).opacity = nodeFade * 0.5;
    }

    // --- Particles ------------------------------------------------
    this.particleMat.opacity = THREE.MathUtils.smoothstep(reveal, 0.4, 1.0) * 0.72;
    this.particles.rotation.y = t * 0.012;

    // --- Scroll-driven camera flight ------------------------------
    // One continuous move: the camera climbs, tips down, and passes
    // through the glowing atmosphere above the horizon.
    const climb = this.easeInOutCubic(s);
    // Deliberately a restrained climb: the camera rises past the horizon but
    // the glowing limb stays near the top of frame, so the canvas never
    // empties out into a blank page before the next section arrives.
    this.camera.position.y = this.baseCameraY + climb * 2.6;
    this.camera.position.z = this.baseCameraZ - this.easeOutCubic(s) * 1.7;
    this.camera.rotation.x = -climb * 0.22;

    // The world itself also drifts upward, so the horizon exits the frame
    // rather than the whole hero simply fading out.
    this.world.position.y = this.baseWorldY + climb * 0.9;

    // Gentle idle drift keeps the scene alive when the user is not scrolling.
    if (!this.reducedMotion) {
      this.world.rotation.y = Math.sin(t * 0.045) * 0.035;
    }

    this.composer.render();
  }

  private easeInOutCubic(x: number) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  private easeOutCubic(x: number) {
    return 1 - Math.pow(1 - x, 3);
  }

  /* -------------------------------------------------------------- */

  resize() {
    if (this.disposed) return;
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const w = parent.clientWidth || window.innerWidth;
    const h = parent.clientHeight || window.innerHeight;

    this.camera.aspect = w / h;

    // Portrait viewports need a wider field of view and a pushed-back camera
    // so the horizon still reads as a curve instead of a flat band.
    const portrait = h > w;
    this.camera.fov = portrait ? 58 : 42;
    this.baseCameraZ = portrait ? 7.4 : 6.2;
    this.camera.updateProjectionMatrix();

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.maxPixelRatio));
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);

    if (!this.running) this.render();
  }

  dispose() {
    this.stop();
    this.disposed = true;

    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = (mesh as any).material;
      if (Array.isArray(mat)) mat.forEach((m: THREE.Material) => m.dispose());
      else if (mat) mat.dispose();
    });

    this.composer.dispose();
    this.renderer.dispose();
  }
}
