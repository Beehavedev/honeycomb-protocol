import * as THREE from "three";
import { getBestScore, setBestScore, addCoins, incrementRuns } from "./storage";

const W = 480, H = 854;
const LANE_W = 2.2;
const LANES = [-LANE_W, 0, LANE_W];
const RUN_SPEED_INIT = 12;
const RUN_SPEED_MAX = 32;
const SPEED_RAMP = 0.15;
const JUMP_VEL = 12;
const GRAVITY = 30;
const SLIDE_DUR = 600;
const COIN_SCORE = 10;
const MAGNET_DUR = 8000;
const SHIELD_DUR = 10000;
const BOOST_DUR = 5000;
const BOOST_MULT = 1.6;
const OBSTACLE_INTERVAL_MIN = 0.6;
const OBSTACLE_INTERVAL_MAX = 1.8;
const COIN_INTERVAL = 0.5;
const POWERUP_INTERVAL = 10;
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
const PHASE_NAMES = ["AMBER SURGE", "GOLDEN BLAZE", "HONEY RUSH", "HYPER HIVE"];
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
  private rings: THREE.Mesh[] = [];
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
    this.scene.fog = new THREE.FogExp2(0x020204, 0.025);

    this.camera = new THREE.PerspectiveCamera(65, W / H, 0.1, 200);
    this.camera.position.set(0, 3.5, 6);
    this.camera.lookAt(0, 1.5, -20);

    this.ambientLight = new THREE.AmbientLight(0x222222, 0.6);
    this.scene.add(this.ambientLight);

    this.pointLight = new THREE.PointLight(0xf0a500, 2, 30);
    this.pointLight.position.set(0, 4, 2);
    this.scene.add(this.pointLight);

    const backLight = new THREE.PointLight(0x4488ff, 0.8, 40);
    backLight.position.set(0, 3, -15);
    this.scene.add(backLight);

    this.coinGeom = new THREE.SphereGeometry(0.25, 12, 8);
    this.coinMat = new THREE.MeshStandardMaterial({ color: 0xffc040, emissive: 0xf0a500, emissiveIntensity: 0.5, metalness: 0.8, roughness: 0.2 });

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

    const floorGeo = new THREE.PlaneGeometry(TUNNEL_RAD * 2.2, TUNNEL_LEN);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a12,
      emissive: 0x020204,
      emissiveIntensity: 0.3,
      metalness: 0.6,
      roughness: 0.4,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.01, -TUNNEL_LEN / 2 + 10);
    this.tunnel.add(floor);

    for (let i = 0; i < 3; i++) {
      const laneX = LANES[i];
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(laneX - LANE_W * 0.45, 0.01, 10),
        new THREE.Vector3(laneX - LANE_W * 0.45, 0.01, -TUNNEL_LEN),
        new THREE.Vector3(laneX + LANE_W * 0.45, 0.01, 10),
        new THREE.Vector3(laneX + LANE_W * 0.45, 0.01, -TUNNEL_LEN),
      ]);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xf0a500, transparent: true, opacity: 0.15 });
      const line = new THREE.LineSegments(lineGeo, lineMat);
      this.tunnel.add(line);
    }

    const ringGeo = new THREE.TorusGeometry(TUNNEL_RAD, 0.06, 8, 32);
    for (let i = 0; i < RING_COUNT; i++) {
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xf0a500, transparent: true, opacity: 0.3 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(0, TUNNEL_RAD * 0.55, -i * (TUNNEL_LEN / RING_COUNT));
      ring.rotation.y = Math.PI * 0.02 * i;
      this.tunnel.add(ring);
      this.rings.push(ring);
    }

    const wallLineCount = 12;
    const wallLineMat = new THREE.LineBasicMaterial({ color: 0xf0a500, transparent: true, opacity: 0.08 });
    for (let i = 0; i < wallLineCount; i++) {
      const angle = (i / wallLineCount) * Math.PI * 2;
      const pts = [];
      for (let z = 0; z <= TUNNEL_LEN; z += 2) {
        const x = Math.cos(angle) * TUNNEL_RAD;
        const y = Math.sin(angle) * TUNNEL_RAD * 0.55 + TUNNEL_RAD * 0.55;
        pts.push(new THREE.Vector3(x, Math.max(y, 0), -z + 10));
      }
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(lineGeo, wallLineMat);
      this.tunnel.add(line);
      this.wallLines.push(line);
    }
  }

  private buildPlayer() {
    this.player = new THREE.Group();

    const bodyGeo = new THREE.CapsuleGeometry(0.35, 0.5, 8, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1208, emissive: 0xf0a500, emissiveIntensity: 0.15, metalness: 0.5, roughness: 0.4 });
    this.playerBody = new THREE.Mesh(bodyGeo, bodyMat);
    this.playerBody.castShadow = true;
    this.player.add(this.playerBody);

    const stripeGeo = new THREE.TorusGeometry(0.36, 0.04, 8, 16);
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xf0a500, emissiveIntensity: 0.6, metalness: 0.7, roughness: 0.2 });
    for (let i = -1; i <= 1; i++) {
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.y = i * 0.2;
      stripe.rotation.x = Math.PI / 2;
      this.player.add(stripe);
    }

    const eyeGeo = new THREE.SphereGeometry(0.1, 8, 6);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffd040, emissive: 0xffd040, emissiveIntensity: 1.0 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.18, 0.15, 0.28);
    this.player.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.18, 0.15, 0.28);
    this.player.add(eyeR);

    const wingGeo = new THREE.PlaneGeometry(0.6, 0.3);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xf0a500, emissive: 0xf0a500, emissiveIntensity: 0.4,
      transparent: true, opacity: 0.6, side: THREE.DoubleSide,
      metalness: 0.3, roughness: 0.5,
    });
    this.playerWingL = new THREE.Mesh(wingGeo, wingMat);
    this.playerWingL.position.set(-0.55, 0.2, -0.05);
    this.playerWingL.rotation.set(0, -0.3, 0.4);
    this.player.add(this.playerWingL);

    this.playerWingR = new THREE.Mesh(wingGeo, wingMat);
    this.playerWingR.position.set(0.55, 0.2, -0.05);
    this.playerWingR.rotation.set(0, 0.3, -0.4);
    this.player.add(this.playerWingR);

    const stingerGeo = new THREE.ConeGeometry(0.08, 0.3, 6);
    const stingerMat = new THREE.MeshStandardMaterial({ color: 0xff7800, emissive: 0xff7800, emissiveIntensity: 0.3 });
    const stinger = new THREE.Mesh(stingerGeo, stingerMat);
    stinger.position.set(0, -0.05, -0.45);
    stinger.rotation.x = Math.PI / 2;
    this.player.add(stinger);

    const shieldGeo = new THREE.SphereGeometry(0.7, 16, 12);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x00ff80, emissive: 0x00ff80, emissiveIntensity: 0.3,
      transparent: true, opacity: 0.25, side: THREE.DoubleSide,
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

    ctx.fillStyle = "rgba(2,2,4,0.85)";
    ctx.fillRect(0, 0, W, H);

    if (this.state === "menu") {
      ctx.fillStyle = "#f0a500";
      ctx.font = "bold 42px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("HONEYRUNNER", W / 2, H * 0.3);

      ctx.fillStyle = "#ffc040";
      ctx.font = "16px 'Inter', sans-serif";
      ctx.fillText("3D Endless Runner", W / 2, H * 0.3 + 35);

      this.drawBtn(ctx, W / 2, H * 0.5, 200, 50, "PLAY", "#f0a500", "#000");

      const best = getBestScore();
      if (best > 0) {
        ctx.fillStyle = "#888";
        ctx.font = "14px 'Inter', sans-serif";
        ctx.fillText(`Best Score: ${best.toLocaleString()}`, W / 2, H * 0.5 + 60);
      }

      ctx.fillStyle = "#666";
      ctx.font = "13px 'Inter', sans-serif";
      ctx.fillText("Arrow Keys / Swipe to move", W / 2, H * 0.7);
      ctx.fillText("Up / Swipe Up to jump", W / 2, H * 0.7 + 22);
      ctx.fillText("Down / Swipe Down to slide", W / 2, H * 0.7 + 44);
    } else if (this.state === "gameover") {
      ctx.fillStyle = "#ff3858";
      ctx.font = "bold 36px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", W / 2, H * 0.25);

      const isNew = setBestScore(this.score);
      if (isNew) {
        ctx.fillStyle = "#ffc040";
        ctx.font = "bold 16px 'Inter', sans-serif";
        ctx.fillText("NEW BEST!", W / 2, H * 0.25 + 30);
      }

      ctx.fillStyle = "#f0a500";
      ctx.font = "bold 48px 'JetBrains Mono', monospace";
      ctx.fillText(this.score.toLocaleString(), W / 2, H * 0.38);

      ctx.fillStyle = "#aaa";
      ctx.font = "14px 'Inter', sans-serif";
      ctx.fillText(`Distance: ${Math.floor(this.distance)}m`, W / 2, H * 0.38 + 30);
      ctx.fillText(`Coins: ${this.coins}`, W / 2, H * 0.38 + 52);
      ctx.fillText(`Max Combo: ${this.combo}x`, W / 2, H * 0.38 + 74);

      this.drawBtn(ctx, W / 2, H * 0.58, 200, 50, "PLAY AGAIN", "#f0a500", "#000");
      this.drawBtn(ctx, W / 2, H * 0.66, 200, 40, "MENU", "#333", "#ccc");
    }

    this.menuTexture.needsUpdate = true;
  }

  private drawBtn(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, text: string, bg: string, fg: string) {
    const r = 8;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, r);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.font = `bold ${h > 42 ? 18 : 14}px 'Inter', sans-serif`;
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
      color: 0xff3858, emissive: 0xff1030, emissiveIntensity: 0.4,
      metalness: 0.6, roughness: 0.3, transparent: true, opacity: 0.9,
    });

    if (type === "barrier") {
      const geo = new THREE.BoxGeometry(LANE_W * 0.85, 1.2, 0.4);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 0.6;
      group.add(mesh);
      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0xff6080 });
      group.add(new THREE.LineSegments(edgeGeo, edgeMat));
    } else if (type === "low_gate") {
      const geo = new THREE.BoxGeometry(LANE_W * 0.85, 0.35, 0.4);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 1.6;
      group.add(mesh);
      const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6);
      const poleL = new THREE.Mesh(poleGeo, mat);
      poleL.position.set(-LANE_W * 0.4, 0.9, 0);
      group.add(poleL);
      const poleR = new THREE.Mesh(poleGeo, mat);
      poleR.position.set(LANE_W * 0.4, 0.9, 0);
      group.add(poleR);
    } else {
      const geo = new THREE.BoxGeometry(0.5, 2.0, 0.4);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 1.0;
      group.add(mesh);
      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0xff6080 });
      group.add(new THREE.LineSegments(edgeGeo, edgeMat));
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

    const colors = { shield: 0x00ff80, magnet: 0x4488ff, boost: 0xff7800 };
    const geo = new THREE.OctahedronGeometry(0.35, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: colors[kind], emissive: colors[kind], emissiveIntensity: 0.6,
      transparent: true, opacity: 0.85, metalness: 0.4, roughness: 0.3,
    });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);

    const glowGeo = new THREE.SphereGeometry(0.5, 8, 6);
    const glowMat = new THREE.MeshBasicMaterial({ color: colors[kind], transparent: true, opacity: 0.15 });
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

    this.playerWingL.rotation.z = 0.4 + Math.sin(t * 20) * 0.3;
    this.playerWingR.rotation.z = -0.4 - Math.sin(t * 20) * 0.3;

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
      (ring.material as THREE.MeshBasicMaterial).opacity = pulse;
      (ring.material as THREE.MeshBasicMaterial).color.copy(phaseColor);
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
