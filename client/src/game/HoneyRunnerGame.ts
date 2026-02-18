import * as THREE from "three";
import { getBestScore, setBestScore, addCoins, incrementRuns } from "./storage";

const W = 480, H = 854;
const LANE_W = 2.2;
const LANES = [-LANE_W, 0, LANE_W];
const RUN_SPEED_INIT = 14;
const RUN_SPEED_MAX = 34;
const SPEED_RAMP = 0.2;
const JUMP_VEL = 12;
const GRAVITY = 30;
const SLIDE_DUR = 550;
const COIN_SCORE = 10;
const MAGNET_DUR = 7000;
const SHIELD_DUR = 8000;
const BOOST_DUR = 4000;
const BOOST_MULT = 1.6;
const OBSTACLE_INTERVAL_MIN = 0.45;
const OBSTACLE_INTERVAL_MAX = 1.5;
const COIN_INTERVAL = 0.5;
const POWERUP_INTERVAL = 12;
const TUNNEL_LEN = 120;
const TUNNEL_RAD = 5;
const RING_COUNT = 40;
const COMBO_DECAY = 3000;

const AMBER = new THREE.Color(0xf0a500);
const AMBER_BRIGHT = new THREE.Color(0xffc040);
const GOLD = new THREE.Color(0xf5b800);
const HONEY = new THREE.Color(0xffaa00);
const RED = new THREE.Color(0xff3858);
const CYAN = new THREE.Color(0x00f0ff);
const GREEN = new THREE.Color(0x00ff80);
const BLUE = new THREE.Color(0x4488ff);
const ORANGE = new THREE.Color(0xff7800);
const WHITE = new THREE.Color(0xffffff);
const PURPLE = new THREE.Color(0xaa44ff);

const PHASE_THRESHOLDS = [0, 2000, 6000, 15000];
const PHASE_NAMES = ["NEON DRIFT", "GOLDEN GRID", "PLASMA RUSH", "HYPER CORE"];
const PHASE_COLORS = [AMBER, GOLD, ORANGE, RED];
const PHASE_RING_COLORS = [AMBER_BRIGHT, new THREE.Color(0xffe070), new THREE.Color(0xffb060), new THREE.Color(0xff6060)];

type ObstacleType = "barrier" | "low_gate" | "lane_blocker";
interface Obstacle { mesh: THREE.Group; type: ObstacleType; lane: number; z: number; hit: boolean; }
interface Coin { mesh: THREE.Mesh; lane: number; z: number; collected: boolean; }
interface PowerUp { mesh: THREE.Group; lane: number; z: number; kind: "shield" | "magnet" | "boost"; collected: boolean; }

type GameState = "menu" | "playing" | "gameover";

class HoneyRunner3D {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private animId = 0;
  private destroyed = false;

  private state: GameState = "menu";
  private score = 0;
  private distance = 0;
  private coins = 0;
  private speed = RUN_SPEED_INIT;
  private lane = 1;
  private targetLane = 1;
  private playerY = 0;
  private playerVY = 0;
  private isJumping = false;
  private isSliding = false;
  private slideTimer = 0;
  private combo = 0;
  private comboTimer = 0;
  private phase = 0;
  private hasShield = false;
  private hasMagnet = false;
  private hasBoost = false;
  private shieldTimer = 0;
  private magnetTimer = 0;
  private boostTimer = 0;
  private nextObstacle = 1;
  private nextCoin = 0.5;
  private nextPowerup = 8;
  private runTime = 0;

  private player!: THREE.Group;
  private playerBody!: THREE.Mesh;
  private playerWingL!: THREE.Mesh;
  private playerWingR!: THREE.Mesh;
  private shieldBubble!: THREE.Mesh;
  private tunnel!: THREE.Group;
  private rings: THREE.Line[] = [];
  private wallLines: THREE.Line[] = [];
  private obstacles: Obstacle[] = [];
  private coinPool: Coin[] = [];
  private powerups: PowerUp[] = [];
  private particles: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }[] = [];
  private ambientLight!: THREE.AmbientLight;
  private pointLight!: THREE.PointLight;
  private fogColor = new THREE.Color(0x050508);

  private hudCanvas!: HTMLCanvasElement;
  private hudCtx!: CanvasRenderingContext2D;
  private hudTexture!: THREE.CanvasTexture;
  private hudMesh!: THREE.Mesh;

  private menuCanvas!: HTMLCanvasElement;
  private menuCtx!: CanvasRenderingContext2D;
  private menuTexture!: THREE.CanvasTexture;
  private menuMesh!: THREE.Mesh;

  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;

  private coinGeom!: THREE.SphereGeometry;
  private coinMat!: THREE.MeshStandardMaterial;

  constructor(container: HTMLElement) {
    this.container = container;
    this.init();
  }

  private init() {
    const testCanvas = document.createElement("canvas");
    const hasWebGL = !!(testCanvas.getContext("webgl2") || testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl"));
    if (!hasWebGL) {
      const fallback = document.createElement("div");
      fallback.style.cssText = "display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-height:300px;background:#020204;color:#f0a500;font-family:sans-serif;font-size:16px;text-align:center;padding:2rem;";
      fallback.textContent = "WebGL is required to play HoneyRunner. Please use a modern browser with hardware acceleration enabled.";
      this.container.appendChild(fallback);
      return;
    }
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      const fallback = document.createElement("div");
      fallback.style.cssText = "display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-height:300px;background:#020204;color:#f0a500;font-family:sans-serif;font-size:16px;text-align:center;padding:2rem;";
      fallback.textContent = "WebGL is required to play HoneyRunner. Please use a modern browser with hardware acceleration enabled.";
      this.container.appendChild(fallback);
      return;
    }
    this.renderer.setSize(W, H);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x020204);
    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.style.display = "block";

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x010108, 0.02);

    this.camera = new THREE.PerspectiveCamera(68, W / H, 0.1, 200);
    this.camera.position.set(0, 3.5, 6);
    this.camera.lookAt(0, 1.5, -20);

    this.ambientLight = new THREE.AmbientLight(0x0a0a18, 0.5);
    this.scene.add(this.ambientLight);

    this.pointLight = new THREE.PointLight(0xf0a500, 2.5, 35);
    this.pointLight.position.set(0, 4, 2);
    this.scene.add(this.pointLight);

    const backLight = new THREE.PointLight(0x00ccff, 1.2, 50);
    backLight.position.set(0, 3, -15);
    this.scene.add(backLight);

    const rimLight = new THREE.PointLight(0xaa44ff, 0.6, 25);
    rimLight.position.set(4, 5, -5);
    this.scene.add(rimLight);

    const rimLight2 = new THREE.PointLight(0x00ff80, 0.4, 25);
    rimLight2.position.set(-4, 2, -10);
    this.scene.add(rimLight2);

    this.coinGeom = new THREE.OctahedronGeometry(0.2, 1);
    this.coinMat = new THREE.MeshStandardMaterial({ color: 0xffc040, emissive: 0xf0a500, emissiveIntensity: 0.7, metalness: 0.9, roughness: 0.1 });

    this.buildTunnel();
    this.buildPlayer();
    this.buildHUD();
    this.buildMenuOverlay();
    this.setupInput();

    this.state = "menu";
    this.updateMenu();
    this.menuMesh.visible = true;

    this.clock.start();
    this.animate();
  }

  private buildTunnel() {
    this.tunnel = new THREE.Group();
    this.scene.add(this.tunnel);

    const floorWidth = LANE_W * 3 + 2;
    const floorGeo = new THREE.PlaneGeometry(floorWidth, TUNNEL_LEN);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x040410,
      emissive: 0x00ccff,
      emissiveIntensity: 0.03,
      metalness: 0.85,
      roughness: 0.15,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.01, -TUNNEL_LEN / 2 + 10);
    this.tunnel.add(floor);

    const gridMat = new THREE.LineBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.1 });
    for (let z = 0; z <= TUNNEL_LEN; z += 2) {
      const crossGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-floorWidth / 2, 0.02, -z + 10),
        new THREE.Vector3(floorWidth / 2, 0.02, -z + 10),
      ]);
      this.tunnel.add(new THREE.Line(crossGeo, gridMat));
    }

    const longGridMat = new THREE.LineBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.06 });
    const gridSpacing = 0.5;
    for (let x = -floorWidth / 2; x <= floorWidth / 2; x += gridSpacing) {
      const pts = [
        new THREE.Vector3(x, 0.02, 10),
        new THREE.Vector3(x, 0.02, -TUNNEL_LEN),
      ];
      this.tunnel.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), longGridMat));
    }

    for (let i = 0; i < 3; i++) {
      const laneX = LANES[i];
      const pts = [
        new THREE.Vector3(laneX - LANE_W * 0.5, 0.025, 10),
        new THREE.Vector3(laneX - LANE_W * 0.5, 0.025, -TUNNEL_LEN),
      ];
      const lineMat = new THREE.LineBasicMaterial({ color: 0xf0a500, transparent: true, opacity: 0.2 });
      this.tunnel.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
      if (i === 2) {
        const pts2 = [
          new THREE.Vector3(laneX + LANE_W * 0.5, 0.025, 10),
          new THREE.Vector3(laneX + LANE_W * 0.5, 0.025, -TUNNEL_LEN),
        ];
        this.tunnel.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2), lineMat));
      }
    }

    const centerLineMat = new THREE.LineBasicMaterial({ color: 0xf0a500, transparent: true, opacity: 0.25 });
    for (let i = 0; i < 3; i++) {
      const pts = [
        new THREE.Vector3(LANES[i], 0.025, 10),
        new THREE.Vector3(LANES[i], 0.025, -TUNNEL_LEN),
      ];
      this.tunnel.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), centerLineMat));
    }

    const archSegments = 24;
    const archHeight = TUNNEL_RAD * 1.2;
    const archHalfW = floorWidth / 2 + 0.5;
    const archPts: THREE.Vector3[] = [];
    for (let j = 0; j <= archSegments; j++) {
      const t = j / archSegments;
      const angle = Math.PI * t;
      const x = Math.cos(angle) * archHalfW;
      const y = Math.sin(angle) * archHeight;
      archPts.push(new THREE.Vector3(x, Math.max(y, 0), 0));
    }

    const ringSpacing = TUNNEL_LEN / RING_COUNT;
    for (let i = 0; i < RING_COUNT; i++) {
      const zPos = -i * ringSpacing;
      const archGeo = new THREE.BufferGeometry().setFromPoints(archPts);
      const opacity = 0.18 + 0.2 * (1 - i / RING_COUNT);
      const hue = (i / RING_COUNT) * 0.15;
      const ringColor = new THREE.Color().setHSL(0.08 + hue, 1, 0.55);
      const ringMat = new THREE.LineBasicMaterial({ color: ringColor, transparent: true, opacity });
      const archLine = new THREE.Line(archGeo, ringMat);
      archLine.position.z = zPos;
      this.tunnel.add(archLine);
      this.rings.push(archLine);

      const pillarHeight = 1.2;
      const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x00ccff, emissive: 0x00ccff, emissiveIntensity: 0.3,
        transparent: true, opacity: opacity * 0.4, metalness: 0.8, roughness: 0.1,
      });
      const pillarGeo = new THREE.BoxGeometry(0.04, pillarHeight, 0.04);
      const pillarL = new THREE.Mesh(pillarGeo, pillarMat);
      pillarL.position.set(-archHalfW, pillarHeight / 2, zPos);
      this.tunnel.add(pillarL);
      const pillarR = new THREE.Mesh(pillarGeo, pillarMat);
      pillarR.position.set(archHalfW, pillarHeight / 2, zPos);
      this.tunnel.add(pillarR);

      if (i % 5 === 0) {
        const nodeMat = new THREE.MeshStandardMaterial({
          color: 0xaa44ff, emissive: 0xaa44ff, emissiveIntensity: 0.6,
          transparent: true, opacity: 0.5,
        });
        const nodeGeo = new THREE.SphereGeometry(0.08, 8, 6);
        const nodeL = new THREE.Mesh(nodeGeo, nodeMat);
        nodeL.position.set(-archHalfW, pillarHeight, zPos);
        this.tunnel.add(nodeL);
        const nodeR = new THREE.Mesh(nodeGeo, nodeMat);
        nodeR.position.set(archHalfW, pillarHeight, zPos);
        this.tunnel.add(nodeR);
      }
    }

    const wallLineCount = 10;
    for (let i = 0; i < wallLineCount; i++) {
      const t = (i + 1) / (wallLineCount + 1);
      const angle = Math.PI * t;
      const wallColor = t < 0.5 ? 0x00ccff : 0xaa44ff;
      const wallLineMat = new THREE.LineBasicMaterial({ color: wallColor, transparent: true, opacity: 0.05 });
      const pts: THREE.Vector3[] = [];
      for (let z = 0; z <= TUNNEL_LEN; z += 2) {
        const x = Math.cos(angle) * archHalfW;
        const y = Math.sin(angle) * archHeight;
        pts.push(new THREE.Vector3(x, Math.max(y, 0), -z + 10));
      }
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(lineGeo, wallLineMat);
      this.tunnel.add(line);
      this.wallLines.push(line);
    }

    const edgeLineMat = new THREE.LineBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.15 });
    const edgeL = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-archHalfW, 0, 10),
      new THREE.Vector3(-archHalfW, 0, -TUNNEL_LEN),
    ]);
    this.tunnel.add(new THREE.Line(edgeL, edgeLineMat));
    const edgeR = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(archHalfW, 0, 10),
      new THREE.Vector3(archHalfW, 0, -TUNNEL_LEN),
    ]);
    this.tunnel.add(new THREE.Line(edgeR, edgeLineMat));
  }

  private legs: THREE.Group[] = [];
  private antennae: THREE.Group[] = [];
  private hindWingL!: THREE.Mesh;
  private hindWingR!: THREE.Mesh;

  private buildPlayer() {
    this.player = new THREE.Group();
    const bee = new THREE.Group();

    // All geometry built along +Z then we rotate the whole bee to face -Z (into tunnel)

    // === MATERIALS ===
    const softBlack = new THREE.MeshStandardMaterial({
      color: 0x2a1a08, emissive: 0x100800, emissiveIntensity: 0.08,
      metalness: 0.05, roughness: 0.85,
    });
    const honeyYellow = new THREE.MeshStandardMaterial({
      color: 0xf5b820, emissive: 0xf0a500, emissiveIntensity: 0.18,
      metalness: 0.05, roughness: 0.75,
    });

    // === HEAD - large round friendly face ===
    const headGeo = new THREE.SphereGeometry(0.3, 32, 28);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xf5b820, emissive: 0xf0a500, emissiveIntensity: 0.12,
      metalness: 0.04, roughness: 0.7,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 0.1, 0.42);
    head.scale.set(1.0, 0.98, 0.92);
    bee.add(head);

    // rosy cheeks
    for (const side of [-1, 1]) {
      const cheekGeo = new THREE.SphereGeometry(0.09, 14, 12);
      const cheekMat = new THREE.MeshStandardMaterial({
        color: 0xf8c858, emissive: 0xf0a500, emissiveIntensity: 0.1,
        metalness: 0.03, roughness: 0.8,
      });
      const cheek = new THREE.Mesh(cheekGeo, cheekMat);
      cheek.position.set(side * 0.2, 0.0, 0.52);
      bee.add(cheek);
    }

    // === BIG EXPRESSIVE EYES ===
    for (const side of [-1, 1]) {
      const scleraGeo = new THREE.SphereGeometry(0.15, 32, 28);
      const scleraMat = new THREE.MeshStandardMaterial({
        color: 0xfefefe, emissive: 0xffffff, emissiveIntensity: 0.12,
        metalness: 0.02, roughness: 0.25,
      });
      const sclera = new THREE.Mesh(scleraGeo, scleraMat);
      sclera.position.set(side * 0.14, 0.14, 0.54);
      sclera.scale.set(0.72, 1.05, 0.55);
      bee.add(sclera);

      const irisGeo = new THREE.SphereGeometry(0.09, 24, 20);
      const irisMat = new THREE.MeshStandardMaterial({
        color: 0x4a2a0a, emissive: 0x2a1508, emissiveIntensity: 0.08,
        metalness: 0.25, roughness: 0.18,
      });
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.set(side * 0.13, 0.15, 0.59);
      iris.scale.set(0.65, 0.9, 0.45);
      bee.add(iris);

      const pupilGeo = new THREE.SphereGeometry(0.06, 20, 16);
      const pupilMat = new THREE.MeshStandardMaterial({
        color: 0x080808, metalness: 0.1, roughness: 0.12,
      });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(side * 0.125, 0.16, 0.61);
      pupil.scale.set(0.55, 0.8, 0.38);
      bee.add(pupil);

      const specMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const spec1 = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), specMat);
      spec1.position.set(side * 0.105, 0.2, 0.63);
      bee.add(spec1);
      const spec2 = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), specMat);
      spec2.position.set(side * 0.155, 0.1, 0.62);
      bee.add(spec2);
    }

    // small smile arc
    const smilePts: THREE.Vector3[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const angle = Math.PI * 0.2 + t * Math.PI * 0.6;
      smilePts.push(new THREE.Vector3(
        Math.cos(angle) * 0.07,
        -0.06 - Math.sin(angle) * 0.025,
        0.6
      ));
    }
    bee.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(smilePts),
      new THREE.LineBasicMaterial({ color: 0x2a1200 })
    ));

    // nose nub
    const noseGeo = new THREE.SphereGeometry(0.035, 12, 10);
    const nose = new THREE.Mesh(noseGeo, new THREE.MeshStandardMaterial({
      color: 0xe8a820, emissive: 0xf0a500, emissiveIntensity: 0.08,
      metalness: 0.04, roughness: 0.75,
    }));
    nose.position.set(0, 0.02, 0.6);
    nose.scale.set(1, 0.65, 0.55);
    bee.add(nose);

    // === ANTENNAE - bouncy with round tips ===
    const antMat = new THREE.MeshStandardMaterial({
      color: 0x2a1a08, metalness: 0.1, roughness: 0.65,
    });
    for (const side of [-1, 1]) {
      const ant = new THREE.Group();
      const stalk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.022, 0.2, 10), antMat
      );
      stalk.position.set(side * 0.02, 0.1, 0);
      stalk.rotation.z = side * 0.35;
      ant.add(stalk);

      const tipBall = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 14, 12),
        new THREE.MeshStandardMaterial({
          color: 0x3a2010, emissive: 0x100800, emissiveIntensity: 0.05,
          metalness: 0.12, roughness: 0.55,
        })
      );
      tipBall.position.set(side * 0.07, 0.21, 0.01);
      ant.add(tipBall);

      ant.position.set(side * 0.06, 0.3, 0.42);
      bee.add(ant);
      this.antennae.push(ant);
    }

    // === THORAX - plump round fuzzy body ===
    const thoraxGeo = new THREE.SphereGeometry(0.34, 32, 28);
    const thorax = new THREE.Mesh(thoraxGeo, honeyYellow);
    thorax.scale.set(1.08, 1.02, 1.12);
    thorax.position.set(0, -0.02, 0.08);
    bee.add(thorax);
    this.playerBody = thorax;

    // fuzzy texture bumps
    const fuzzMat = new THREE.MeshStandardMaterial({
      color: 0xd4a020, emissive: 0xf0a500, emissiveIntensity: 0.06,
      metalness: 0.02, roughness: 0.95, transparent: true, opacity: 0.45,
    });
    for (let i = 0; i < 28; i++) {
      const theta = Math.random() * Math.PI * 0.65 + 0.25;
      const phi = Math.random() * Math.PI * 2;
      const r = 0.33;
      const fx = Math.sin(theta) * Math.cos(phi) * r * 1.08;
      const fy = Math.sin(theta) * Math.sin(phi) * r * 1.02;
      const fz = Math.cos(theta) * r * 1.12 + 0.08;
      if (fy < -0.18) continue;
      const fuzz = new THREE.Mesh(
        new THREE.SphereGeometry(0.022 + Math.random() * 0.014, 6, 5), fuzzMat
      );
      fuzz.position.set(fx, fy - 0.02, fz);
      bee.add(fuzz);
    }

    // === ABDOMEN - big chubby striped rear ===
    const abdGeo = new THREE.SphereGeometry(0.4, 32, 28);
    const abdomen = new THREE.Mesh(abdGeo, honeyYellow);
    abdomen.scale.set(0.96, 0.94, 1.4);
    abdomen.position.set(0, -0.06, -0.3);
    bee.add(abdomen);

    // bold stripes
    const stripes = [
      { z: -0.10, thick: 0.048 },
      { z: -0.20, thick: 0.052 },
      { z: -0.32, thick: 0.052 },
      { z: -0.42, thick: 0.046 },
      { z: -0.50, thick: 0.038 },
    ];
    for (const s of stripes) {
      const dist = Math.abs(s.z - (-0.3));
      const normDist = dist / (0.4 * 1.4);
      const rFrac = Math.max(1 - normDist * normDist, 0.03);
      const bandR = 0.4 * 0.96 * Math.sqrt(rFrac) + 0.01;
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(bandR, s.thick, 14, 36), softBlack
      );
      band.position.set(0, -0.06, s.z);
      band.rotation.y = Math.PI / 2;
      bee.add(band);
    }

    // round tail cap
    const tail = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 16, 14),
      new THREE.MeshStandardMaterial({
        color: 0xf5b820, emissive: 0xf0a500, emissiveIntensity: 0.1,
        metalness: 0.04, roughness: 0.75,
      })
    );
    tail.position.set(0, -0.06, -0.64);
    tail.scale.set(0.8, 0.75, 0.85);
    bee.add(tail);

    // tiny stinger
    const stinger = new THREE.Mesh(
      new THREE.ConeGeometry(0.018, 0.07, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a1a08, metalness: 0.2, roughness: 0.5 })
    );
    stinger.position.set(0, -0.07, -0.7);
    stinger.rotation.x = Math.PI / 2;
    bee.add(stinger);

    // === WINGS ===
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xeef4ff, emissive: 0xddeeff, emissiveIntensity: 0.14,
      transparent: true, opacity: 0.3, side: THREE.DoubleSide,
      metalness: 0.12, roughness: 0.04,
    });
    const wingShimMat = new THREE.MeshStandardMaterial({
      color: 0xccddff, emissive: 0x88aaff, emissiveIntensity: 0.06,
      transparent: true, opacity: 0.1, side: THREE.DoubleSide,
      metalness: 0.3, roughness: 0.02,
    });
    const veinMat = new THREE.LineBasicMaterial({
      color: 0xaab8cc, transparent: true, opacity: 0.25,
    });

    const makeWing = (len: number, wid: number): THREE.Group => {
      const wg = new THREE.Group();
      const s = new THREE.Shape();
      s.moveTo(0, 0);
      s.bezierCurveTo(len * 0.1, wid * 0.75, len * 0.35, wid * 1.12, len * 0.6, wid);
      s.bezierCurveTo(len * 0.8, wid * 0.82, len * 0.96, wid * 0.45, len, wid * 0.12);
      s.bezierCurveTo(len * 0.88, -wid * 0.08, len * 0.48, -wid * 0.1, len * 0.22, -wid * 0.04);
      s.bezierCurveTo(len * 0.08, -wid * 0.02, 0, 0, 0, 0);
      wg.add(new THREE.Mesh(new THREE.ShapeGeometry(s, 14), wingMat));
      const shim = new THREE.Mesh(new THREE.ShapeGeometry(s, 14), wingShimMat);
      shim.position.z = 0.001;
      wg.add(shim);
      const veins: number[][][] = [
        [[0, 0], [len * 0.4, wid * 0.4], [len * 0.8, wid * 0.28]],
        [[0, 0], [len * 0.3, wid * 0.12], [len * 0.7, wid * 0.04]],
        [[0, 0], [len * 0.25, wid * 0.68], [len * 0.5, wid * 0.82]],
      ];
      for (const v of veins) {
        wg.add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(v.map(([x, y]) => new THREE.Vector3(x, y, 0.002))),
          veinMat
        ));
      }
      return wg;
    };

    const fwL = makeWing(0.68, 0.3);
    fwL.position.set(-0.24, 0.24, 0.06);
    fwL.rotation.set(0.1, -0.1, 0.38);
    fwL.scale.x = -1;
    bee.add(fwL);
    this.playerWingL = fwL as unknown as THREE.Mesh;

    const fwR = makeWing(0.68, 0.3);
    fwR.position.set(0.24, 0.24, 0.06);
    fwR.rotation.set(0.1, 0.1, -0.38);
    bee.add(fwR);
    this.playerWingR = fwR as unknown as THREE.Mesh;

    const hwL = makeWing(0.44, 0.19);
    hwL.position.set(-0.2, 0.2, -0.04);
    hwL.rotation.set(0.05, -0.18, 0.48);
    hwL.scale.x = -1;
    bee.add(hwL);
    this.hindWingL = hwL as unknown as THREE.Mesh;

    const hwR = makeWing(0.44, 0.19);
    hwR.position.set(0.2, 0.2, -0.04);
    hwR.rotation.set(0.05, 0.18, -0.48);
    bee.add(hwR);
    this.hindWingR = hwR as unknown as THREE.Mesh;

    // === LEGS - short stubby cute ===
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x2a1a08, metalness: 0.1, roughness: 0.65,
    });
    const legPairs = [
      { x: 0.24, z: 0.1, splay: 0.45, segs: [0.07, 0.09, 0.06] },
      { x: 0.27, z: -0.02, splay: 0.65, segs: [0.08, 0.1, 0.07] },
      { x: 0.24, z: -0.14, splay: 0.85, segs: [0.09, 0.11, 0.08] },
    ];
    for (const lp of legPairs) {
      for (const side of [-1, 1]) {
        const leg = new THREE.Group();
        let cy = 0;
        for (let s = 0; s < lp.segs.length; s++) {
          const sLen = lp.segs[s];
          const thick = 0.024 - s * 0.005;
          const sMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(thick * 0.78, thick, sLen, 8), legMat
          );
          sMesh.position.y = cy - sLen / 2;
          sMesh.rotation.z = s === 1 ? side * 0.3 : s === 2 ? -side * 0.2 : 0;
          leg.add(sMesh);
          if (s < lp.segs.length - 1) {
            const j = new THREE.Mesh(new THREE.SphereGeometry(thick * 0.85, 8, 6), legMat);
            j.position.y = cy - sLen;
            leg.add(j);
          }
          cy -= sLen;
        }
        const foot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), legMat);
        foot.position.y = cy;
        leg.add(foot);
        leg.position.set(side * lp.x, -0.12, lp.z);
        leg.rotation.z = side * lp.splay;
        bee.add(leg);
        this.legs.push(leg);
      }
    }

    // === WARM GLOW ===
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 14, 12),
      new THREE.MeshBasicMaterial({ color: 0xf0a500, transparent: true, opacity: 0.04 })
    );
    glow.position.set(0, 0, 0);
    bee.add(glow);

    // ROTATE entire bee to face -Z (into the tunnel / direction of travel)
    bee.rotation.y = Math.PI;

    bee.scale.setScalar(1.3);
    this.player.add(bee);

    const shieldGeo = new THREE.SphereGeometry(0.9, 28, 22);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x00ff80, emissive: 0x00ff80, emissiveIntensity: 0.35,
      transparent: true, opacity: 0.18, side: THREE.DoubleSide,
    });
    this.shieldBubble = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldBubble.visible = false;
    this.player.add(this.shieldBubble);

    this.player.position.set(0, 0.6, 0);
    this.scene.add(this.player);
  }

  private buildHUD() {
    this.hudCanvas = document.createElement("canvas");
    this.hudCanvas.width = W;
    this.hudCanvas.height = H;
    this.hudCtx = this.hudCanvas.getContext("2d")!;
    this.hudTexture = new THREE.CanvasTexture(this.hudCanvas);
    this.hudTexture.minFilter = THREE.LinearFilter;

    const hudGeo = new THREE.PlaneGeometry(2, 2);
    const hudMat = new THREE.MeshBasicMaterial({ map: this.hudTexture, transparent: true, depthTest: false, depthWrite: false });
    this.hudMesh = new THREE.Mesh(hudGeo, hudMat);
    this.hudMesh.renderOrder = 999;
    this.hudMesh.frustumCulled = false;
  }

  private buildMenuOverlay() {
    this.menuCanvas = document.createElement("canvas");
    this.menuCanvas.width = W;
    this.menuCanvas.height = H;
    this.menuCtx = this.menuCanvas.getContext("2d")!;
    this.menuTexture = new THREE.CanvasTexture(this.menuCanvas);
    this.menuTexture.minFilter = THREE.LinearFilter;

    const menuGeo = new THREE.PlaneGeometry(2, 2);
    const menuMat = new THREE.MeshBasicMaterial({ map: this.menuTexture, transparent: true, depthTest: false, depthWrite: false });
    this.menuMesh = new THREE.Mesh(menuGeo, menuMat);
    this.menuMesh.renderOrder = 1000;
    this.menuMesh.frustumCulled = false;
    this.menuMesh.visible = false;
  }

  private updateMenu() {
    const ctx = this.menuCtx;
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = "rgba(1,1,8,0.88)";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(0,204,255,0.08)";
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    if (this.state === "menu") {
      ctx.fillStyle = "#00ccff";
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("// SYSTEM ONLINE", W / 2, H * 0.22);

      ctx.fillStyle = "#f0a500";
      ctx.font = "bold 44px 'JetBrains Mono', monospace";
      ctx.fillText("HONEY", W / 2, H * 0.3);
      ctx.fillStyle = "#00ccff";
      ctx.fillText("RUNNER", W / 2, H * 0.3 + 45);

      ctx.fillStyle = "rgba(170,68,255,0.5)";
      ctx.font = "12px 'JetBrains Mono', monospace";
      ctx.fillText("[ QUANTUM ENDLESS RUNNER ]", W / 2, H * 0.3 + 70);

      this.drawBtn(ctx, W / 2, H * 0.5, 220, 50, "INITIALIZE", "#f0a500", "#000");

      const best = getBestScore();
      if (best > 0) {
        ctx.fillStyle = "#00ccff";
        ctx.font = "12px 'JetBrains Mono', monospace";
        ctx.fillText(`RECORD: ${best.toLocaleString()}`, W / 2, H * 0.5 + 55);
      }

      ctx.fillStyle = "#555";
      ctx.font = "11px 'JetBrains Mono', monospace";
      ctx.fillText("[ARROWS/SWIPE] NAVIGATE", W / 2, H * 0.7);
      ctx.fillText("[UP/SWIPE-UP] BOOST", W / 2, H * 0.7 + 18);
      ctx.fillText("[DOWN/SWIPE-DOWN] EVADE", W / 2, H * 0.7 + 36);
    } else if (this.state === "gameover") {
      ctx.fillStyle = "#ff3858";
      ctx.font = "bold 13px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("// SYSTEM FAILURE", W / 2, H * 0.2);

      ctx.fillStyle = "#ff1030";
      ctx.font = "bold 38px 'JetBrains Mono', monospace";
      ctx.fillText("TERMINATED", W / 2, H * 0.27);

      const isNew = setBestScore(this.score);
      if (isNew) {
        ctx.fillStyle = "#00ff80";
        ctx.font = "bold 14px 'JetBrains Mono', monospace";
        ctx.fillText(">>> NEW RECORD <<<", W / 2, H * 0.27 + 28);
      }

      ctx.fillStyle = "#f0a500";
      ctx.font = "bold 50px 'JetBrains Mono', monospace";
      ctx.fillText(this.score.toLocaleString(), W / 2, H * 0.39);

      ctx.fillStyle = "#00ccff";
      ctx.font = "12px 'JetBrains Mono', monospace";
      ctx.fillText(`DIST: ${Math.floor(this.distance)}m  |  DATA: ${this.coins}  |  CHAIN: ${this.combo}x`, W / 2, H * 0.39 + 28);

      this.drawBtn(ctx, W / 2, H * 0.58, 220, 50, "REBOOT", "#f0a500", "#000");
      this.drawBtn(ctx, W / 2, H * 0.66, 220, 40, "MAIN GRID", "#1a1a2e", "#00ccff");
    }

    this.menuTexture.needsUpdate = true;
  }

  private drawBtn(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, text: string, bg: string, fg: string) {
    const r = 4;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, r);
    ctx.fill();
    ctx.strokeStyle = fg;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, r);
    ctx.stroke();
    ctx.fillStyle = fg;
    ctx.font = `bold ${h > 42 ? 16 : 12}px 'JetBrains Mono', monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
  }

  private updateHUD() {
    const ctx = this.hudCtx;
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = "rgba(5,5,8,0.7)";
    ctx.beginPath();
    ctx.roundRect(10, 10, W - 20, 60, 8);
    ctx.fill();

    ctx.fillStyle = "#f0a500";
    ctx.font = "bold 22px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(this.score.toLocaleString(), 22, 38);

    ctx.fillStyle = "#888";
    ctx.font = "11px 'Inter', sans-serif";
    ctx.fillText(`${Math.floor(this.distance)}m`, 22, 58);

    ctx.textAlign = "right";
    ctx.fillStyle = "#ffc040";
    ctx.font = "bold 16px 'JetBrains Mono', monospace";
    ctx.fillText(`${this.coins}`, W - 22, 38);

    ctx.fillStyle = "#888";
    ctx.font = "11px 'Inter', sans-serif";
    ctx.fillText("coins", W - 22, 56);

    if (this.combo > 1) {
      ctx.textAlign = "center";
      ctx.fillStyle = this.combo >= 10 ? "#ff3858" : this.combo >= 5 ? "#ffc040" : "#f0a500";
      ctx.font = `bold ${16 + this.combo}px 'JetBrains Mono', monospace`;
      ctx.fillText(`${this.combo}x`, W / 2, 42);
    }

    const phaseName = PHASE_NAMES[this.phase] || PHASE_NAMES[0];
    ctx.textAlign = "center";
    ctx.fillStyle = PHASE_COLORS[this.phase]?.getStyle() || "#f0a500";
    ctx.font = "bold 10px 'Inter', sans-serif";
    ctx.fillText(phaseName, W / 2, 62);

    let statusY = 82;
    if (this.hasShield) {
      ctx.fillStyle = "rgba(0,255,128,0.15)";
      ctx.beginPath();
      ctx.roundRect(10, statusY, 100, 18, 4);
      ctx.fill();
      ctx.fillStyle = "#00ff80";
      ctx.font = "bold 10px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`SHIELD ${Math.ceil(this.shieldTimer / 1000)}s`, 18, statusY + 13);
      statusY += 22;
    }
    if (this.hasMagnet) {
      ctx.fillStyle = "rgba(68,136,255,0.15)";
      ctx.beginPath();
      ctx.roundRect(10, statusY, 100, 18, 4);
      ctx.fill();
      ctx.fillStyle = "#4488ff";
      ctx.font = "bold 10px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`MAGNET ${Math.ceil(this.magnetTimer / 1000)}s`, 18, statusY + 13);
      statusY += 22;
    }
    if (this.hasBoost) {
      ctx.fillStyle = "rgba(255,120,0,0.15)";
      ctx.beginPath();
      ctx.roundRect(10, statusY, 100, 18, 4);
      ctx.fill();
      ctx.fillStyle = "#ff7800";
      ctx.font = "bold 10px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`BOOST ${Math.ceil(this.boostTimer / 1000)}s`, 18, statusY + 13);
    }

    this.hudTexture.needsUpdate = true;
  }

  private setupInput() {
    const onKey = (e: KeyboardEvent) => {
      if (this.state === "menu") {
        if (e.code === "Space" || e.code === "Enter") this.startGame();
        return;
      }
      if (this.state === "gameover") {
        if (e.code === "Space" || e.code === "Enter") this.startGame();
        return;
      }
      switch (e.code) {
        case "ArrowLeft": case "KeyA": this.moveLeft(); break;
        case "ArrowRight": case "KeyD": this.moveRight(); break;
        case "ArrowUp": case "KeyW": case "Space": this.jump(); break;
        case "ArrowDown": case "KeyS": this.slide(); break;
      }
    };
    window.addEventListener("keydown", onKey);

    const canvas = this.renderer.domElement;
    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.touchStartX = t.clientX;
      this.touchStartY = t.clientY;
      this.touchStartTime = Date.now();
    }, { passive: false });

    canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      if (this.state !== "playing") {
        this.handleMenuClick(e.changedTouches[0]);
        return;
      }
      const t = e.changedTouches[0];
      const dx = t.clientX - this.touchStartX;
      const dy = t.clientY - this.touchStartY;
      const dt = Date.now() - this.touchStartTime;
      if (dt > 300 || (Math.abs(dx) < 20 && Math.abs(dy) < 20)) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        dx > 0 ? this.moveRight() : this.moveLeft();
      } else {
        dy < 0 ? this.jump() : this.slide();
      }
    }, { passive: false });

    canvas.addEventListener("click", (e) => {
      if (this.state === "playing") return;
      this.handleMenuClickMouse(e);
    });

    (this as any)._keyHandler = onKey;
  }

  private handleMenuClickMouse(e: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    this.processMenuClick(x, y);
  }

  private handleMenuClick(touch: Touch) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * W;
    const y = ((touch.clientY - rect.top) / rect.height) * H;
    this.processMenuClick(x, y);
  }

  private processMenuClick(x: number, y: number) {
    if (this.state === "menu") {
      const btnY = H * 0.5;
      if (y > btnY - 30 && y < btnY + 30 && x > W / 2 - 110 && x < W / 2 + 110) {
        this.startGame();
      }
    } else if (this.state === "gameover") {
      const playY = H * 0.58;
      if (y > playY - 30 && y < playY + 30 && x > W / 2 - 110 && x < W / 2 + 110) {
        this.startGame();
      }
      const menuY = H * 0.66;
      if (y > menuY - 25 && y < menuY + 25 && x > W / 2 - 110 && x < W / 2 + 110) {
        this.state = "menu";
        this.menuMesh.visible = true;
        this.updateMenu();
      }
    }
  }

  private moveLeft() { if (this.targetLane > 0) this.targetLane--; }
  private moveRight() { if (this.targetLane < 2) this.targetLane++; }
  private jump() { if (!this.isJumping) { this.isJumping = true; this.playerVY = JUMP_VEL; this.isSliding = false; } }
  private slide() { if (!this.isJumping) { this.isSliding = true; this.slideTimer = SLIDE_DUR; } }

  private startGame() {
    this.state = "playing";
    this.score = 0;
    this.distance = 0;
    this.coins = 0;
    this.speed = RUN_SPEED_INIT;
    this.lane = 1;
    this.targetLane = 1;
    this.playerY = 0;
    this.playerVY = 0;
    this.isJumping = false;
    this.isSliding = false;
    this.slideTimer = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.phase = 0;
    this.hasShield = false;
    this.hasMagnet = false;
    this.hasBoost = false;
    this.shieldTimer = 0;
    this.magnetTimer = 0;
    this.boostTimer = 0;
    this.nextObstacle = 1;
    this.nextCoin = 0.3;
    this.nextPowerup = 8;
    this.runTime = 0;

    this.clearObjects();
    this.menuMesh.visible = false;
    this.player.position.set(LANES[1], 0.6, 0);
  }

  private clearObjects() {
    for (const o of this.obstacles) this.scene.remove(o.mesh);
    this.obstacles = [];
    for (const c of this.coinPool) this.scene.remove(c.mesh);
    this.coinPool = [];
    for (const p of this.powerups) this.scene.remove(p.mesh);
    this.powerups = [];
    for (const p of this.particles) this.scene.remove(p.mesh);
    this.particles = [];
  }

  private spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);
    const types: ObstacleType[] = ["barrier", "low_gate", "lane_blocker"];
    const type = types[Math.floor(Math.random() * types.length)];
    const group = new THREE.Group();

    const mat = new THREE.MeshStandardMaterial({
      color: 0xff1030, emissive: 0xff0020, emissiveIntensity: 0.6,
      metalness: 0.8, roughness: 0.1, transparent: true, opacity: 0.7,
    });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xff4060, transparent: true, opacity: 0.9 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff0030, transparent: true, opacity: 0.08 });

    if (type === "barrier") {
      const geo = new THREE.BoxGeometry(LANE_W * 0.85, 1.2, 0.15);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 0.6;
      group.add(mesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
      const glowGeo = new THREE.BoxGeometry(LANE_W * 0.95, 1.4, 0.6);
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.y = 0.6;
      group.add(glow);
    } else if (type === "low_gate") {
      const geo = new THREE.BoxGeometry(LANE_W * 0.85, 0.2, 0.1);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 1.6;
      group.add(mesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
      const poleMat = new THREE.MeshStandardMaterial({
        color: 0x440020, emissive: 0xff0030, emissiveIntensity: 0.3,
        metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.8,
      });
      const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.8, 6);
      const poleL = new THREE.Mesh(poleGeo, poleMat);
      poleL.position.set(-LANE_W * 0.4, 0.9, 0);
      group.add(poleL);
      const poleR = new THREE.Mesh(poleGeo, poleMat);
      poleR.position.set(LANE_W * 0.4, 0.9, 0);
      group.add(poleR);
    } else {
      const geo = new THREE.BoxGeometry(0.3, 2.0, 0.1);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 1.0;
      group.add(mesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
      const glowGeo = new THREE.BoxGeometry(0.6, 2.2, 0.5);
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.y = 1.0;
      group.add(glow);
    }

    const z = -TUNNEL_LEN + 5;
    group.position.set(LANES[lane], 0, z);
    this.scene.add(group);
    this.obstacles.push({ mesh: group, type, lane, z, hit: false });
  }

  private spawnCoin() {
    const lane = Math.floor(Math.random() * 3);
    const yOffset = Math.random() > 0.7 ? 1.5 : 0.6;
    const mesh = new THREE.Mesh(this.coinGeom, this.coinMat.clone());
    const z = -TUNNEL_LEN + 5;
    mesh.position.set(LANES[lane], yOffset, z);
    this.scene.add(mesh);
    this.coinPool.push({ mesh, lane, z, collected: false });
  }

  private spawnPowerup() {
    const lane = Math.floor(Math.random() * 3);
    const kinds: ("shield" | "magnet" | "boost")[] = ["shield", "magnet", "boost"];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const group = new THREE.Group();

    const colors = { shield: 0x00ff80, magnet: 0x00ccff, boost: 0xaa44ff };
    const geo = new THREE.IcosahedronGeometry(0.3, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: colors[kind], emissive: colors[kind], emissiveIntensity: 0.8,
      transparent: true, opacity: 0.75, metalness: 0.9, roughness: 0.05,
    });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);

    const wireGeo = new THREE.IcosahedronGeometry(0.35, 0);
    const wireMat = new THREE.MeshBasicMaterial({ color: colors[kind], wireframe: true, transparent: true, opacity: 0.3 });
    group.add(new THREE.Mesh(wireGeo, wireMat));

    const glowGeo = new THREE.SphereGeometry(0.5, 8, 6);
    const glowMat = new THREE.MeshBasicMaterial({ color: colors[kind], transparent: true, opacity: 0.1 });
    group.add(new THREE.Mesh(glowGeo, glowMat));

    const z = -TUNNEL_LEN + 5;
    group.position.set(LANES[lane], 0.8, z);
    this.scene.add(group);
    this.powerups.push({ mesh: group, lane, z, kind, collected: false });
  }

  private spawnParticles(pos: THREE.Vector3, color: THREE.Color, count: number) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.05 + Math.random() * 0.05, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 4,
      );
      this.particles.push({ mesh, vel, life: 0.6 + Math.random() * 0.4 });
    }
  }

  private orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private overlayHudScene = new THREE.Scene();
  private overlayMenuScene = new THREE.Scene();
  private overlaysInitialized = false;

  private ensureOverlays() {
    if (this.overlaysInitialized) return;
    this.overlaysInitialized = true;
    this.overlayHudScene.add(this.hudMesh);
    this.overlayMenuScene.add(this.menuMesh);
  }

  private animate() {
    if (this.destroyed) return;
    this.animId = requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.state === "playing") {
      this.updateGame(dt);
      this.updateHUD();
    }

    this.updateVisuals(dt);

    this.ensureOverlays();

    this.renderer.render(this.scene, this.camera);

    this.renderer.autoClear = false;
    if (this.state === "playing") {
      this.renderer.render(this.overlayHudScene, this.orthoCamera);
    }
    if (this.menuMesh.visible) {
      this.renderer.render(this.overlayMenuScene, this.orthoCamera);
    }
    this.renderer.autoClear = true;
  }

  private updateGame(dt: number) {
    const dtMs = dt * 1000;
    this.runTime += dtMs;
    const effectiveSpeed = this.speed * (this.hasBoost ? BOOST_MULT : 1);
    this.distance += effectiveSpeed * dt;
    this.score = Math.floor(this.distance) + this.coins * COIN_SCORE;

    if (this.speed < RUN_SPEED_MAX) this.speed += SPEED_RAMP * dt;

    for (let i = 0; i < PHASE_THRESHOLDS.length; i++) {
      if (this.distance >= PHASE_THRESHOLDS[i]) this.phase = i;
    }

    const laneX = LANES[this.targetLane];
    this.player.position.x += (laneX - this.player.position.x) * 12 * dt;

    if (this.isJumping) {
      this.playerVY -= GRAVITY * dt;
      this.playerY += this.playerVY * dt;
      if (this.playerY <= 0) { this.playerY = 0; this.playerVY = 0; this.isJumping = false; }
    }

    if (this.isSliding) {
      this.slideTimer -= dtMs;
      if (this.slideTimer <= 0) this.isSliding = false;
    }

    this.player.position.y = 0.6 + this.playerY;
    if (this.isSliding) {
      this.player.scale.set(1.2, 0.5, 1);
      this.player.position.y = 0.3 + this.playerY;
    } else {
      this.player.scale.set(1, 1, 1);
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= dtMs;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    if (this.hasShield) { this.shieldTimer -= dtMs; if (this.shieldTimer <= 0) this.hasShield = false; }
    if (this.hasMagnet) { this.magnetTimer -= dtMs; if (this.magnetTimer <= 0) this.hasMagnet = false; }
    if (this.hasBoost) { this.boostTimer -= dtMs; if (this.boostTimer <= 0) this.hasBoost = false; }
    this.shieldBubble.visible = this.hasShield;

    this.nextObstacle -= dt;
    if (this.nextObstacle <= 0) {
      this.spawnObstacle();
      this.nextObstacle = OBSTACLE_INTERVAL_MIN + Math.random() * (OBSTACLE_INTERVAL_MAX - OBSTACLE_INTERVAL_MIN);
      this.nextObstacle /= (1 + this.phase * 0.15);
    }

    this.nextCoin -= dt;
    if (this.nextCoin <= 0) {
      this.spawnCoin();
      this.nextCoin = COIN_INTERVAL / (1 + this.phase * 0.1);
    }

    this.nextPowerup -= dt;
    if (this.nextPowerup <= 0) {
      this.spawnPowerup();
      this.nextPowerup = POWERUP_INTERVAL;
    }

    const playerZ = this.player.position.z;
    const playerX = this.player.position.x;
    const playerYPos = this.player.position.y;

    for (const obs of this.obstacles) {
      obs.mesh.position.z += effectiveSpeed * dt;
      if (obs.hit || obs.mesh.position.z > 8) continue;

      const dz = Math.abs(obs.mesh.position.z - playerZ);
      const dx = Math.abs(obs.mesh.position.x - playerX);

      if (dz < 0.8 && dx < LANE_W * 0.4) {
        let hit = false;
        if (obs.type === "barrier") {
          hit = playerYPos < 1.3;
        } else if (obs.type === "low_gate") {
          hit = !this.isSliding && playerYPos < 1.8;
        } else {
          hit = true;
        }

        if (hit) {
          obs.hit = true;
          if (this.hasShield) {
            this.hasShield = false;
            this.shieldBubble.visible = false;
            this.spawnParticles(this.player.position.clone(), GREEN, 10);
          } else {
            this.gameOver();
            return;
          }
        }
      }
    }

    for (const coin of this.coinPool) {
      coin.mesh.position.z += effectiveSpeed * dt;
      if (coin.collected) continue;

      if (this.hasMagnet) {
        const dir = new THREE.Vector3().subVectors(this.player.position, coin.mesh.position);
        if (dir.length() < 5) {
          coin.mesh.position.add(dir.normalize().multiplyScalar(15 * dt));
        }
      }

      const dz = Math.abs(coin.mesh.position.z - playerZ);
      const dx = Math.abs(coin.mesh.position.x - playerX);
      const dy = Math.abs(coin.mesh.position.y - playerYPos);

      if (dz < 0.6 && dx < 0.8 && dy < 1.0) {
        coin.collected = true;
        coin.mesh.visible = false;
        this.coins++;
        this.combo++;
        this.comboTimer = COMBO_DECAY;
        const comboMult = this.combo >= 20 ? 5 : this.combo >= 10 ? 3 : this.combo >= 5 ? 2 : 1;
        this.score += COIN_SCORE * comboMult;
        this.spawnParticles(coin.mesh.position.clone(), AMBER_BRIGHT, 5);
      }
    }

    for (const pu of this.powerups) {
      pu.mesh.position.z += effectiveSpeed * dt;
      if (pu.collected) continue;

      const dz = Math.abs(pu.mesh.position.z - playerZ);
      const dx = Math.abs(pu.mesh.position.x - playerX);
      const dy = Math.abs(pu.mesh.position.y - playerYPos);

      if (dz < 0.8 && dx < 0.8 && dy < 1.0) {
        pu.collected = true;
        pu.mesh.visible = false;
        if (pu.kind === "shield") { this.hasShield = true; this.shieldTimer = SHIELD_DUR; }
        else if (pu.kind === "magnet") { this.hasMagnet = true; this.magnetTimer = MAGNET_DUR; }
        else if (pu.kind === "boost") { this.hasBoost = true; this.boostTimer = BOOST_DUR; }
        const c = pu.kind === "shield" ? GREEN : pu.kind === "magnet" ? BLUE : ORANGE;
        this.spawnParticles(pu.mesh.position.clone(), c, 8);
      }
    }

    this.obstacles = this.obstacles.filter(o => {
      if (o.mesh.position.z > 10) { this.scene.remove(o.mesh); return false; }
      return true;
    });
    this.coinPool = this.coinPool.filter(c => {
      if (c.mesh.position.z > 10 || c.collected) { this.scene.remove(c.mesh); return false; }
      return true;
    });
    this.powerups = this.powerups.filter(p => {
      if (p.mesh.position.z > 10 || p.collected) { this.scene.remove(p.mesh); return false; }
      return true;
    });
  }

  private updateVisuals(dt: number) {
    const t = this.clock.elapsedTime;

    const wingFlap = Math.sin(t * 25) * 0.35;
    this.playerWingL.rotation.z = 0.5 + wingFlap;
    this.playerWingR.rotation.z = -0.5 - wingFlap;
    if (this.hindWingL) this.hindWingL.rotation.z = 0.6 + wingFlap * 0.8;
    if (this.hindWingR) this.hindWingR.rotation.z = -0.6 - wingFlap * 0.8;

    for (let li = 0; li < this.legs.length; li++) {
      const leg = this.legs[li];
      const legPhase = li * 0.5;
      leg.rotation.x = Math.sin(t * 8 + legPhase) * 0.15;
    }

    for (let ai = 0; ai < this.antennae.length; ai++) {
      const ant = this.antennae[ai];
      ant.rotation.x = Math.sin(t * 3 + ai) * 0.1;
      ant.rotation.z = (ai === 0 ? -1 : 1) * (0.1 + Math.sin(t * 2.5 + ai * 2) * 0.08);
    }

    if (this.isSliding) {
      this.player.rotation.x = 0.3;
    } else {
      this.player.rotation.x = 0;
    }
    this.player.rotation.z = Math.sin(t * 2) * 0.03;

    const phaseColor = PHASE_RING_COLORS[this.phase] || AMBER_BRIGHT;
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i];
      if (this.state === "playing") {
        ring.position.z += this.speed * (this.hasBoost ? BOOST_MULT : 1) * dt;
        if (ring.position.z > 10) ring.position.z -= TUNNEL_LEN;
      }
      const pulse = 0.2 + Math.sin(t * 3 + i * 0.5) * 0.15;
      (ring.material as THREE.LineBasicMaterial).opacity = pulse;
      (ring.material as THREE.LineBasicMaterial).color.copy(phaseColor);
    }

    for (const coin of this.coinPool) {
      if (!coin.collected) {
        coin.mesh.rotation.y += dt * 3;
        coin.mesh.rotation.x = Math.sin(t * 2) * 0.2;
      }
    }

    for (const pu of this.powerups) {
      if (!pu.collected) {
        pu.mesh.rotation.y += dt * 2;
        pu.mesh.position.y = 0.8 + Math.sin(t * 3) * 0.15;
      }
    }

    this.particles = this.particles.filter(p => {
      p.life -= dt;
      if (p.life <= 0) { this.scene.remove(p.mesh); return false; }
      p.mesh.position.add(p.vel.clone().multiplyScalar(dt));
      p.vel.y -= 5 * dt;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.life;
      return true;
    });

    this.pointLight.color.copy(phaseColor);
    this.pointLight.intensity = 1.5 + Math.sin(t * 4) * 0.5;
  }

  private gameOver() {
    this.state = "gameover";
    addCoins(this.coins);
    incrementRuns();
    setBestScore(this.score);

    this.menuMesh.visible = true;
    this.updateMenu();

    window.dispatchEvent(new CustomEvent("honeyrunner:gameover", {
      detail: { score: this.score, distance: Math.floor(this.distance), coins: this.coins, duration: Math.floor(this.runTime) },
    }));
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.animId);
    if ((this as any)._keyHandler) {
      window.removeEventListener("keydown", (this as any)._keyHandler);
    }
    this.clearObjects();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
    }
    if (this.scene) this.scene.clear();
  }
}

export function createHoneyRunnerGame(parent: HTMLElement): { destroy: (removeCanvas?: boolean) => void } {
  const game = new HoneyRunner3D(parent);
  return {
    destroy: (_removeCanvas?: boolean) => game.destroy(),
  };
}
