import Phaser from "phaser";
import {
  GAME_WIDTH, GAME_HEIGHT, LANE_POSITIONS, LANE_COUNT, LANE_WIDTH,
  FONT_UI, FONT_DISPLAY, FONT_MONO, C,
} from "./constants";
import { sfxCoin, sfxDash, sfxJump, sfxPowerup, sfxPhase, sfxDeath, sfxShieldBreak, sfxCombo, sfxMenuClick } from "./audio";

const W = GAME_WIDTH, H = GAME_HEIGHT;
const CX = W / 2;
const VY = H * 0.30;
const PI = Math.PI;
const TAU = PI * 2;

interface NfaTraits {
  agility: number;
  focus: number;
  luck: number;
  shielded: boolean;
}

interface TunnelDashConfig {
  nfaId: string;
  nfaTokenId: number;
  nfaName: string;
  traits: NfaTraits;
  mode: "ranked" | "practice";
  playerAddress: string;
}

const DEFAULT_TRAITS: NfaTraits = { agility: 5, focus: 5, luck: 5, shielded: false };

let dashConfig: TunnelDashConfig = {
  nfaId: "",
  nfaTokenId: 0,
  nfaName: "Agent",
  traits: DEFAULT_TRAITS,
  mode: "practice",
  playerAddress: "",
};

export function setTunnelDashConfig(cfg: TunnelDashConfig) {
  dashConfig = cfg;
}

function drawGlassPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, radius: number, bgAlpha = 0.65) {
  g.fillStyle(C.glass, bgAlpha);
  g.fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(1.5, C.glassBorder, 0.5);
  g.strokeRoundedRect(x, y, w, h, radius);
  g.fillStyle(0xffffff, 0.05);
  g.fillRoundedRect(x + 1, y + 1, w - 2, h * 0.35, { tl: radius, tr: radius, bl: 0, br: 0 });
}

function drawGlassBtn(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, col: number, alpha = 0.7) {
  const r = h / 2;
  g.fillStyle(0x050508, alpha);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
  g.lineStyle(2.5, col, 0.85);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
  g.fillStyle(col, 0.08);
  g.fillRoundedRect(x - w / 2 + 2, y - h / 2 + 2, w - 4, h * 0.4, { tl: r, tr: r, bl: 0, br: 0 });
}

function lerpColor(c1: number, c2: number, t: number): number {
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
  return (Math.round(r1 + (r2 - r1) * t) << 16) |
    (Math.round(g1 + (g2 - g1) * t) << 8) |
    Math.round(b1 + (b2 - b1) * t);
}

class BootScene extends Phaser.Scene {
  constructor() { super({ key: "TunnelBoot" }); }

  create() {
    const g = this.make.graphics({ x: 0, y: 0 });

    g.clear();
    g.fillStyle(C.bgDeep, 1);
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) {
      g.fillStyle(0xffffff, 0.15 + Math.random() * 0.6);
      g.fillCircle(Math.random() * W, Math.random() * H, 0.5 + Math.random() * 1.2);
    }
    g.generateTexture("td_bg", W, H);
    g.clear();

    const bw = 80, bh = 50;
    g.fillStyle(C.laserRedGlow, 0.15);
    g.fillRoundedRect(-6, -6, bw + 12, bh + 12, 10);
    g.fillStyle(0x200010, 0.95);
    g.fillRoundedRect(0, 0, bw, bh, 6);
    for (let ly = 4; ly < bh; ly += 4) {
      g.lineStyle(2.5, C.laserRed, 0.8);
      g.lineBetween(5, ly, bw - 5, ly);
      g.lineStyle(6, C.laserRedGlow, 0.12);
      g.lineBetween(5, ly, bw - 5, ly);
    }
    g.lineStyle(3, C.laserRed, 0.95);
    g.strokeRoundedRect(1, 1, bw - 2, bh - 2, 6);
    g.lineStyle(8, C.laserRedGlow, 0.18);
    g.strokeRoundedRect(0, 0, bw, bh, 7);
    g.generateTexture("td_barrier", bw, bh);
    g.clear();

    g.fillStyle(C.laserRedGlow, 0.1);
    g.fillRoundedRect(-4, -4, bw + 8, 24, 6);
    g.fillStyle(0x200010, 0.95);
    g.fillRoundedRect(0, 0, bw, 16, 4);
    g.lineStyle(3.5, C.laserRed, 0.95);
    g.lineBetween(0, 8, bw, 8);
    g.lineStyle(10, C.laserRedGlow, 0.14);
    g.lineBetween(0, 8, bw, 8);
    g.generateTexture("td_low_gate", bw, 16);
    g.clear();

    const gw = 80, gh = 50;
    g.fillStyle(C.glitchPurple, 0.1);
    g.fillRoundedRect(-4, -4, gw + 8, gh + 8, 8);
    g.fillStyle(0x0c0020, 0.95);
    g.fillRoundedRect(0, 0, gw, gh, 6);
    for (let i = 0; i < 12; i++) {
      const ox = Phaser.Math.Between(4, gw - 12);
      const oy = Phaser.Math.Between(4, gh - 10);
      g.fillStyle(C.glitchPurple, 0.4 + Math.random() * 0.5);
      g.fillRect(ox, oy, Phaser.Math.Between(6, 22), Phaser.Math.Between(3, 10));
    }
    g.lineStyle(2.5, C.glitchPurple, 0.9);
    g.strokeRoundedRect(1, 1, gw - 2, gh - 2, 6);
    g.generateTexture("td_glitch", gw, gh);
    g.clear();

    const cs = 22;
    g.fillStyle(C.coinGlow, 0.12);
    g.fillCircle(cs, cs, cs + 10);
    g.fillStyle(C.coinBody, 1);
    g.fillCircle(cs, cs, cs - 2);
    g.fillStyle(C.coinLight, 0.4);
    g.fillCircle(cs, cs, cs - 5);
    g.fillStyle(C.coinBody, 0.3);
    g.fillCircle(cs, cs, cs - 8);
    g.lineStyle(2.5, C.coinShine, 0.8);
    g.strokeCircle(cs, cs, cs - 2);
    g.fillStyle(C.coinGlow, 0.6);
    g.fillCircle(cs, cs, 5);
    g.generateTexture("td_coin", cs * 2, cs * 2);
    g.clear();

    const ps = 20;
    const drawPowerBase = (col: number) => {
      g.fillStyle(col, 0.1);
      g.fillCircle(ps, ps, ps + 8);
      g.fillStyle(0x080018, 0.92);
      g.fillRoundedRect(0, 0, ps * 2, ps * 2, 10);
      g.lineStyle(2.5, col, 0.9);
      g.strokeRoundedRect(0, 0, ps * 2, ps * 2, 10);
    };

    drawPowerBase(C.shieldGreen);
    g.lineStyle(3, C.shieldGreen, 0.95);
    g.beginPath();
    g.moveTo(ps, 4); g.lineTo(ps + 11, 9); g.lineTo(ps + 11, 24);
    g.lineTo(ps, 32); g.lineTo(ps - 11, 24); g.lineTo(ps - 11, 9);
    g.closePath(); g.strokePath();
    g.fillStyle(C.shieldGreen, 0.2);
    g.fillCircle(ps, ps, 6);
    g.generateTexture("td_shield", ps * 2, ps * 2);
    g.clear();

    drawPowerBase(C.magnetBlue);
    g.lineStyle(3, C.magnetBlue, 0.95);
    g.beginPath(); g.arc(ps, ps - 1, 7, PI, 0, false); g.strokePath();
    g.fillStyle(C.magnetBlue, 1);
    g.fillRect(ps - 7, ps - 1, 4, 12);
    g.fillRect(ps + 3, ps - 1, 4, 12);
    g.generateTexture("td_magnet", ps * 2, ps * 2);
    g.clear();

    drawPowerBase(C.boostOrange);
    g.fillStyle(C.boostOrange, 0.9);
    g.beginPath();
    g.moveTo(ps, 5); g.lineTo(ps + 8, ps); g.lineTo(ps + 3, ps);
    g.lineTo(ps + 3, ps * 2 - 5); g.lineTo(ps - 3, ps * 2 - 5); g.lineTo(ps - 3, ps);
    g.lineTo(ps - 8, ps); g.closePath(); g.fillPath();
    g.generateTexture("td_boost", ps * 2, ps * 2);
    g.clear();

    const aw = 28, ah = 36;
    g.fillStyle(C.amber, 0.1);
    g.fillCircle(aw, ah / 2, 20);
    g.fillStyle(0x1a1208, 0.95);
    g.fillRoundedRect(aw - 12, 0, 24, ah, 6);
    g.fillStyle(C.amber, 1);
    g.fillCircle(aw - 4, 8, 4);
    g.fillCircle(aw + 4, 8, 4);
    g.fillStyle(C.amberBright, 0.5);
    g.fillCircle(aw - 4, 7, 2);
    g.fillCircle(aw + 4, 7, 2);
    g.fillStyle(C.honey, 0.8);
    g.fillRect(aw - 8, 14, 16, 3);
    g.fillRect(aw - 9, 20, 18, 3);
    g.fillRect(aw - 8, 26, 16, 3);
    g.lineStyle(1.5, C.amber, 0.7);
    g.lineBetween(aw - 6, ah - 4, aw - 2, ah + 4);
    g.lineBetween(aw + 6, ah - 4, aw + 2, ah + 4);
    g.lineStyle(2, C.amberBright, 0.4);
    g.strokeRoundedRect(aw - 12, 0, 24, ah, 6);
    g.generateTexture("td_nfa_agent", aw * 2, ah + 8);
    g.clear();

    g.destroy();
    this.scene.start("TunnelMenu");
  }
}

class MenuScene extends Phaser.Scene {
  constructor() { super({ key: "TunnelMenu" }); }

  create() {
    this.add.image(CX, H / 2, "td_bg");

    const tunnelG = this.add.graphics();
    const ringCount = 12;
    for (let i = 0; i < ringCount; i++) {
      const t = i / ringCount;
      const y = VY + (H - VY) * t;
      const rx = 30 + (W * 0.6) * t;
      const ry = 10 + 80 * t;
      tunnelG.lineStyle(2 + t * 3, C.amber, 0.08 + t * 0.12);
      tunnelG.strokeEllipse(CX, y, rx * 2, ry * 2);
    }

    const title = this.add.text(CX, H * 0.18, "NFA TUNNEL\nDASH", {
      fontFamily: FONT_DISPLAY,
      fontSize: "36px",
      color: "#F0A500",
      align: "center",
      fontStyle: "bold",
      lineSpacing: 4,
    }).setOrigin(0.5);
    title.setShadow(0, 0, "#F0A500", 12, true, true);

    const nfaName = dashConfig.nfaName || "Select NFA";
    const subtitle = this.add.text(CX, H * 0.34, `Agent: ${nfaName}`, {
      fontFamily: FONT_UI,
      fontSize: "16px",
      color: "#ffc040",
    }).setOrigin(0.5);

    const traits = dashConfig.traits;
    const traitText = `AGI ${traits.agility}  FOC ${traits.focus}  LCK ${traits.luck}`;
    this.add.text(CX, H * 0.39, traitText, {
      fontFamily: FONT_MONO,
      fontSize: "13px",
      color: "#80ffff",
    }).setOrigin(0.5);

    const modeLabel = dashConfig.mode === "ranked" ? "RANKED MODE" : "PRACTICE MODE";
    const modeCol = dashConfig.mode === "ranked" ? "#ff5050" : "#80ff80";
    this.add.text(CX, H * 0.44, modeLabel, {
      fontFamily: FONT_UI,
      fontSize: "13px",
      color: modeCol,
      fontStyle: "bold",
    }).setOrigin(0.5);

    const btnG = this.add.graphics();
    drawGlassBtn(btnG, CX, H * 0.55, 200, 50, C.amber);
    const playTxt = this.add.text(CX, H * 0.55, "START DASH", {
      fontFamily: FONT_DISPLAY,
      fontSize: "20px",
      color: "#F0A500",
      fontStyle: "bold",
    }).setOrigin(0.5);

    const hitZone = this.add.zone(CX, H * 0.55, 200, 50).setInteractive();
    hitZone.on("pointerdown", () => {
      sfxMenuClick();
      this.scene.start("TunnelGame");
    });

    drawGlassBtn(btnG, CX, H * 0.65, 180, 42, C.cyan);
    this.add.text(CX, H * 0.65, "LEADERBOARD", {
      fontFamily: FONT_UI,
      fontSize: "15px",
      color: "#00f0ff",
    }).setOrigin(0.5);

    const lbZone = this.add.zone(CX, H * 0.65, 180, 42).setInteractive();
    lbZone.on("pointerdown", () => {
      sfxMenuClick();
      window.dispatchEvent(new CustomEvent("nfa-tunnel:show-leaderboard"));
    });

    const tipTexts = [
      "Swipe left/right to dodge obstacles",
      "Swipe up to jump, down to slide",
      "Collect coins for bonus score",
      "Higher NFA traits = better modifiers",
    ];
    const tip = tipTexts[Math.floor(Math.random() * tipTexts.length)];
    this.add.text(CX, H * 0.80, tip, {
      fontFamily: FONT_UI,
      fontSize: "12px",
      color: "#888888",
      wordWrap: { width: W - 60 },
      align: "center",
    }).setOrigin(0.5);

    this.add.text(CX, H * 0.88, "7 DAYS TO TGE - EARN POINTS NOW", {
      fontFamily: FONT_MONO,
      fontSize: "11px",
      color: "#F0A500",
    }).setOrigin(0.5).setAlpha(0.7);
  }
}

const INITIAL_GAME_SPEED = 4;
const MAX_GAME_SPEED = 16;
const SPEED_RAMP = 0.003;
const RUNNER_Y = 640;
const JUMP_VEL = -580;
const GRAV = 1300;
const SLIDE_DUR = 550;
const OBS_MIN = 700;
const OBS_MAX = 1800;
const COIN_INTERVAL = 1100;
const POWER_INTERVAL = 14000;
const SHIELD_DUR = 10000;
const MAGNET_DUR = 8000;
const BOOST_DUR = 5000;
const BOOST_MULT = 1.8;
const COMBO_DECAY = 3000;
const DASH_DUR = 1000;
const DASH_CD = 7000;

type ObstacleType = "barrier" | "low_gate" | "glitch";
type PowerType = "shield" | "magnet" | "boost";

interface GameObj {
  sprite: Phaser.GameObjects.Image;
  lane: number;
  z: number;
  type: string;
  subtype?: ObstacleType | PowerType;
  collected?: boolean;
}

class GameScene extends Phaser.Scene {
  private speed = INITIAL_GAME_SPEED;
  private score = 0;
  private distance = 0;
  private startTime = 0;
  private alive = true;
  private lane = 1;
  private targetLane = 1;
  private playerY = RUNNER_Y;
  private velY = 0;
  private isJumping = false;
  private isSliding = false;
  private slideTimer = 0;
  private isDashing = false;
  private dashTimer = 0;
  private dashCooldown = 0;
  private combo = 0;
  private maxCombo = 0;
  private comboTimer = 0;
  private coinsCollected = 0;
  private boostsUsed = 0;
  private shieldsUsed = 0;
  private magnetsUsed = 0;
  private hits = 0;
  private nearMisses = 0;
  private maxSpeed = 0;

  private hasShield = false;
  private shieldEnd = 0;
  private hasMagnet = false;
  private magnetEnd = 0;
  private hasBoost = false;
  private boostEnd = 0;

  private objects: GameObj[] = [];
  private nextObsTime = 0;
  private nextCoinTime = 0;
  private nextPowerTime = 0;

  private tunnelG!: Phaser.GameObjects.Graphics;
  private hudG!: Phaser.GameObjects.Graphics;
  private player!: Phaser.GameObjects.Image;
  private scoreTxt!: Phaser.GameObjects.Text;
  private comboTxt!: Phaser.GameObjects.Text;
  private distTxt!: Phaser.GameObjects.Text;
  private speedTxt!: Phaser.GameObjects.Text;
  private shieldIcon!: Phaser.GameObjects.Text;
  private magnetIcon!: Phaser.GameObjects.Text;
  private boostIcon!: Phaser.GameObjects.Text;

  private traitMods = { speedMult: 1, coinMult: 1, luckBonus: 0, startShield: false };
  private touchStartX = 0;
  private touchStartY = 0;
  private phaseIndex = 0;
  private phaseColors = [C.amber, C.honeyBright, C.orangeHot, C.laserRedBright];
  private phaseThresholds = [0, 3000, 8000, 18000];

  constructor() { super({ key: "TunnelGame" }); }

  create() {
    const t = dashConfig.traits;
    this.traitMods = {
      speedMult: 1 + (t.agility - 5) * 0.02,
      coinMult: 1 + (t.focus - 5) * 0.1,
      luckBonus: (t.luck - 5) * 0.02,
      startShield: t.shielded,
    };

    this.speed = INITIAL_GAME_SPEED;
    this.score = 0;
    this.distance = 0;
    this.alive = true;
    this.lane = 1;
    this.targetLane = 1;
    this.playerY = RUNNER_Y;
    this.velY = 0;
    this.isJumping = false;
    this.isSliding = false;
    this.slideTimer = 0;
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.coinsCollected = 0;
    this.boostsUsed = 0;
    this.shieldsUsed = 0;
    this.magnetsUsed = 0;
    this.hits = 0;
    this.nearMisses = 0;
    this.maxSpeed = 0;
    this.objects = [];
    this.hasShield = this.traitMods.startShield;
    this.shieldEnd = this.traitMods.startShield ? Date.now() + SHIELD_DUR : 0;
    this.hasMagnet = false;
    this.magnetEnd = 0;
    this.hasBoost = false;
    this.boostEnd = 0;
    this.phaseIndex = 0;
    this.startTime = Date.now();

    const now = this.time.now;
    this.nextObsTime = now + 2000;
    this.nextCoinTime = now + 1000;
    this.nextPowerTime = now + 8000;

    this.add.image(CX, H / 2, "td_bg");
    this.tunnelG = this.add.graphics();
    this.player = this.add.image(CX, RUNNER_Y, "td_nfa_agent").setScale(1.2);

    this.hudG = this.add.graphics();
    this.scoreTxt = this.add.text(CX, 16, "0", {
      fontFamily: FONT_MONO,
      fontSize: "28px",
      color: "#F0A500",
      fontStyle: "bold",
    }).setOrigin(0.5, 0).setDepth(100);

    this.comboTxt = this.add.text(CX, 50, "", {
      fontFamily: FONT_MONO,
      fontSize: "14px",
      color: "#00f0ff",
    }).setOrigin(0.5, 0).setDepth(100);

    this.distTxt = this.add.text(14, 16, "0m", {
      fontFamily: FONT_MONO,
      fontSize: "13px",
      color: "#888",
    }).setDepth(100);

    this.speedTxt = this.add.text(W - 14, 16, "", {
      fontFamily: FONT_MONO,
      fontSize: "13px",
      color: "#888",
    }).setOrigin(1, 0).setDepth(100);

    this.shieldIcon = this.add.text(14, H - 30, "", { fontFamily: FONT_UI, fontSize: "13px", color: "#00ff80" }).setDepth(100);
    this.magnetIcon = this.add.text(80, H - 30, "", { fontFamily: FONT_UI, fontSize: "13px", color: "#58a0ff" }).setDepth(100);
    this.boostIcon = this.add.text(150, H - 30, "", { fontFamily: FONT_UI, fontSize: "13px", color: "#ff7800" }).setDepth(100);

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.touchStartX = p.x;
      this.touchStartY = p.y;
    });

    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (!this.alive) return;
      const dx = p.x - this.touchStartX;
      const dy = p.y - this.touchStartY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 20) {
        this.doDash();
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30) this.moveRight();
        else if (dx < -30) this.moveLeft();
      } else {
        if (dy < -30) this.doJump();
        else if (dy > 30) this.doSlide();
      }
    });

    const keys = this.input.keyboard;
    if (keys) {
      keys.on("keydown-LEFT", () => this.moveLeft());
      keys.on("keydown-RIGHT", () => this.moveRight());
      keys.on("keydown-A", () => this.moveLeft());
      keys.on("keydown-D", () => this.moveRight());
      keys.on("keydown-UP", () => this.doJump());
      keys.on("keydown-DOWN", () => this.doSlide());
      keys.on("keydown-W", () => this.doJump());
      keys.on("keydown-S", () => this.doSlide());
      keys.on("keydown-SPACE", () => this.doDash());
    }
  }

  private moveLeft() {
    if (!this.alive) return;
    if (this.targetLane > 0) {
      this.targetLane--;
    }
  }

  private moveRight() {
    if (!this.alive) return;
    if (this.targetLane < LANE_COUNT - 1) {
      this.targetLane++;
    }
  }

  private doJump() {
    if (!this.alive || this.isJumping) return;
    this.velY = JUMP_VEL;
    this.isJumping = true;
    this.isSliding = false;
    sfxJump();
  }

  private doSlide() {
    if (!this.alive || this.isJumping) return;
    this.isSliding = true;
    this.slideTimer = SLIDE_DUR;
    sfxDash();
  }

  private doDash() {
    if (!this.alive || this.isDashing || this.dashCooldown > 0) return;
    this.isDashing = true;
    this.dashTimer = DASH_DUR;
    this.dashCooldown = DASH_CD;
    sfxDash();
  }

  update(_time: number, delta: number) {
    if (!this.alive) return;

    const dt = delta / 1000;
    const effSpeed = this.speed * (this.hasBoost ? BOOST_MULT : 1) * this.traitMods.speedMult;

    this.speed = Math.min(MAX_GAME_SPEED, this.speed + SPEED_RAMP * delta);
    this.distance += effSpeed * dt * 10;
    this.score += Math.floor(effSpeed * dt * 5);
    if (effSpeed > this.maxSpeed) this.maxSpeed = effSpeed;

    for (let i = 0; i < this.phaseThresholds.length; i++) {
      if (this.score >= this.phaseThresholds[i]) this.phaseIndex = i;
    }

    if (this.isJumping) {
      this.velY += GRAV * dt;
      this.playerY += this.velY * dt;
      if (this.playerY >= RUNNER_Y) {
        this.playerY = RUNNER_Y;
        this.velY = 0;
        this.isJumping = false;
      }
    }

    if (this.isSliding) {
      this.slideTimer -= delta;
      if (this.slideTimer <= 0) this.isSliding = false;
    }

    if (this.isDashing) {
      this.dashTimer -= delta;
      if (this.dashTimer <= 0) this.isDashing = false;
    }

    if (this.dashCooldown > 0) this.dashCooldown -= delta;

    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    const now = Date.now();
    if (this.hasShield && now > this.shieldEnd) this.hasShield = false;
    if (this.hasMagnet && now > this.magnetEnd) this.hasMagnet = false;
    if (this.hasBoost && now > this.boostEnd) this.hasBoost = false;

    const targetX = CX + LANE_POSITIONS[this.targetLane];
    const currentX = this.player.x;
    this.player.x += (targetX - currentX) * 0.2;
    this.player.y = this.playerY;
    this.lane = this.targetLane;

    if (this.isSliding) {
      this.player.setScale(1.3, 0.6);
    } else if (this.isDashing) {
      this.player.setScale(1.0, 1.4);
      this.player.setAlpha(0.7);
    } else {
      this.player.setScale(1.2);
      this.player.setAlpha(1);
    }

    const gt = this.time.now;
    if (gt >= this.nextObsTime) {
      this.spawnObstacle();
      this.nextObsTime = gt + Phaser.Math.Between(
        Math.max(400, OBS_MIN - this.phaseIndex * 60),
        Math.max(800, OBS_MAX - this.phaseIndex * 200)
      );
    }
    if (gt >= this.nextCoinTime) {
      this.spawnCoin();
      this.nextCoinTime = gt + COIN_INTERVAL;
    }
    if (gt >= this.nextPowerTime) {
      this.spawnPower();
      this.nextPowerTime = gt + POWER_INTERVAL - this.traitMods.luckBonus * 2000;
    }

    this.updateObjects(effSpeed, dt);
    this.drawTunnel();
    this.updateHUD();
  }

  private spawnObstacle() {
    const lane = Phaser.Math.Between(0, LANE_COUNT - 1);
    const types: ObstacleType[] = ["barrier", "low_gate", "glitch"];
    const weights = [0.5, 0.3, 0.2];
    let r = Math.random(), subtype: ObstacleType = "barrier";
    let cumul = 0;
    for (let i = 0; i < types.length; i++) {
      cumul += weights[i];
      if (r <= cumul) { subtype = types[i]; break; }
    }
    const texMap: Record<ObstacleType, string> = {
      barrier: "td_barrier",
      low_gate: "td_low_gate",
      glitch: "td_glitch",
    };
    const sprite = this.add.image(CX, VY, texMap[subtype]).setScale(0.25).setAlpha(0.8).setDepth(10);
    this.objects.push({ sprite, lane, z: 1.0, type: "obstacle", subtype });
  }

  private spawnCoin() {
    const lane = Phaser.Math.Between(0, LANE_COUNT - 1);
    const sprite = this.add.image(CX, VY, "td_coin").setScale(0.2).setAlpha(0.8).setDepth(10);
    this.objects.push({ sprite, lane, z: 1.0, type: "coin" });
  }

  private spawnPower() {
    const lane = Phaser.Math.Between(0, LANE_COUNT - 1);
    const types: PowerType[] = ["shield", "magnet", "boost"];
    const subtype = types[Phaser.Math.Between(0, 2)];
    const texMap: Record<PowerType, string> = {
      shield: "td_shield",
      magnet: "td_magnet",
      boost: "td_boost",
    };
    const sprite = this.add.image(CX, VY, texMap[subtype]).setScale(0.2).setAlpha(0.8).setDepth(10);
    this.objects.push({ sprite, lane, z: 1.0, type: "power", subtype });
  }

  private updateObjects(speed: number, dt: number) {
    const zSpeed = speed * dt * 0.8;

    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];
      obj.z -= zSpeed;

      if (obj.z <= 0 || obj.collected) {
        obj.sprite.destroy();
        this.objects.splice(i, 1);
        continue;
      }

      const t = 1 - obj.z;
      const scale = 0.25 + t * 0.85;
      const y = VY + (RUNNER_Y - VY) * t;
      const laneOffset = LANE_POSITIONS[obj.lane] * t;
      const x = CX + laneOffset;

      obj.sprite.setPosition(x, y);
      obj.sprite.setScale(scale);
      obj.sprite.setAlpha(0.8);

      if (obj.z < 0.12 && !obj.collected) {
        const playerLane = this.lane;
        const sameLane = obj.lane === playerLane;
        const closeZ = obj.z < 0.08;

        if (obj.type === "coin") {
          const magnetRange = this.hasMagnet ? 0.18 : 0.10;
          const magnetLaneRange = this.hasMagnet ? 2 : 0;
          if (obj.z < magnetRange && Math.abs(obj.lane - playerLane) <= magnetLaneRange) {
            obj.collected = true;
            const coinVal = Math.ceil(10 * this.traitMods.coinMult * (1 + this.combo * 0.1));
            this.score += coinVal;
            this.coinsCollected++;
            this.combo++;
            this.comboTimer = COMBO_DECAY;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;
            sfxCoin();
          }
        } else if (obj.type === "power" && sameLane && closeZ) {
          obj.collected = true;
          const now = Date.now();
          if (obj.subtype === "shield") {
            this.hasShield = true;
            this.shieldEnd = now + SHIELD_DUR;
            this.shieldsUsed++;
          } else if (obj.subtype === "magnet") {
            this.hasMagnet = true;
            this.magnetEnd = now + MAGNET_DUR;
            this.magnetsUsed++;
          } else if (obj.subtype === "boost") {
            this.hasBoost = true;
            this.boostEnd = now + BOOST_DUR;
            this.boostsUsed++;
          }
          sfxPowerup();
        } else if (obj.type === "obstacle" && sameLane && closeZ) {
          if (this.isDashing) {
            obj.collected = true;
            this.nearMisses++;
            this.score += 50;
          } else if (obj.subtype === "low_gate" && this.isSliding) {
            obj.collected = true;
            this.nearMisses++;
            this.score += 25;
          } else if (obj.subtype === "barrier" && this.isJumping && this.playerY < RUNNER_Y - 60) {
            obj.collected = true;
            this.nearMisses++;
            this.score += 25;
          } else {
            if (this.hasShield) {
              this.hasShield = false;
              obj.collected = true;
              this.hits++;
              sfxShieldBreak();
            } else {
              this.hits++;
              this.die();
            }
          }
        }

        if (!obj.collected && obj.type === "obstacle" && sameLane && obj.z < 0.14 && obj.z > 0.08) {
          this.nearMisses++;
          this.score += 10;
        }
      }
    }
  }

  private drawTunnel() {
    this.tunnelG.clear();
    const phaseCol = this.phaseColors[this.phaseIndex] ?? C.amber;
    const ringCount = 22;
    const wallLines = 8;
    const time = this.time.now * 0.001;

    for (let i = 0; i < ringCount; i++) {
      const rawT = i / ringCount;
      const animOffset = (time * this.speed * 0.15 + i * 0.04) % 1;
      const t = (rawT + animOffset * 0.08) % 1;
      const y = VY + (H * 1.1 - VY) * t;
      const rx = 20 + (W * 0.65) * t;
      const ry = 6 + 100 * t;
      const alpha = 0.06 + t * 0.25;
      const lw = 1 + t * 3.5;

      this.tunnelG.lineStyle(lw + 6, phaseCol, alpha * 0.15);
      this.tunnelG.strokeEllipse(CX, y, rx * 2, ry * 2);
      this.tunnelG.lineStyle(lw + 2, phaseCol, alpha * 0.4);
      this.tunnelG.strokeEllipse(CX, y, rx * 2, ry * 2);
      this.tunnelG.lineStyle(lw, phaseCol, alpha);
      this.tunnelG.strokeEllipse(CX, y, rx * 2, ry * 2);
    }

    for (let w = 0; w < wallLines; w++) {
      const angle = (w / wallLines) * TAU;
      this.tunnelG.lineStyle(1, phaseCol, 0.12);
      this.tunnelG.beginPath();
      for (let s = 0; s <= 20; s++) {
        const st = s / 20;
        const y = VY + (H * 1.1 - VY) * st;
        const rx = 20 + (W * 0.65) * st;
        const ry = 6 + 100 * st;
        const px = CX + rx * Math.cos(angle);
        const py = y + ry * Math.sin(angle) * 0.3;
        if (s === 0) this.tunnelG.moveTo(px, py);
        else this.tunnelG.lineTo(px, py);
      }
      this.tunnelG.strokePath();
    }
  }

  private updateHUD() {
    this.scoreTxt.setText(this.score.toString());
    this.distTxt.setText(`${Math.floor(this.distance)}m`);
    this.speedTxt.setText(`${this.speed.toFixed(1)}x`);

    if (this.combo > 1) {
      this.comboTxt.setText(`${this.combo}x COMBO`);
      this.comboTxt.setAlpha(1);
    } else {
      this.comboTxt.setAlpha(0);
    }

    this.shieldIcon.setText(this.hasShield ? "SHIELD" : "");
    this.magnetIcon.setText(this.hasMagnet ? "MAGNET" : "");
    this.boostIcon.setText(this.hasBoost ? "BOOST" : "");
  }

  private die() {
    this.alive = false;
    sfxDeath();

    const flashG = this.add.graphics();
    flashG.fillStyle(0xff0000, 0.3);
    flashG.fillRect(0, 0, W, H);
    this.tweens.add({
      targets: flashG,
      alpha: 0,
      duration: 400,
      onComplete: () => flashG.destroy(),
    });

    this.cameras.main.shake(200, 0.02);

    this.time.delayedCall(800, () => {
      this.showGameOver();
    });
  }

  private showGameOver() {
    const duration = Date.now() - this.startTime;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, W, H);
    overlay.setDepth(200);

    const panelG = this.add.graphics().setDepth(201);
    drawGlassPanel(panelG, 30, H * 0.15, W - 60, H * 0.6, 16);

    this.add.text(CX, H * 0.2, "GAME OVER", {
      fontFamily: FONT_DISPLAY,
      fontSize: "30px",
      color: "#F0A500",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(202);

    const stats = [
      ["Score", this.score.toString()],
      ["Distance", `${Math.floor(this.distance)}m`],
      ["Coins", this.coinsCollected.toString()],
      ["Max Combo", `${this.maxCombo}x`],
      ["Near Misses", this.nearMisses.toString()],
      ["Hits", this.hits.toString()],
      ["Duration", `${(duration / 1000).toFixed(1)}s`],
    ];

    let sy = H * 0.28;
    for (const [label, val] of stats) {
      this.add.text(60, sy, label, {
        fontFamily: FONT_UI,
        fontSize: "14px",
        color: "#aaaaaa",
      }).setDepth(202);
      this.add.text(W - 60, sy, val, {
        fontFamily: FONT_MONO,
        fontSize: "14px",
        color: "#F0A500",
      }).setOrigin(1, 0).setDepth(202);
      sy += 26;
    }

    const btnG = this.add.graphics().setDepth(201);
    drawGlassBtn(btnG, CX, H * 0.62, 180, 46, C.amber);
    this.add.text(CX, H * 0.62, "PLAY AGAIN", {
      fontFamily: FONT_DISPLAY,
      fontSize: "18px",
      color: "#F0A500",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(202);

    const retryZone = this.add.zone(CX, H * 0.62, 180, 46).setInteractive().setDepth(203);
    retryZone.on("pointerdown", () => {
      sfxMenuClick();
      this.scene.restart();
    });

    drawGlassBtn(btnG, CX, H * 0.70, 160, 40, C.cyan);
    this.add.text(CX, H * 0.70, "EXIT", {
      fontFamily: FONT_UI,
      fontSize: "15px",
      color: "#00f0ff",
    }).setOrigin(0.5).setDepth(202);

    const exitZone = this.add.zone(CX, H * 0.70, 160, 40).setInteractive().setDepth(203);
    exitZone.on("pointerdown", () => {
      sfxMenuClick();
      this.scene.start("TunnelMenu");
    });

    window.dispatchEvent(new CustomEvent("nfa-tunnel:gameover", {
      detail: {
        score: this.score,
        distance: Math.floor(this.distance),
        durationMs: duration,
        maxSpeed: this.maxSpeed,
        coinsCollected: this.coinsCollected,
        boostsUsed: this.boostsUsed,
        shieldsUsed: this.shieldsUsed,
        magnetsUsed: this.magnetsUsed,
        hits: this.hits,
        maxCombo: this.maxCombo,
        nearMisses: this.nearMisses,
      },
    }));
  }
}

export function createNfaTunnelDash(container: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.CANVAS,
    width: W,
    height: H,
    parent: container,
    backgroundColor: "#020204",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, MenuScene, GameScene],
    physics: { default: "arcade" },
    audio: { disableWebAudio: false },
    input: {
      touch: { target: container },
    },
    render: { antialias: true, pixelArt: false },
  });
}
