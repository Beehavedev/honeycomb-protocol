import Phaser from "phaser";
import {
  GAME_WIDTH, GAME_HEIGHT, LANE_POSITIONS, LANE_COUNT,
  RUNNER_Y, GROUND_Y, INITIAL_SPEED, MAX_SPEED, SPEED_RAMP,
  JUMP_VELOCITY, GRAVITY, SLIDE_DURATION,
  OBSTACLE_SPAWN_INTERVAL_MIN, OBSTACLE_SPAWN_INTERVAL_MAX,
  COIN_SPAWN_INTERVAL, POWERUP_SPAWN_INTERVAL,
  MAGNET_DURATION, SHIELD_DURATION, BOOST_DURATION, BOOST_SPEED_MULT,
  COIN_SCORE, C, LANE_WIDTH,
  STINGER_DASH_DURATION, STINGER_DASH_COOLDOWN, COMBO_DECAY_TIME,
  PHASE_THRESHOLDS, PHASE_NAMES,
  FONT_UI, FONT_DISPLAY, FONT_MONO,
} from "./constants";
import { getBestScore, setBestScore, addCoins, incrementRuns } from "./storage";
import { sfxCoin, sfxDash, sfxJump, sfxPowerup, sfxPhase, sfxSlide, sfxDeath, sfxShieldBreak, sfxCombo, sfxMenuClick } from "./audio";

const W = GAME_WIDTH, H = GAME_HEIGHT;
const CX = W / 2;
const PI = Math.PI;
const TAU = PI * 2;

function hexVerts(cx: number, cy: number, r: number, rot = -PI / 6): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (PI / 3) * i + rot;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

function strokeHex(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, col: number, alpha: number, lw = 1) {
  const p = hexVerts(cx, cy, r);
  g.lineStyle(lw, col, alpha);
  g.beginPath();
  g.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < 6; i++) g.lineTo(p[i][0], p[i][1]);
  g.closePath();
  g.strokePath();
}

function fillHex(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, col: number, alpha: number) {
  const p = hexVerts(cx, cy, r);
  g.fillStyle(col, alpha);
  g.beginPath();
  g.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < 6; i++) g.lineTo(p[i][0], p[i][1]);
  g.closePath();
  g.fillPath();
}

function lerpColor(c1: number, c2: number, t: number): number {
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return (r << 16) | (g << 8) | b;
}

function drawGlassPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, radius: number, bgAlpha = 0.6) {
  g.fillStyle(C.glass, bgAlpha);
  g.fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(1, C.glassBorder, 0.4);
  g.strokeRoundedRect(x, y, w, h, radius);
  g.fillStyle(0xffffff, 0.03);
  g.fillRoundedRect(x + 1, y + 1, w - 2, h * 0.4, { tl: radius, tr: radius, bl: 0, br: 0 });
}

function drawGlassBtn(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, col: number, alpha = 0.7) {
  const r = h / 2;
  g.fillStyle(0x000010, alpha);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
  g.lineStyle(2, col, 0.8);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
  g.fillStyle(col, 0.06);
  g.fillRoundedRect(x - w / 2 + 2, y - h / 2 + 2, w - 4, h * 0.45, { tl: r, tr: r, bl: 0, br: 0 });
}

const VX = CX;
const VY = H * 0.12;

class BootScene extends Phaser.Scene {
  constructor() { super({ key: "Boot" }); }
  create() {
    const g = this.make.graphics({ x: 0, y: 0 });
    this.genBg(g);
    this.genStars(g);
    this.genScanlines(g);
    this.genVignette(g);
    this.genNoise(g);
    this.genCyberBee(g);
    this.genCyberBeeSlide(g);
    this.genBeeShadow(g);
    this.genWings(g);
    this.genObstacles(g);
    this.genCoin(g);
    this.genPowerups(g);
    this.genGround(g);
    this.genParticles(g);
    this.genDashIcon(g);
    this.genHudIcons(g);
    this.genNewObstacles(g);
    this.genCitySkyline(g);
    this.genBossWarning(g);
    this.genGlassPanel(g);
    this.genBloomCircle(g);
    g.destroy();
    this.scene.start("Menu");
  }

  private genBg(g: Phaser.GameObjects.Graphics) {
    g.clear();
    for (let y = 0; y < H; y += 2) {
      const t = y / H;
      const col = lerpColor(0x06002a, 0x020010, t);
      g.fillStyle(col, 1);
      g.fillRect(0, y, W, 2);
    }

    for (let i = 20; i >= 0; i--) {
      const rad = 4 + i * 18;
      const a = 0.35 - i * 0.015;
      if (a <= 0) continue;
      const col = lerpColor(0xffffff, 0xff1868, Math.min(1, i / 8));
      g.fillStyle(col, a);
      g.fillCircle(VX, VY, rad);
    }
    g.fillStyle(0xff3888, 0.1);
    g.fillCircle(VX, VY, 160);
    g.fillStyle(0xff1868, 0.05);
    g.fillCircle(VX, VY, 260);
    g.fillStyle(0xb040ff, 0.025);
    g.fillCircle(VX, VY, 360);

    const S = 80;
    for (let i = 0; i < S; i++) {
      const angle = (TAU / S) * i;
      const spread = 0.01 + Math.random() * 0.025;
      const len = 200 + Math.random() * 800;
      const x1 = VX + Math.cos(angle - spread) * len;
      const y1 = VY + Math.sin(angle - spread) * len;
      const x2 = VX + Math.cos(angle + spread) * len;
      const y2 = VY + Math.sin(angle + spread) * len;
      const cols = [0x00e5ff, 0xff0080, 0xff2848, 0xb050ff, 0x00e5ff, 0xff0080, 0x5090ff, 0xff40d0];
      g.fillStyle(cols[i % cols.length], 0.04 + Math.random() * 0.08);
      g.beginPath(); g.moveTo(VX, VY); g.lineTo(x1, y1); g.lineTo(x2, y2); g.closePath(); g.fillPath();
    }

    for (let i = 0; i < 52; i++) {
      const angle = (TAU / 52) * i;
      const len = 280 + Math.random() * 700;
      const col = i % 4 === 0 ? C.magenta : i % 4 === 1 ? C.cyan : i % 4 === 2 ? C.glitchPurple : C.glitchPink;
      g.lineStyle(0.6 + Math.random() * 2, col, 0.08 + Math.random() * 0.14);
      g.lineBetween(VX, VY, VX + Math.cos(angle) * len, VY + Math.sin(angle) * len);
    }

    const rings = 20;
    for (let i = rings; i >= 0; i--) {
      const t = i / rings;
      const baseR = 10 + t * (W * 1.0);
      const cy = VY + t * (H * 0.65);
      const rr = baseR * (0.45 + t * 0.55);
      fillHex(g, VX, cy, rr, 0x020010, 0.05 + t * 0.15);
      const ea = 0.2 + t * 0.7;
      const ew = 0.6 + t * 3.5;
      strokeHex(g, VX, cy, rr, C.cyan, ea, ew);
      if (t > 0.1) strokeHex(g, VX, cy, rr + 2, C.cyanBright, ea * 0.2, ew + 5);
      if (t > 0.25) strokeHex(g, VX, cy, rr, C.magenta, ea * 0.25, ew * 0.4);
      if (t > 0.45) strokeHex(g, VX, cy, rr + 1, C.glitchPurple, ea * 0.1, ew * 0.3);
      if (t > 0.35) {
        const pts = hexVerts(VX, cy, rr);
        for (let j = 0; j < 6; j++) {
          g.fillStyle(C.cyanBright, 0.3 + t * 0.4);
          g.fillCircle(pts[j][0], pts[j][1], 1.2 + t * 4.5);
          g.fillStyle(C.magenta, 0.06 + t * 0.1);
          g.fillCircle(pts[j][0], pts[j][1], 2 + t * 7);
        }
      }
    }

    const laserY = VY + H * 0.24;
    g.lineStyle(5, C.magenta, 0.6);
    g.lineBetween(0, laserY, W, laserY);
    g.lineStyle(14, C.magentaHot, 0.15);
    g.lineBetween(0, laserY, W, laserY);
    g.lineStyle(30, C.magenta, 0.03);
    g.lineBetween(0, laserY, W, laserY);
    for (let px = 0; px < W; px += 3) {
      g.fillStyle(C.magentaBright, 0.2 + Math.random() * 0.4);
      g.fillRect(px, laserY - 1.5, 2, 3);
    }

    g.generateTexture("bg_tunnel", W, H);
    g.clear();
  }

  private genStars(g: Phaser.GameObjects.Graphics) {
    g.clear();
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      const s = 0.2 + Math.random() * 2.2;
      const b = Math.random();
      if (b > 0.92) {
        g.fillStyle(C.cyan, 0.85);
        g.fillCircle(x, y, s + 1.4);
        g.fillStyle(C.cyanWhite, 0.25);
        g.fillCircle(x, y, s + 7);
        g.fillStyle(C.cyan, 0.05);
        g.fillCircle(x, y, s + 16);
      } else if (b > 0.82) {
        g.fillStyle(C.magentaBright, 0.7);
        g.fillCircle(x, y, s + 0.5);
        g.fillStyle(C.magenta, 0.12);
        g.fillCircle(x, y, s + 5);
      } else if (b > 0.72) {
        g.fillStyle(C.glitchPurple, 0.45);
        g.fillCircle(x, y, s * 0.8);
        g.fillStyle(C.glitchPurple, 0.06);
        g.fillCircle(x, y, s + 4);
      } else if (b > 0.62) {
        g.fillStyle(C.glitchPink, 0.3 + Math.random() * 0.3);
        g.fillCircle(x, y, s * 0.6);
      } else if (b > 0.5) {
        g.fillStyle(C.amberHot, 0.15 + Math.random() * 0.15);
        g.fillCircle(x, y, s * 0.4);
      } else {
        g.fillStyle(C.white, 0.08 + Math.random() * 0.18);
        g.fillCircle(x, y, s * 0.3);
      }
    }
    g.generateTexture("stars", W, H);
    g.clear();
  }

  private genScanlines(g: Phaser.GameObjects.Graphics) {
    g.clear();
    for (let y = 0; y < H; y += 3) {
      g.fillStyle(0x000000, y % 6 === 0 ? 0.04 : 0.02);
      g.fillRect(0, y, W, 1);
    }
    g.generateTexture("scanlines", W, H);
    g.clear();
  }

  private genVignette(g: Phaser.GameObjects.Graphics) {
    g.clear();
    for (let i = 0; i < 28; i++) {
      const t = i / 28;
      g.fillStyle(0x020010, (1 - t) * (1 - t) * 0.1);
      g.fillEllipse(CX, H / 2, W * (0.3 + t * 0.7), H * (0.3 + t * 0.7));
    }
    g.fillStyle(0x020010, 0.6);
    g.fillRect(0, 0, W, 10);
    g.fillRect(0, H - 10, W, 10);
    g.fillStyle(0x020010, 0.45);
    g.fillRect(0, 0, 5, H);
    g.fillRect(W - 5, 0, 5, H);
    g.generateTexture("vignette", W, H);
    g.clear();
  }

  private genNoise(g: Phaser.GameObjects.Graphics) {
    g.clear();
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      g.fillStyle(0xffffff, Math.random() * 0.015);
      g.fillRect(x, y, 1, 1);
    }
    g.generateTexture("noise_overlay", W, H);
    g.clear();
  }

  private genCyberBee(g: Phaser.GameObjects.Graphics) {
    const bw = 80, bh = 100;
    const cx = bw / 2;
    g.clear();

    g.lineStyle(2, 0x0a2030, 1);
    g.beginPath(); g.moveTo(cx - 5, 10); g.lineTo(cx - 12, -2); g.lineTo(cx - 16, -10); g.strokePath();
    g.beginPath(); g.moveTo(cx + 5, 10); g.lineTo(cx + 12, -2); g.lineTo(cx + 16, -10); g.strokePath();
    g.lineStyle(1, 0x00e5ff, 0.7);
    g.beginPath(); g.moveTo(cx - 5, 10); g.lineTo(cx - 12, -2); g.lineTo(cx - 16, -10); g.strokePath();
    g.beginPath(); g.moveTo(cx + 5, 10); g.lineTo(cx + 12, -2); g.lineTo(cx + 16, -10); g.strokePath();
    g.fillStyle(0x00ffff, 1);
    g.fillCircle(cx - 16, -10, 2.5);
    g.fillCircle(cx + 16, -10, 2.5);
    g.fillStyle(0x00e5ff, 0.3);
    g.fillCircle(cx - 16, -10, 6);
    g.fillCircle(cx + 16, -10, 6);

    g.fillStyle(0x061820, 1);
    g.fillEllipse(cx, 18, 30, 24);
    g.fillStyle(0x0a2838, 0.5);
    g.fillEllipse(cx, 15, 18, 14);
    g.lineStyle(1, 0x00e5ff, 0.4);
    g.lineBetween(cx - 2, 8, cx - 2, 26);
    g.lineBetween(cx + 2, 8, cx + 2, 26);
    g.lineStyle(0.6, 0x00e5ff, 0.25);
    g.lineBetween(cx - 8, 12, cx - 8, 24);
    g.lineBetween(cx + 8, 12, cx + 8, 24);
    g.fillStyle(0x00e5ff, 0.08);
    g.fillRect(cx - 6, 22, 12, 3);

    g.fillStyle(0x00e5ff, 0.15);
    g.fillCircle(cx - 9, 14, 10);
    g.fillCircle(cx + 9, 14, 10);
    g.fillStyle(0x00ffff, 1);
    g.fillEllipse(cx - 9, 14, 11, 10);
    g.fillEllipse(cx + 9, 14, 11, 10);
    g.fillStyle(0x80ffff, 0.9);
    g.fillEllipse(cx - 9, 13, 8, 7);
    g.fillEllipse(cx + 9, 13, 8, 7);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(cx - 10, 11, 2);
    g.fillCircle(cx + 8, 11, 2);
    g.lineStyle(0.8, 0x00a0c0, 0.6);
    for (let r = 3; r <= 6; r += 1.5) {
      g.strokeCircle(cx - 9, 14, r);
      g.strokeCircle(cx + 9, 14, r);
    }
    g.fillStyle(0x004060, 1);
    g.fillCircle(cx - 9, 14, 2);
    g.fillCircle(cx + 9, 14, 2);

    g.lineStyle(2, 0x061820, 1);
    g.lineBetween(cx - 9, 28, cx - 12, 35);
    g.lineBetween(cx - 12, 35, cx - 17, 40);
    g.lineBetween(cx + 9, 28, cx + 12, 35);
    g.lineBetween(cx + 12, 35, cx + 17, 40);
    g.lineBetween(cx - 13, 26, cx - 18, 33);
    g.lineBetween(cx - 18, 33, cx - 24, 38);
    g.lineBetween(cx + 13, 26, cx + 18, 33);
    g.lineBetween(cx + 18, 33, cx + 24, 38);
    g.lineBetween(cx - 11, 34, cx - 14, 42);
    g.lineBetween(cx + 11, 34, cx + 14, 42);
    g.lineStyle(0.8, 0x00e5ff, 0.5);
    g.lineBetween(cx - 9, 28, cx - 12, 35);
    g.lineBetween(cx + 9, 28, cx + 12, 35);
    g.lineBetween(cx - 13, 26, cx - 18, 33);
    g.lineBetween(cx + 13, 26, cx + 18, 33);
    g.fillStyle(0x00e5ff, 0.7);
    [-17, -12, -14, 17, 12, 14].forEach((dx, i) => {
      const dy = i < 3 ? [40, 35, 42][i] : [40, 35, 42][i - 3];
      g.fillCircle(cx + dx, dy, 1.5);
    });

    g.fillStyle(0x081c28, 1);
    g.fillEllipse(cx, 34, 28, 18);
    g.fillStyle(0x0a2838, 0.5);
    g.fillEllipse(cx, 32, 16, 10);
    g.lineStyle(0.7, 0x00e5ff, 0.35);
    g.lineBetween(cx - 10, 30, cx + 10, 30);
    g.lineBetween(cx - 8, 34, cx + 8, 34);
    g.lineBetween(cx - 6, 38, cx + 6, 38);
    g.lineStyle(0.5, 0x00e5ff, 0.2);
    g.lineBetween(cx, 26, cx, 42);
    g.fillStyle(0x00e5ff, 0.15);
    g.fillRect(cx - 3, 28, 6, 4);

    g.fillStyle(0x061820, 1);
    g.fillEllipse(cx, 64, 36, 42);
    g.fillStyle(0x0a2030, 0.5);
    g.fillEllipse(cx - 4, 56, 16, 20);

    const stripes = [47, 53, 59, 65, 71, 77];
    for (let i = 0; i < stripes.length; i++) {
      const sw = 15 - Math.abs(i - 2.5) * 2.2;
      g.fillStyle(0xff9800, 1);
      g.fillEllipse(cx, stripes[i], sw * 2, 4.5);
      g.fillStyle(0xffb840, 0.8);
      g.fillEllipse(cx - 1, stripes[i] - 0.5, sw * 1.4, 2.5);
      g.fillStyle(0xff8000, 0.4);
      g.fillEllipse(cx + 2, stripes[i] + 1, sw * 0.9, 1.5);
      g.fillStyle(0xffd080, 0.15);
      g.fillEllipse(cx, stripes[i], sw * 2.5, 7);
    }

    g.lineStyle(0.7, 0x00e5ff, 0.3);
    for (let i = 0; i < 5; i++) {
      const ly = 46 + i * 8;
      g.lineBetween(cx - 16, ly, cx - 8, ly + 3);
      g.lineBetween(cx + 16, ly, cx + 8, ly + 3);
    }
    g.lineStyle(0.5, 0x00e5ff, 0.2);
    g.lineBetween(cx, 45, cx, 80);
    g.fillStyle(0x00e5ff, 0.12);
    g.fillCircle(cx, 58, 4);
    g.fillStyle(0x00ffff, 0.06);
    g.fillCircle(cx, 58, 10);

    g.lineStyle(1.5, 0x00a0c0, 0.5);
    g.strokeEllipse(cx, 64, 36, 42);
    g.lineStyle(3, 0x00e5ff, 0.08);
    g.strokeEllipse(cx, 64, 40, 46);

    g.fillStyle(0x061820, 1);
    g.beginPath(); g.moveTo(cx, 88); g.lineTo(cx - 5, 82); g.lineTo(cx + 5, 82); g.closePath(); g.fillPath();
    g.fillStyle(0x8090a0, 1);
    g.beginPath(); g.moveTo(cx, 96); g.lineTo(cx - 2, 88); g.lineTo(cx + 2, 88); g.closePath(); g.fillPath();
    g.fillStyle(0xc0d0e0, 0.8);
    g.fillRect(cx - 0.5, 88, 1, 8);
    g.fillStyle(0x00e5ff, 0.6);
    g.fillCircle(cx, 96, 2);
    g.fillStyle(0x00e5ff, 0.15);
    g.fillCircle(cx, 96, 6);

    g.generateTexture("runner", bw, bh);
    g.clear();
  }

  private genCyberBeeSlide(g: Phaser.GameObjects.Graphics) {
    const sw = 74, sh = 32;
    g.clear();
    g.fillStyle(0x061820, 1);
    g.fillEllipse(14, sh / 2, 20, 16);
    g.lineStyle(0.6, 0x00e5ff, 0.3);
    g.lineBetween(6, sh / 2, 22, sh / 2);
    g.fillStyle(0x00ffff, 1);
    g.fillCircle(10, sh / 2 - 3, 4);
    g.fillCircle(18, sh / 2 - 3, 4);
    g.fillStyle(0x80ffff, 0.8);
    g.fillCircle(10, sh / 2 - 3.5, 2.5);
    g.fillCircle(18, sh / 2 - 3.5, 2.5);
    g.lineStyle(0.6, 0x00a0c0, 0.5);
    g.strokeCircle(10, sh / 2 - 3, 4);
    g.strokeCircle(18, sh / 2 - 3, 4);
    g.fillStyle(0x081c28, 1);
    g.fillEllipse(30, sh / 2, 16, 14);
    g.fillStyle(0x061820, 1);
    g.fillEllipse(sw / 2 + 6, sh / 2, 36, 22);
    const sx = [32, 39, 46, 53];
    for (const x of sx) {
      g.fillStyle(0xff9800, 1);
      g.fillRect(x, sh / 2 - 9, 4, 18);
      g.fillStyle(0xffb840, 0.6);
      g.fillRect(x, sh / 2 - 7, 3, 12);
    }
    g.lineStyle(0.5, 0x00e5ff, 0.25);
    g.lineBetween(28, sh / 2, 60, sh / 2);
    g.lineBetween(sw / 2 + 6, sh / 2 - 10, sw / 2 + 6, sh / 2 + 10);
    g.lineStyle(1, 0x00a0c0, 0.4);
    g.strokeEllipse(sw / 2 + 6, sh / 2, 36, 22);
    g.generateTexture("runner_slide", sw, sh);
    g.clear();
  }

  private genBeeShadow(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(C.black, 0.12);
    g.fillEllipse(30, 8, 56, 16);
    g.fillStyle(C.cyan, 0.02);
    g.fillEllipse(30, 8, 64, 20);
    g.generateTexture("bee_shadow", 60, 16);
    g.clear();
  }

  private genWings(g: Phaser.GameObjects.Graphics) {
    const ww = 50, wh = 60;

    const drawWing = (flipX: boolean) => {
      g.clear();
      const ox = flipX ? -1 : 1;
      g.fillStyle(0x00e5ff, 0.12);
      g.fillEllipse(ww / 2, wh / 2, ww - 2, wh - 2);
      g.fillStyle(0xff0090, 0.08);
      g.fillEllipse(ww / 2 + ox * 3, wh / 2 + 8, ww * 0.6, wh * 0.4);
      g.fillStyle(0x80f0ff, 0.06);
      g.fillEllipse(ww / 2 - ox * 5, wh / 2 - 10, ww * 0.45, wh * 0.3);
      g.lineStyle(0.8, 0x00e5ff, 0.5);
      g.lineBetween(4, 6, ww / 2, wh - 6);
      g.lineBetween(3, wh / 2, ww - 3, wh / 2 - 4);
      g.lineBetween(ww / 2 - ox * 4, 5, ww / 2 + ox * 3, wh - 8);
      g.lineStyle(0.5, 0x00e5ff, 0.35);
      g.lineBetween(7, wh * 0.3, ww - 7, wh * 0.35);
      g.lineBetween(ww / 2, 3, ww / 2 + ox * 14, wh * 0.6);
      g.lineBetween(5, wh * 0.5, ww - 5, wh * 0.48);
      g.lineBetween(8, wh * 0.7, ww - 8, wh * 0.65);
      g.lineStyle(0.4, 0x00e5ff, 0.2);
      g.lineBetween(ww * 0.2, wh * 0.15, ww * 0.35, wh * 0.55);
      g.lineBetween(ww * 0.65, wh * 0.1, ww * 0.75, wh * 0.5);
      g.lineBetween(ww * 0.3, wh * 0.42, ww * 0.78, wh * 0.55);
      g.lineStyle(0.6, 0xff0090, 0.2);
      g.lineBetween(6, wh / 2 + 10, ww - 6, wh / 2 + 6);
      g.lineBetween(ww * 0.15, wh * 0.72, ww * 0.85, wh * 0.65);
      g.fillStyle(0x00e5ff, 0.1);
      for (let i = 0; i < 6; i++) {
        const px = ww * 0.15 + Math.random() * ww * 0.7;
        const py = wh * 0.1 + Math.random() * wh * 0.8;
        g.fillCircle(px, py, 1 + Math.random() * 2);
      }
      g.lineStyle(2, 0x00e5ff, 0.45);
      g.strokeEllipse(ww / 2, wh / 2, ww - 2, wh - 2);
      g.lineStyle(5, 0xff0090, 0.08);
      g.strokeEllipse(ww / 2, wh / 2, ww + 4, wh + 4);
      g.lineStyle(10, 0x00e5ff, 0.03);
      g.strokeEllipse(ww / 2, wh / 2, ww + 10, wh + 10);
    };

    drawWing(false);
    g.generateTexture("wing_l", ww, wh);
    g.clear();
    drawWing(true);
    g.generateTexture("wing_r", ww, wh);
    g.clear();
  }

  private genObstacles(g: Phaser.GameObjects.Graphics) {
    const bw = 90, bh = 58;
    g.clear();

    g.fillStyle(C.laserRedGlow, 0.1);
    g.fillRoundedRect(-6, -6, bw + 12, bh + 12, 10);
    g.fillStyle(0x180008, 0.92);
    g.fillRoundedRect(0, 0, bw, bh, 6);

    for (let ly = 4; ly < bh; ly += 5) {
      g.lineStyle(2.5, C.laserRed, 0.7);
      g.lineBetween(6, ly, bw - 6, ly);
      g.lineStyle(7, C.laserRedGlow, 0.1);
      g.lineBetween(6, ly, bw - 6, ly);
    }
    for (let lx = 12; lx < bw; lx += 10) {
      g.lineStyle(1.2, C.laserRed, 0.35);
      g.lineBetween(lx, 3, lx, bh - 3);
    }

    g.lineStyle(3, C.laserRed, 0.9);
    g.strokeRoundedRect(1, 1, bw - 2, bh - 2, 6);
    g.lineStyle(8, C.laserRedGlow, 0.15);
    g.strokeRoundedRect(0, 0, bw, bh, 7);
    g.lineStyle(18, C.laserRedGlow, 0.04);
    g.strokeRoundedRect(-2, -2, bw + 4, bh + 4, 8);

    const corners = [[7, 7], [bw - 7, 7], [7, bh - 7], [bw - 7, bh - 7]];
    for (const [ccx, ccy] of corners) {
      g.fillStyle(C.laserRedWhite, 1);
      g.fillCircle(ccx, ccy, 3.5);
      g.fillStyle(C.laserRedBright, 0.3);
      g.fillCircle(ccx, ccy, 9);
    }
    g.generateTexture("barrier", bw, bh);
    g.clear();

    g.fillStyle(C.laserRedGlow, 0.08);
    g.fillRoundedRect(-4, -4, bw + 8, 26, 6);
    g.fillStyle(0x180008, 0.92);
    g.fillRoundedRect(0, 0, bw, 18, 4);
    g.lineStyle(3.5, C.laserRed, 0.9);
    g.lineBetween(0, 9, bw, 9);
    g.lineStyle(10, C.laserRedGlow, 0.12);
    g.lineBetween(0, 9, bw, 9);
    g.lineStyle(2, C.laserRed, 0.4);
    g.lineBetween(0, 3, bw, 3);
    g.lineBetween(0, 15, bw, 15);
    for (const ccx of [5, bw - 5]) {
      g.fillStyle(C.laserRedWhite, 1);
      g.fillCircle(ccx, 9, 4.5);
      g.fillStyle(C.laserRedGlow, 0.2);
      g.fillCircle(ccx, 9, 10);
    }
    g.generateTexture("low_gate", bw, 18);
    g.clear();

    const gw = 90, gh = 58;
    g.fillStyle(C.glitchPurple, 0.06);
    g.fillRoundedRect(-4, -4, gw + 8, gh + 8, 8);
    g.fillStyle(0x0a0018, 0.92);
    g.fillRoundedRect(0, 0, gw, gh, 6);
    for (let i = 0; i < 14; i++) {
      const ox = Phaser.Math.Between(4, gw - 14);
      const oy = Phaser.Math.Between(4, gh - 10);
      const ow = Phaser.Math.Between(6, 24);
      const oh = Phaser.Math.Between(3, 10);
      g.fillStyle(C.glitchPurple, 0.35 + Math.random() * 0.45);
      g.fillRect(ox, oy, ow, oh);
    }
    for (let i = 0; i < 7; i++) {
      const gy = Phaser.Math.Between(2, gh - 2);
      g.lineStyle(1.2 + Math.random() * 2.5, C.glitchBlue, 0.4 + Math.random() * 0.35);
      g.lineBetween(0, gy, gw, gy);
    }
    g.lineStyle(2.5, C.glitchPurple, 0.85);
    g.strokeRoundedRect(1, 1, gw - 2, gh - 2, 6);
    g.lineStyle(7, C.glitchPurple, 0.1);
    g.strokeRoundedRect(0, 0, gw, gh, 7);
    g.generateTexture("glitch_wall", gw, gh);
    g.clear();

    g.fillStyle(C.laserRedGlow, 0.06);
    g.fillRoundedRect(-3, -3, 36, 100, 8);
    g.fillStyle(0x180008, 0.92);
    g.fillRoundedRect(0, 0, 30, 94, 6);
    g.lineStyle(2.5, C.laserRed, 0.9);
    g.strokeRoundedRect(1, 1, 28, 92, 6);
    g.lineStyle(1.2, C.laserRed, 0.4);
    g.lineBetween(15, 3, 15, 91);
    for (const cy of [10, 84]) {
      g.fillStyle(C.laserRedWhite, 1);
      g.fillCircle(15, cy, 4.5);
      g.fillStyle(C.laserRedGlow, 0.15);
      g.fillCircle(15, cy, 10);
    }
    g.generateTexture("lane_blocker", 30, 94);
    g.clear();
  }

  private genCoin(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const s = 15, pad = 7, cs = s + pad;
    g.fillStyle(C.coinGlow, 0.08);
    g.fillCircle(cs, cs, s + 12);
    g.fillStyle(C.amber, 0.03);
    g.fillCircle(cs, cs, s + 18);
    fillHex(g, cs, cs, s, C.coinBody, 1);
    fillHex(g, cs, cs, s - 1.5, C.coinLight, 0.3);
    fillHex(g, cs, cs, s - 3, C.coinBody, 0.25);
    g.fillStyle(C.coinShine, 0.18);
    g.fillEllipse(cs - 3, cs - 4, 7, 11);
    strokeHex(g, cs, cs, s, C.coinShine, 0.7, 2);
    strokeHex(g, cs, cs, s + 2, C.coinGlow, 0.15, 3.5);
    strokeHex(g, cs, cs, s + 4, C.amber, 0.05, 5);
    fillHex(g, cs, cs, 5, C.coinGlow, 0.5);
    strokeHex(g, cs, cs, 5, C.coinShine, 0.4, 1);
    g.generateTexture("coin", cs * 2, cs * 2);
    g.clear();
  }

  private genPowerups(g: Phaser.GameObjects.Graphics) {
    const s = 20;
    g.clear();

    const drawBase = (col: number, colB: number) => {
      g.fillStyle(col, 0.06);
      g.fillCircle(s, s, s + 8);
      g.fillStyle(0x050010, 0.9);
      g.fillRoundedRect(0, 0, s * 2, s * 2, 10);
      g.lineStyle(2.5, col, 0.85);
      g.strokeRoundedRect(0, 0, s * 2, s * 2, 10);
      g.lineStyle(5, colB, 0.1);
      g.strokeRoundedRect(-1, -1, s * 2 + 2, s * 2 + 2, 11);
      g.lineStyle(10, col, 0.03);
      g.strokeRoundedRect(-2, -2, s * 2 + 4, s * 2 + 4, 12);
      g.fillStyle(0xffffff, 0.03);
      g.fillRoundedRect(2, 2, s * 2 - 4, s * 0.8, { tl: 8, tr: 8, bl: 0, br: 0 });
    };

    drawBase(C.magnetBlue, C.magnetBright);
    g.lineStyle(3.5, C.magnetBlue, 0.9);
    g.beginPath(); g.arc(s, s - 2, 7, PI, 0, false); g.strokePath();
    g.fillStyle(C.magnetBlue, 1);
    g.fillRect(s - 7, s - 2, 4, 13);
    g.fillRect(s + 3, s - 2, 4, 13);
    g.fillStyle(C.laserRed, 1);
    g.fillRect(s - 7, s + 7, 4, 4);
    g.fillStyle(C.cyan, 1);
    g.fillRect(s + 3, s + 7, 4, 4);
    g.fillStyle(C.magnetBright, 0.12);
    g.fillCircle(s, s, 6);
    g.generateTexture("magnet", s * 2, s * 2);
    g.clear();

    drawBase(C.shieldGreen, C.shieldBright);
    g.lineStyle(3.5, C.shieldGreen, 0.9);
    g.beginPath();
    g.moveTo(s, 4); g.lineTo(s + 10, 9); g.lineTo(s + 10, 22);
    g.lineTo(s, 30); g.lineTo(s - 10, 22); g.lineTo(s - 10, 9);
    g.closePath(); g.strokePath();
    g.fillStyle(C.shieldGreen, 0.15);
    g.beginPath();
    g.moveTo(s, 4); g.lineTo(s + 10, 9); g.lineTo(s + 10, 22);
    g.lineTo(s, 30); g.lineTo(s - 10, 22); g.lineTo(s - 10, 9);
    g.closePath(); g.fillPath();
    g.fillStyle(C.shieldBright, 0.06);
    g.fillCircle(s, 17, 8);
    g.generateTexture("shield_pu", s * 2, s * 2);
    g.clear();

    drawBase(C.boostOrange, C.boostBright);
    g.fillStyle(C.boostOrange, 1);
    g.fillTriangle(s - 5, s + 8, s + 1, s - 10, s + 3, s + 2);
    g.fillStyle(C.boostBright, 1);
    g.fillTriangle(s - 3, s + 2, s + 5, s + 2, s + 1, s + 10);
    g.fillStyle(C.boostBright, 0.12);
    g.fillCircle(s, s, 6);
    g.generateTexture("boost_pu", s * 2, s * 2);
    g.clear();
  }

  private genGround(g: Phaser.GameObjects.Graphics) {
    const tW = LANE_WIDTH * 3 + 24;
    const tH = 36;
    g.clear();

    for (let y = 0; y < tH; y++) {
      const t = y / tH;
      g.fillStyle(lerpColor(0x030012, 0x020008, t), 0.9 + t * 0.1);
      g.fillRect(0, y, tW, 1);
    }

    for (let i = 0; i < tW; i += 3) {
      const tick = i % 14 === 0;
      g.fillStyle(C.cyan, tick ? 0.06 : 0.02);
      g.fillRect(i, 0, 1, tH);
      if (tick) {
        g.fillStyle(C.magenta, 0.015);
        g.fillRect(i, 0, 1, tH);
      }
    }

    g.lineStyle(3, C.cyan, 0.85);
    g.lineBetween(0, 0, tW, 0);
    g.lineStyle(10, C.cyanBright, 0.12);
    g.lineBetween(0, 0, tW, 0);
    g.lineStyle(22, C.cyan, 0.03);
    g.lineBetween(0, 0, tW, 0);
    g.lineStyle(2, C.magenta, 0.2);
    g.lineBetween(0, tH - 1, tW, tH - 1);
    g.lineStyle(6, C.magenta, 0.03);
    g.lineBetween(0, tH - 1, tW, tH - 1);

    for (let i = 1; i < 3; i++) {
      const lx = i * LANE_WIDTH + 12;
      g.lineStyle(1, C.cyan, 0.2);
      g.lineBetween(lx, 0, lx, tH);
      g.lineStyle(3, C.cyan, 0.025);
      g.lineBetween(lx, 0, lx, tH);
    }
    g.generateTexture("ground_tile", tW, tH);
    g.clear();
  }

  private genParticles(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(C.amberHot, 0.95);
    g.fillCircle(6, 6, 5);
    g.fillStyle(C.amberWhite, 0.5);
    g.fillCircle(5, 4, 2.5);
    g.fillStyle(C.amber, 0.12);
    g.fillCircle(6, 6, 8);
    g.generateTexture("particle_amber", 12, 12);
    g.clear();

    g.fillStyle(C.cyan, 0.9);
    g.fillCircle(5, 5, 4);
    g.fillStyle(C.cyanBright, 0.5);
    g.fillCircle(4, 4, 2);
    g.fillStyle(C.cyan, 0.08);
    g.fillCircle(5, 5, 7);
    g.generateTexture("particle_cyan", 10, 10);
    g.clear();

    g.fillStyle(C.cyanBright, 0.5);
    g.fillRect(0, 0, 2, 24);
    g.fillStyle(C.cyan, 0.3);
    g.fillRect(0, 0, 2, 24);
    g.fillStyle(C.magenta, 0.06);
    g.fillRect(0, 20, 2, 4);
    g.generateTexture("speed_line", 2, 24);
    g.clear();

    g.fillStyle(C.amberHot, 0.85);
    g.fillRect(0, 0, 3, 3);
    g.fillStyle(C.amberWhite, 0.3);
    g.fillRect(0, 0, 2, 2);
    g.generateTexture("spark", 3, 3);
    g.clear();

    fillHex(g, 6, 6, 5, C.coinBody, 0.7);
    strokeHex(g, 6, 6, 5, C.coinShine, 0.5, 1);
    fillHex(g, 6, 6, 2, C.coinGlow, 0.3);
    g.fillStyle(C.coinGlow, 0.06);
    g.fillCircle(6, 6, 9);
    g.generateTexture("hex_dust", 12, 12);
    g.clear();

    g.fillStyle(C.magenta, 0.85);
    g.fillCircle(4, 4, 3);
    g.fillStyle(C.magentaBright, 0.4);
    g.fillCircle(3, 3, 1.5);
    g.fillStyle(C.magenta, 0.08);
    g.fillCircle(4, 4, 6);
    g.generateTexture("particle_magenta", 8, 8);
    g.clear();

    g.fillStyle(C.white, 0.6);
    g.fillRect(0, 0, 2, 2);
    g.generateTexture("particle_white", 2, 2);
    g.clear();
  }

  private genDashIcon(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const s = 32;

    g.lineStyle(2, C.cyan, 0.12);
    g.strokeCircle(s, s, s - 2);
    g.lineStyle(2.5, C.cyan, 0.4);
    g.beginPath(); g.arc(s, s, s - 2, -PI / 2, PI, false); g.strokePath();
    g.fillStyle(C.cyanBright, 0.06);
    g.fillCircle(s, s, s - 6);
    g.generateTexture("dash_icon_bg", s * 2, s * 2);
    g.clear();

    g.lineStyle(3, C.cyan, 0.85);
    g.strokeCircle(s, s, s - 2);
    g.lineStyle(6, C.cyanBright, 0.1);
    g.strokeCircle(s, s, s);
    g.fillStyle(C.cyanBright, 0.15);
    g.fillCircle(s, s, s - 6);
    g.fillStyle(C.cyan, 0.5);
    g.fillTriangle(s - 5, s - 9, s + 9, s, s - 5, s + 9);
    g.fillStyle(C.white, 0.15);
    g.fillTriangle(s - 3, s - 6, s + 6, s, s - 3, s + 6);
    g.generateTexture("dash_icon_ready", s * 2, s * 2);
    g.clear();
  }

  private genHudIcons(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(C.coinBody, 1);
    g.fillCircle(12, 14, 10);
    g.fillStyle(C.amberHot, 0.85);
    g.fillTriangle(12, 4, 8, 14, 16, 14);
    g.fillCircle(12, 14, 6);
    g.fillStyle(C.coinShine, 0.3);
    g.fillCircle(10, 10, 3);
    g.fillStyle(C.coinGlow, 0.08);
    g.fillCircle(12, 14, 16);
    g.generateTexture("honey_drop", 24, 28);
    g.clear();

    g.lineStyle(2.5, C.cyan, 0.5);
    g.strokeCircle(10, 10, 8);
    g.lineStyle(2, C.cyan, 0.6);
    for (let i = 0; i < 6; i++) {
      const a = (PI / 3) * i;
      g.lineBetween(10 + Math.cos(a) * 4, 10 + Math.sin(a) * 4, 10 + Math.cos(a) * 8, 10 + Math.sin(a) * 8);
    }
    g.fillStyle(C.cyan, 0.35);
    g.fillCircle(10, 10, 3);
    g.generateTexture("gear_icon", 20, 20);
    g.clear();

    g.fillStyle(C.white, 0.3);
    const ds = 10;
    g.beginPath();
    g.moveTo(ds, 0); g.lineTo(ds * 2, ds);
    g.lineTo(ds, ds * 2); g.lineTo(0, ds);
    g.closePath(); g.fillPath();
    g.lineStyle(2, C.white, 0.5);
    g.beginPath();
    g.moveTo(ds, 0); g.lineTo(ds * 2, ds);
    g.lineTo(ds, ds * 2); g.lineTo(0, ds);
    g.closePath(); g.strokePath();
    g.generateTexture("diamond_icon", ds * 2, ds * 2);
    g.clear();
  }

  private genNewObstacles(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const lw = 100, lh = 14;
    g.fillStyle(C.laserRedGlow, 0.12);
    g.fillRoundedRect(-4, -4, lw + 8, lh + 8, 5);
    for (let i = 0; i < 3; i++) {
      g.lineStyle(3.5 - i, C.laserRed, 1 - i * 0.25);
      g.lineBetween(0, lh / 2, lw, lh / 2);
    }
    g.lineStyle(14, C.laserRedGlow, 0.06);
    g.lineBetween(0, lh / 2, lw, lh / 2);
    g.fillStyle(C.laserRedWhite, 1);
    g.fillCircle(5, lh / 2, 4.5);
    g.fillCircle(lw - 5, lh / 2, 4.5);
    g.fillStyle(C.laserRedGlow, 0.25);
    g.fillCircle(5, lh / 2, 9);
    g.fillCircle(lw - 5, lh / 2, 9);
    g.generateTexture("spinning_laser", lw, lh);
    g.clear();

    const ww = 220, wh = 22;
    g.fillStyle(C.magenta, 0.04);
    g.fillRect(0, 0, ww, wh);
    for (let x = 0; x < ww; x += 2) {
      const yOff = Math.sin(x * 0.07) * 7;
      g.fillStyle(C.magentaHot, 0.85);
      g.fillRect(x, wh / 2 + yOff - 2, 2, 4);
      g.fillStyle(C.magenta, 0.25);
      g.fillRect(x, wh / 2 + yOff - 5, 2, 10);
    }
    g.generateTexture("wave_beam", ww, wh);
    g.clear();

    const dw = 60, dh = 60;
    g.fillStyle(C.laserRedGlow, 0.05);
    g.fillCircle(dw / 2, dh / 2, dw / 2 + 5);
    for (let r = dw / 2; r > 4; r -= 5) {
      g.lineStyle(1.8, C.laserRed, 0.25 + (1 - r / (dw / 2)) * 0.45);
      g.strokeCircle(dw / 2, dh / 2, r);
    }
    g.fillStyle(C.laserRedWhite, 0.85);
    g.fillCircle(dw / 2, dh / 2, 7);
    g.fillStyle(C.laserRedGlow, 0.15);
    g.fillCircle(dw / 2, dh / 2, 15);
    g.lineStyle(2.5, C.laserRed, 0.75);
    g.strokeCircle(dw / 2, dh / 2, dw / 2 - 2);
    g.lineStyle(7, C.laserRedGlow, 0.08);
    g.strokeCircle(dw / 2, dh / 2, dw / 2);
    g.generateTexture("pulse_mine", dw, dh);
    g.clear();
  }

  private genCitySkyline(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const sw = W, sh = 150;
    const buildings = [
      { x: 10, w: 30, h: 100 }, { x: 44, w: 22, h: 60 }, { x: 72, w: 38, h: 115 },
      { x: 116, w: 24, h: 70 }, { x: 146, w: 44, h: 125 }, { x: 196, w: 20, h: 55 },
      { x: 220, w: 34, h: 88 }, { x: 260, w: 28, h: 100 }, { x: 294, w: 48, h: 130 },
      { x: 348, w: 24, h: 65 }, { x: 378, w: 36, h: 80 }, { x: 420, w: 20, h: 48 },
      { x: 446, w: 32, h: 95 },
    ];
    for (const b of buildings) {
      const by = sh - b.h;
      g.fillStyle(0x020818, 0.92);
      g.fillRect(b.x, by, b.w, b.h);
      g.lineStyle(0.8, C.cyan, 0.06);
      g.strokeRect(b.x, by, b.w, b.h);
      for (let wy = by + 6; wy < sh - 4; wy += 8) {
        for (let wx = b.x + 3; wx < b.x + b.w - 4; wx += 6) {
          const lit = Math.random() > 0.5;
          g.fillStyle(lit ? C.cyan : C.magenta, lit ? 0.12 + Math.random() * 0.12 : 0.03);
          g.fillRect(wx, wy, 3, 4);
        }
      }
      if (b.h > 70) {
        g.fillStyle(C.laserRed, 0.35);
        g.fillCircle(b.x + b.w / 2, by + 2, 2);
        g.fillStyle(C.laserRedGlow, 0.08);
        g.fillCircle(b.x + b.w / 2, by + 2, 6);
      }
    }
    g.lineStyle(0.8, C.cyan, 0.04);
    g.lineBetween(0, sh - 1, sw, sh - 1);
    g.generateTexture("city_skyline", sw, sh);
    g.clear();
  }

  private genBossWarning(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const bw = W, bh = 70;
    g.fillStyle(C.laserRed, 0.12);
    g.fillRect(0, 0, bw, bh);
    for (let x = 0; x < bw; x += 44) {
      g.fillStyle(C.laserRed, 0.2);
      g.fillTriangle(x, 0, x + 22, bh / 2, x, bh);
      g.fillTriangle(x + 44, 0, x + 22, bh / 2, x + 44, bh);
    }
    g.lineStyle(3, C.laserRed, 0.5);
    g.lineBetween(0, 2, bw, 2);
    g.lineBetween(0, bh - 2, bw, bh - 2);
    g.generateTexture("boss_warning_bg", bw, bh);
    g.clear();
  }

  private genGlassPanel(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const pw = 340, ph = 420;
    drawGlassPanel(g, 0, 0, pw, ph, 16, 0.7);
    g.generateTexture("glass_panel", pw, ph);
    g.clear();

    const bw = 220, bh = 52;
    g.fillStyle(0x000010, 0.7);
    g.fillRoundedRect(0, 0, bw, bh, bh / 2);
    g.lineStyle(2, C.cyan, 0.7);
    g.strokeRoundedRect(0, 0, bw, bh, bh / 2);
    g.fillStyle(C.cyan, 0.04);
    g.fillRoundedRect(2, 2, bw - 4, bh * 0.4, { tl: bh / 2, tr: bh / 2, bl: 0, br: 0 });
    g.generateTexture("btn_play", bw, bh);
    g.clear();

    const mw = 180, mh = 44;
    g.fillStyle(0x080014, 0.7);
    g.fillRoundedRect(0, 0, mw, mh, mh / 2);
    g.lineStyle(1.5, C.magenta, 0.5);
    g.strokeRoundedRect(0, 0, mw, mh, mh / 2);
    g.fillStyle(C.magenta, 0.03);
    g.fillRoundedRect(2, 2, mw - 4, mh * 0.4, { tl: mh / 2, tr: mh / 2, bl: 0, br: 0 });
    g.generateTexture("btn_menu", mw, mh);
    g.clear();
  }

  private genBloomCircle(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const s = 64;
    for (let i = s; i > 0; i--) {
      const t = i / s;
      g.fillStyle(0xffffff, t * t * 0.08);
      g.fillCircle(s, s, i);
    }
    g.generateTexture("bloom_circle", s * 2, s * 2);
    g.clear();
  }
}

class MenuScene extends Phaser.Scene {
  constructor() { super({ key: "Menu" }); }
  create() {
    this.add.tileSprite(0, 0, W, H, "bg_tunnel").setOrigin(0, 0);
    const stars = this.add.image(CX, H / 2, "stars").setAlpha(0.5);
    this.tweens.add({ targets: stars, alpha: 0.25, duration: 4000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    this.add.image(CX, H / 2, "noise_overlay").setAlpha(0.3);

    this.add.rectangle(CX, H / 2, W, H, 0x020010, 0.12);

    const frameGfx = this.add.graphics();
    const frameRadii = [70, 100, 140, 185, 235, 290];
    for (let i = 0; i < frameRadii.length; i++) {
      const a = [0.35, 0.24, 0.15, 0.08, 0.04, 0.02][i];
      const lw = [3.5, 2.5, 2, 1.5, 1, 0.8][i];
      strokeHex(frameGfx, CX, H * 0.3, frameRadii[i], C.cyan, a, lw);
      if (i < 4) strokeHex(frameGfx, CX, H * 0.3, frameRadii[i] + 3, C.cyanBright, a * 0.15, lw + 5);
      if (i < 3) strokeHex(frameGfx, CX, H * 0.3, frameRadii[i], C.magenta, a * 0.2, lw * 0.5);
    }

    const tGlow = this.add.text(CX, 52, "HONEY", {
      fontSize: "64px", fontFamily: FONT_DISPLAY, color: "#00e5ff", fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0.04);
    this.tweens.add({ targets: tGlow, alpha: 0.12, scaleX: 1.03, duration: 2800, yoyo: true, repeat: -1 });

    const tGlow2 = this.add.text(CX, 52, "HONEY", {
      fontSize: "63px", fontFamily: FONT_DISPLAY, color: "#ff0080", fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0.02);
    this.tweens.add({ targets: tGlow2, alpha: 0.06, scaleX: 1.05, duration: 3500, yoyo: true, repeat: -1 });

    this.add.text(CX, 52, "HONEY", {
      fontSize: "60px", fontFamily: FONT_DISPLAY, color: "#00e5ff",
      fontStyle: "bold", stroke: "#000818", strokeThickness: 10,
    }).setOrigin(0.5);

    this.add.text(CX, 118, "RUNNER", {
      fontSize: "44px", fontFamily: FONT_DISPLAY, color: "#ff0080",
      fontStyle: "bold", stroke: "#180010", strokeThickness: 8,
    }).setOrigin(0.5);

    const sub = this.add.text(CX, 158, "C Y B E R   H I V E", {
      fontSize: "12px", fontFamily: FONT_UI, color: "#60f8ff",
      letterSpacing: 4,
    }).setOrigin(0.5);
    this.tweens.add({ targets: sub, alpha: 0.15, duration: 2500, yoyo: true, repeat: -1 });

    for (let i = 0; i < 3; i++) {
      const pulse = this.add.circle(CX, H * 0.3, 32 + i * 20, C.cyan, 0.012 - i * 0.003);
      this.tweens.add({ targets: pulse, scaleX: 1.6 + i * 0.25, scaleY: 1.6 + i * 0.25, alpha: 0, duration: 2400 + i * 300, repeat: -1, delay: i * 300 });
    }

    const shadow = this.add.image(CX, H * 0.3 + 62, "bee_shadow").setScale(4.5).setAlpha(0.2);
    const body = this.add.image(CX, H * 0.3, "runner").setScale(3.6);
    const wL = this.add.image(CX - 34, H * 0.3 - 26, "wing_l").setScale(3.4).setAlpha(0.5).setDepth(9);
    const wR = this.add.image(CX + 34, H * 0.3 - 26, "wing_r").setScale(3.4).setAlpha(0.5).setDepth(11);
    body.setDepth(10);

    this.tweens.add({ targets: body, y: body.y - 12, duration: 2000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: shadow, scaleX: 4, alpha: 0.08, duration: 2000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: wL, scaleY: 0.7, alpha: 0.12, duration: 38, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: wR, scaleY: 0.7, alpha: 0.12, duration: 38, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: [wL, wR], y: wL.y - 12, duration: 2000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    this.add.particles(0, 0, "hex_dust", {
      speed: { min: 10, max: 40 }, scale: { start: 0.8, end: 0 },
      alpha: { start: 0.5, end: 0 }, lifespan: 900, frequency: 80,
      follow: body, followOffset: { x: 0, y: 40 },
      blendMode: "ADD", tint: [C.amberHot, C.coinBody, C.amberWhite],
    }).setDepth(8);

    this.add.particles(0, 0, "particle_white", {
      speed: { min: 5, max: 25 }, scale: { start: 1, end: 0 },
      alpha: { start: 0.6, end: 0 }, lifespan: 550, frequency: 100,
      follow: body, followOffset: { x: -24, y: 24 },
      blendMode: "ADD", tint: [C.coinShine, C.amberWhite],
    }).setDepth(8);

    const best = getBestScore();
    if (best > 0) {
      this.add.text(CX, H * 0.3 + 92, `BEST: ${best.toLocaleString()}`, {
        fontSize: "18px", fontFamily: FONT_UI, color: "#ffc840",
        fontStyle: "bold", stroke: "#000", strokeThickness: 5,
      }).setOrigin(0.5);
    }

    const btnGlow = this.add.image(CX, H * 0.58, "bloom_circle").setScale(4, 1.2).setAlpha(0.06).setTint(C.cyan);
    this.tweens.add({ targets: btnGlow, scaleX: 5, scaleY: 1.5, alpha: 0, duration: 2200, repeat: -1 });

    const btn = this.add.image(CX, H * 0.58, "btn_play").setInteractive({ useHandCursor: true });
    this.add.text(CX, H * 0.58, "PLAY", {
      fontSize: "26px", fontFamily: FONT_DISPLAY, color: "#00e5ff", fontStyle: "bold",
    }).setOrigin(0.5);
    btn.on("pointerdown", () => { sfxMenuClick(); this.scene.start("Game"); });
    this.tweens.add({ targets: btn, scaleX: 1.03, scaleY: 1.03, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const ctrlPanel = this.add.graphics();
    drawGlassPanel(ctrlPanel, CX - 160, H * 0.66, 320, 160, 12, 0.5);

    const ctrlTitle = this.add.text(CX, H * 0.66 + 18, "CONTROLS", {
      fontSize: "11px", fontFamily: FONT_UI, color: "#60f8ff", fontStyle: "bold",
      letterSpacing: 3,
    }).setOrigin(0.5);
    this.tweens.add({ targets: ctrlTitle, alpha: 0.5, duration: 2000, yoyo: true, repeat: -1 });

    const ctrls = [
      { k: "LEFT / RIGHT", v: "Change Lane" },
      { k: "UP / SWIPE UP", v: "Jump / Dash" },
      { k: "DOWN / SWIPE DOWN", v: "Slide" },
      { k: "SPACE", v: "Stinger Dash" },
    ];
    ctrls.forEach((c, i) => {
      const cy = H * 0.66 + 42 + i * 30;
      this.add.text(CX - 140, cy, c.k, {
        fontSize: "10px", fontFamily: FONT_MONO, color: "#405878",
      });
      this.add.text(CX + 140, cy, c.v, {
        fontSize: "10px", fontFamily: FONT_UI, color: "#506888",
      }).setOrigin(1, 0);
    });

    this.add.text(CX, H - 28, "A Honeycomb Arena Game", {
      fontSize: "9px", fontFamily: FONT_UI, color: "#1a2848",
    }).setOrigin(0.5);

    this.add.image(CX, H / 2, "scanlines").setAlpha(0.08);
    this.add.image(CX, H / 2, "vignette").setAlpha(0.7);
  }
}

interface PUState {
  magnet: boolean; shield: boolean; boost: boolean;
  magnetTimer?: Phaser.Time.TimerEvent;
  shieldTimer?: Phaser.Time.TimerEvent;
  boostTimer?: Phaser.Time.TimerEvent;
}

class GameScene extends Phaser.Scene {
  private runner!: Phaser.Physics.Arcade.Sprite;
  private wingL!: Phaser.GameObjects.Image;
  private wingR!: Phaser.GameObjects.Image;
  private beeShadow!: Phaser.GameObjects.Image;
  private lane = 1;
  private sliding = false;
  private slideTimer?: Phaser.Time.TimerEvent;
  private speed = INITIAL_SPEED;
  private dist = 0;
  private score = 0;
  private coins = 0;
  private alive = true;

  private obsGroup!: Phaser.Physics.Arcade.Group;
  private coinGroup!: Phaser.Physics.Arcade.Group;
  private puGroup!: Phaser.Physics.Arcade.Group;

  private pu: PUState = { magnet: false, shield: false, boost: false };

  private combo = 0;
  private comboTimer = 0;
  private maxCombo = 0;

  private dashReady = true;
  private dashing = false;
  private dashCooldownTimer = 0;
  private dashCooldownTotal = STINGER_DASH_COOLDOWN;

  private phase = 0;
  private phaseColor1 = C.cyan;
  private phaseColor2 = C.magenta;

  private scoreTxt!: Phaser.GameObjects.Text;
  private coinTxt!: Phaser.GameObjects.Text;
  private timerTxt!: Phaser.GameObjects.Text;
  private comboTxt!: Phaser.GameObjects.Text;
  private phaseTxt!: Phaser.GameObjects.Text;
  private dashIcon!: Phaser.GameObjects.Image;
  private puIcons: Phaser.GameObjects.Container[] = [];

  private bgTunnel!: Phaser.GameObjects.TileSprite;
  private bgStars!: Phaser.GameObjects.Image;
  private gTiles: Phaser.GameObjects.TileSprite[] = [];
  private tunnelRingsGfx!: Phaser.GameObjects.Graphics;

  private obsTimer?: Phaser.Time.TimerEvent;
  private coinTimer?: Phaser.Time.TimerEvent;
  private puTimer?: Phaser.Time.TimerEvent;

  private swipe: { x: number; y: number; t: number } | null = null;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private hexDust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private shieldVis?: Phaser.GameObjects.Arc;
  private dashVis?: Phaser.GameObjects.Arc;
  private fc = 0;
  private tunnelOffset = 0;
  private gameTimer = 0;

  private trailImages: Phaser.GameObjects.Image[] = [];
  private trailTimer = 0;
  private citySkyline!: Phaser.GameObjects.TileSprite;
  private chromAbGfx?: Phaser.GameObjects.Graphics;
  private chromAbTimer = 0;
  private bossWarningActive = false;

  constructor() { super({ key: "Game" }); }

  create() {
    this.lane = 1; this.sliding = false; this.speed = INITIAL_SPEED;
    this.dist = 0; this.score = 0; this.coins = 0; this.alive = true;
    this.pu = { magnet: false, shield: false, boost: false };
    this.puIcons = []; this.gTiles = []; this.fc = 0;
    this.combo = 0; this.comboTimer = 0; this.maxCombo = 0;
    this.dashReady = true; this.dashing = false; this.dashCooldownTimer = 0;
    this.phase = 0; this.tunnelOffset = 0; this.gameTimer = 0;
    this.trailImages = []; this.trailTimer = 0; this.chromAbTimer = 0;
    this.bossWarningActive = false;
    this.updatePhaseColors();

    this.bgTunnel = this.add.tileSprite(0, 0, W, H, "bg_tunnel").setOrigin(0, 0).setScrollFactor(0);
    this.bgStars = this.add.image(CX, H / 2, "stars").setAlpha(0.25);

    this.citySkyline = this.add.tileSprite(0, H * 0.2, W, 150, "city_skyline").setOrigin(0, 0).setAlpha(0.3).setDepth(0).setScrollFactor(0);

    this.add.image(CX, H / 2, "noise_overlay").setAlpha(0.15).setDepth(0);

    this.tunnelRingsGfx = this.add.graphics().setDepth(1);

    this.add.rectangle(CX, GROUND_Y - 60, LANE_WIDTH * 3 + 16, 260, C.tunnelDark, 0.18).setDepth(2);

    for (let i = 0; i <= LANE_COUNT; i++) {
      const lx = CX + LANE_POSITIONS[0] - LANE_WIDTH / 2 + i * LANE_WIDTH;
      const edge = (i === 0 || i === LANE_COUNT);
      this.add.line(0, 0, lx, GROUND_Y - 200, lx, GROUND_Y + 36, C.cyan, edge ? 0.1 : 0.03).setOrigin(0, 0).setDepth(2);
      if (edge) this.add.line(0, 0, lx, GROUND_Y - 200, lx, GROUND_Y + 36, C.cyan, 0.015).setOrigin(0, 0).setLineWidth(4).setDepth(2);
    }

    this.gTiles.push(this.add.tileSprite(CX, GROUND_Y, LANE_WIDTH * 3 + 24, 36, "ground_tile").setDepth(3));

    this.obsGroup = this.physics.add.group({ allowGravity: false });
    this.coinGroup = this.physics.add.group({ allowGravity: false });
    this.puGroup = this.physics.add.group({ allowGravity: false });

    this.beeShadow = this.add.image(CX, GROUND_Y - 6, "bee_shadow").setScale(2.2).setAlpha(0.18).setDepth(4);

    this.runner = this.physics.add.sprite(CX, RUNNER_Y, "runner");
    this.runner.setCollideWorldBounds(false);
    this.runner.setGravityY(GRAVITY);
    this.runner.setSize(50, 70);
    this.runner.setDepth(10);

    this.wingL = this.add.image(CX - 30, RUNNER_Y - 22, "wing_l").setScale(1.7).setAlpha(0.45).setDepth(9);
    this.wingR = this.add.image(CX + 30, RUNNER_Y - 22, "wing_r").setScale(1.7).setAlpha(0.45).setDepth(11);
    this.tweens.add({ targets: this.wingL, scaleY: 0.3, alpha: 0.12, duration: 38, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: this.wingR, scaleY: 0.3, alpha: 0.12, duration: 38, yoyo: true, repeat: -1 });

    this.particles = this.add.particles(0, 0, "particle_amber", {
      speed: { min: 12, max: 45 }, scale: { start: 0.45, end: 0 },
      alpha: { start: 0.45, end: 0 }, lifespan: 500, frequency: 55,
      follow: this.runner, followOffset: { x: 0, y: 38 },
      blendMode: "ADD", tint: [C.amberHot, C.amberWhite, C.cyan],
    }).setDepth(8);

    this.hexDust = this.add.particles(0, 0, "hex_dust", {
      speed: { min: 6, max: 28 }, scale: { start: 0.55, end: 0 },
      alpha: { start: 0.35, end: 0 }, lifespan: 700, frequency: 130,
      follow: this.runner, followOffset: { x: 0, y: 42 },
      blendMode: "ADD", tint: [C.coinBody, C.amberHot],
    }).setDepth(8);

    this.add.particles(0, 0, "particle_white", {
      speed: { min: 4, max: 18 }, scale: { start: 0.7, end: 0 },
      alpha: { start: 0.35, end: 0 }, lifespan: 400, frequency: 110,
      follow: this.runner, followOffset: { x: -16, y: 28 },
      blendMode: "ADD", tint: [C.coinShine, C.amberWhite, C.white],
    }).setDepth(8);

    this.shieldVis = this.add.circle(CX, RUNNER_Y, 46, C.shieldGreen, 0.05);
    this.shieldVis.setStrokeStyle(2, C.shieldBright, 0.3);
    this.shieldVis.setVisible(false).setDepth(12);

    this.dashVis = this.add.circle(CX, RUNNER_Y, 50, C.cyan, 0.03);
    this.dashVis.setStrokeStyle(2, C.cyanBright, 0.45);
    this.dashVis.setVisible(false).setDepth(12);

    this.physics.add.overlap(this.runner, this.obsGroup, this.hitObs, undefined, this);
    this.physics.add.overlap(this.runner, this.coinGroup, this.getCoin, undefined, this);
    this.physics.add.overlap(this.runner, this.puGroup, this.getPU, undefined, this);

    this.schedObs();
    this.coinTimer = this.time.addEvent({ delay: COIN_SPAWN_INTERVAL, callback: this.spawnCoin, callbackScope: this, loop: true });
    this.puTimer = this.time.addEvent({ delay: POWERUP_SPAWN_INTERVAL, callback: this.spawnPU, callbackScope: this, loop: true });

    this.setupInput();
    this.makeHUD();

    this.add.image(CX, H / 2, "scanlines").setAlpha(0.06).setDepth(99).setScrollFactor(0);
    this.add.image(CX, H / 2, "vignette").setAlpha(0.4).setDepth(100).setScrollFactor(0);

    this.chromAbGfx = this.add.graphics().setDepth(98).setScrollFactor(0).setAlpha(0);

    this.events.on("shutdown", () => {
      this.trailImages.forEach(t => { if (t && t.active) t.destroy(); });
      this.trailImages = [];
      if (this.chromAbGfx) { this.chromAbGfx.destroy(); this.chromAbGfx = undefined; }
    });
  }

  private updatePhaseColors() {
    const colors = [
      [C.cyan, C.magenta],
      [C.magentaHot, C.amberHot],
      [C.lime, C.cyanHot],
      [C.amberHot, C.glitchPink],
    ];
    const c = colors[Math.min(this.phase, colors.length - 1)];
    this.phaseColor1 = c[0];
    this.phaseColor2 = c[1];
  }

  private makeHUD() {
    const d = 91;
    const hY = 20;

    const hudGfx = this.add.graphics().setDepth(d - 1).setScrollFactor(0);
    hudGfx.fillStyle(C.glass, 0.5);
    hudGfx.fillRoundedRect(8, 6, W - 16, 54, 12);
    hudGfx.lineStyle(1, C.glassBorder, 0.3);
    hudGfx.strokeRoundedRect(8, 6, W - 16, 54, 12);
    hudGfx.fillStyle(0xffffff, 0.02);
    hudGfx.fillRoundedRect(9, 7, W - 18, 22, { tl: 11, tr: 11, bl: 0, br: 0 });

    this.add.image(22, hY, "honey_drop").setScale(0.75).setDepth(d).setScrollFactor(0);
    this.coinTxt = this.add.text(38, hY, "0", {
      fontSize: "15px", fontFamily: FONT_MONO, color: "#ffffff", fontStyle: "bold", stroke: "#000", strokeThickness: 2,
    }).setOrigin(0, 0.5).setDepth(d).setScrollFactor(0);

    this.comboTxt = this.add.text(CX, hY, "1x", {
      fontSize: "13px", fontFamily: FONT_UI, color: "#ffc840", fontStyle: "bold", stroke: "#000", strokeThickness: 3,
    }).setOrigin(0.5).setDepth(d).setScrollFactor(0);

    this.timerTxt = this.add.text(W - 18, hY, "0.0s", {
      fontSize: "14px", fontFamily: FONT_MONO, color: "#c0d0e8", fontStyle: "bold", stroke: "#000", strokeThickness: 2,
    }).setOrigin(1, 0.5).setDepth(d).setScrollFactor(0);

    this.scoreTxt = this.add.text(CX, hY + 22, "0", {
      fontSize: "13px", fontFamily: FONT_UI, color: "#60f8ff", stroke: "#000", strokeThickness: 2,
    }).setOrigin(0.5).setDepth(d).setScrollFactor(0);

    this.phaseTxt = this.add.text(CX, hY + 40, PHASE_NAMES[0], {
      fontSize: "9px", fontFamily: FONT_UI, color: "#60f8ff", stroke: "#000", strokeThickness: 2,
      letterSpacing: 2,
    }).setOrigin(0.5).setDepth(d).setScrollFactor(0).setAlpha(0.6);

    const dashGfx = this.add.graphics().setDepth(d - 1).setScrollFactor(0);
    dashGfx.fillStyle(C.glass, 0.45);
    dashGfx.fillRoundedRect(10, H - 80, 68, 70, 12);
    dashGfx.lineStyle(1, C.glassBorder, 0.25);
    dashGfx.strokeRoundedRect(10, H - 80, 68, 70, 12);

    this.dashIcon = this.add.image(44, H - 52, "dash_icon_ready").setScale(0.78).setDepth(d).setScrollFactor(0);
    this.add.text(44, H - 22, "DASH", {
      fontSize: "8px", fontFamily: FONT_UI, color: "#60f8ff", fontStyle: "bold",
      letterSpacing: 1,
    }).setOrigin(0.5).setDepth(d).setScrollFactor(0);

    this.add.image(W - 22, H - 22, "diamond_icon").setScale(0.75).setDepth(d).setScrollFactor(0).setAlpha(0.35);
  }

  private setupInput() {
    const c = this.input.keyboard?.createCursorKeys();
    if (c) {
      c.left?.on("down", () => this.mvL());
      c.right?.on("down", () => this.mvR());
      c.up?.on("down", () => this.jumpOrDash());
      c.down?.on("down", () => this.slide());
    }
    this.input.keyboard?.on("keydown-SPACE", () => this.triggerDash());
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => { this.swipe = { x: p.x, y: p.y, t: this.time.now }; });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (!this.swipe) return;
      const dx = p.x - this.swipe.x, dy = p.y - this.swipe.y;
      const dt = this.time.now - this.swipe.t;
      this.swipe = null;
      if (dt > 500) return;
      const ax = Math.abs(dx), ay = Math.abs(dy);
      if (ax < 30 && ay < 30) return;
      if (ax > ay) { dx > 0 ? this.mvR() : this.mvL(); }
      else { dy < 0 ? this.jumpOrDash() : this.slide(); }
    });
  }

  private mvL() { if (this.alive && this.lane > 0) { this.lane--; this.tweens.add({ targets: this.runner, x: CX + LANE_POSITIONS[this.lane], duration: 110, ease: "Power2" }); } }
  private mvR() { if (this.alive && this.lane < LANE_COUNT - 1) { this.lane++; this.tweens.add({ targets: this.runner, x: CX + LANE_POSITIONS[this.lane], duration: 110, ease: "Power2" }); } }

  private jumpOrDash() {
    if (!this.alive) return;
    if (this.dashReady) { this.triggerDash(); } else { this.jump(); }
  }

  private jump() {
    if (!this.alive) return;
    const b = this.runner.body as Phaser.Physics.Arcade.Body;
    if (b.y + b.height >= GROUND_Y - 2) { b.setVelocityY(JUMP_VELOCITY); sfxJump(); }
  }

  private slide() {
    if (!this.alive || this.sliding) return;
    this.sliding = true;
    sfxSlide();
    this.runner.setTexture("runner_slide");
    this.runner.setSize(60, 24);
    this.runner.y = GROUND_Y - 14;
    this.slideTimer = this.time.delayedCall(SLIDE_DURATION, () => {
      if (!this.alive) return;
      this.sliding = false;
      this.runner.setTexture("runner");
      this.runner.setSize(50, 70);
    });
  }

  private triggerDash() {
    if (!this.alive || !this.dashReady || this.dashing) return;
    this.dashing = true;
    this.dashReady = false;
    this.dashCooldownTimer = STINGER_DASH_COOLDOWN;
    this.runner.setAlpha(0.5);
    this.runner.setTint(C.cyanBright);
    this.dashVis?.setVisible(true);
    sfxDash();

    this.cameras.main.flash(200, 0, 229, 255, false);

    for (let i = 0; i < 12; i++) {
      const s = this.add.image(this.runner.x + Phaser.Math.Between(-38, 38), this.runner.y + Phaser.Math.Between(-38, 38), "particle_cyan")
        .setScale(3.2).setAlpha(0.65).setDepth(15).setBlendMode("ADD");
      this.tweens.add({ targets: s, x: s.x + Phaser.Math.Between(-80, 80), y: s.y + Phaser.Math.Between(-80, 80), alpha: 0, scale: 0, duration: 420, onComplete: () => s.destroy() });
    }

    this.dashIcon.setTexture("dash_icon_bg").setAlpha(0.25);

    this.time.delayedCall(STINGER_DASH_DURATION, () => {
      this.dashing = false;
      this.runner.setAlpha(1);
      this.runner.clearTint();
      this.dashVis?.setVisible(false);
    });
  }

  private schedObs() {
    const d = Phaser.Math.Between(OBSTACLE_SPAWN_INTERVAL_MIN, OBSTACLE_SPAWN_INTERVAL_MAX);
    this.obsTimer = this.time.delayedCall(d, () => { this.spawnObs(); if (this.alive) this.schedObs(); });
  }

  private spawnObs() {
    const l = Phaser.Math.Between(0, LANE_COUNT - 1);
    const maxType = this.phase >= 2 ? 6 : this.phase >= 1 ? 5 : 3;
    const t = Phaser.Math.Between(0, maxType);
    const tx = ["barrier", "low_gate", "lane_blocker", "glitch_wall", "spinning_laser", "wave_beam", "pulse_mine"];
    const o = this.obsGroup.create(CX + LANE_POSITIONS[l], -70, tx[t]) as Phaser.Physics.Arcade.Sprite;
    o.setImmovable(true).setDepth(6);
    if (t === 1) { o.y = -24; o.setSize(86, 14); }
    else if (t === 2) o.setSize(26, 88);
    else if (t === 3) { o.setSize(82, 52); if (Math.random() > 0.5) this.tweens.add({ targets: o, alpha: 0.3, duration: 80, yoyo: true, repeat: 3 }); }
    else if (t === 4) { o.setSize(96, 12); this.tweens.add({ targets: o, angle: 360, duration: 1800, repeat: -1 }); }
    else if (t === 5) { o.setSize(200, 18); o.x = CX; }
    else if (t === 6) { o.setSize(48, 48); this.tweens.add({ targets: o, scaleX: 1.3, scaleY: 1.3, duration: 500, yoyo: true, repeat: -1 }); }
    else o.setSize(82, 52);
  }

  private spawnCoin() {
    const l = Phaser.Math.Between(0, LANE_COUNT - 1);
    const c = this.coinGroup.create(CX + LANE_POSITIONS[l], -35, "coin") as Phaser.Physics.Arcade.Sprite;
    c.setDepth(5).setSize(24, 24);
    this.tweens.add({ targets: c, scaleX: 0.6, duration: 320, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  private spawnPU() {
    const l = Phaser.Math.Between(0, LANE_COUNT - 1);
    const ts = ["magnet", "shield_pu", "boost_pu"];
    const p = this.puGroup.create(CX + LANE_POSITIONS[l], -35, ts[Phaser.Math.Between(0, 2)]) as Phaser.Physics.Arcade.Sprite;
    p.setDepth(5).setSize(30, 30);
    this.tweens.add({ targets: p, angle: 360, duration: 2800, repeat: -1 });
    this.tweens.add({ targets: p, scaleX: 1.1, scaleY: 1.1, duration: 450, yoyo: true, repeat: -1 });
  }

  private triggerChromAb() {
    this.chromAbTimer = 350;
    if (this.chromAbGfx) {
      this.chromAbGfx.setAlpha(1);
      this.chromAbGfx.clear();
      this.chromAbGfx.fillStyle(0xff0000, 0.03);
      this.chromAbGfx.fillRect(3, 0, W, H);
      this.chromAbGfx.fillStyle(0x0000ff, 0.03);
      this.chromAbGfx.fillRect(-3, 0, W, H);
      this.chromAbGfx.fillStyle(0xff0040, 0.05);
      this.chromAbGfx.fillRect(0, 0, W, 3);
      this.chromAbGfx.fillRect(0, H - 3, W, 3);
    }
  }

  private spawnBossWarning() {
    if (this.bossWarningActive || !this.alive) return;
    this.bossWarningActive = true;
    const warn = this.add.image(CX, H / 2 - 50, "boss_warning_bg").setAlpha(0).setDepth(95);
    const txt = this.add.text(CX, H / 2 - 50, "WARNING", {
      fontSize: "32px", fontFamily: FONT_DISPLAY, color: "#ff2848", fontStyle: "bold", stroke: "#000", strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0).setDepth(96);
    this.tweens.add({ targets: [warn, txt], alpha: 1, duration: 200, yoyo: true, repeat: 3, hold: 150, onComplete: () => {
      warn.destroy(); txt.destroy();
      this.bossWarningActive = false;
      if (!this.alive) return;
      for (let i = 0; i < LANE_COUNT; i++) {
        this.time.delayedCall(i * 200, () => {
          if (!this.alive) return;
          const bObs = this.obsGroup.create(CX + LANE_POSITIONS[i], -70, "barrier") as Phaser.Physics.Arcade.Sprite;
          bObs.setImmovable(true).setDepth(6).setSize(82, 52).setTint(this.phaseColor1);
        });
      }
    }});
  }

  private hitObs(_r: any, o: any) {
    if (this.dashing) {
      o.destroy();
      this.score += 50;
      this.bumpCombo();
      sfxCombo();
      const p = this.add.text(this.runner.x, this.runner.y - 34, "PHASED!", {
        fontSize: "15px", fontFamily: FONT_UI, color: "#00e5ff", fontStyle: "bold", stroke: "#000", strokeThickness: 3,
      }).setDepth(30);
      this.tweens.add({ targets: p, y: p.y - 50, alpha: 0, duration: 500, onComplete: () => p.destroy() });
      return;
    }

    if (this.pu.shield) {
      o.destroy();
      this.pu.shield = false;
      if (this.pu.shieldTimer) this.pu.shieldTimer.destroy();
      this.shieldVis?.setVisible(false);
      this.rmPUIcon("shield");
      sfxShieldBreak();
      this.cameras.main.shake(200, 0.01);
      this.triggerChromAb();
      for (let i = 0; i < 12; i++) {
        const s = this.add.image(this.runner.x, this.runner.y, "spark").setScale(2.8).setAlpha(0.75).setDepth(20).setTint(C.shieldBright);
        this.tweens.add({ targets: s, x: s.x + Phaser.Math.Between(-75, 75), y: s.y + Phaser.Math.Between(-75, 75), alpha: 0, scale: 0, duration: 420, onComplete: () => s.destroy() });
      }
      return;
    }

    if (!this.alive) return;
    this.alive = false;
    sfxDeath();

    this.cameras.main.shake(500, 0.025);
    this.cameras.main.flash(300, 255, 16, 64);
    this.triggerChromAb();

    for (let i = 0; i < 20; i++) {
      const tint = i % 2 === 0 ? C.laserRedWhite : C.magentaBright;
      const s = this.add.image(this.runner.x, this.runner.y, "spark").setScale(3.2).setAlpha(0.85).setDepth(20).setTint(tint);
      this.tweens.add({ targets: s, x: s.x + Phaser.Math.Between(-110, 110), y: s.y + Phaser.Math.Between(-110, 110), alpha: 0, scale: 0, duration: 580, onComplete: () => s.destroy() });
    }

    const fs = this.score + Math.floor(this.dist);
    const bs = getBestScore();
    const nb = fs > bs;
    if (nb) setBestScore(fs);
    addCoins(this.coins);
    incrementRuns();

    this.runner.setTint(0xff2020);
    this.tweens.add({ targets: this.runner, alpha: 0, duration: 600 });
    this.tweens.add({ targets: [this.wingL, this.wingR], alpha: 0, duration: 350 });

    this.time.delayedCall(900, () => {
      this.gTiles = [];
      this.scene.start("GameOver", { score: fs, coins: this.coins, distance: Math.floor(this.dist), bestScore: nb ? fs : bs, isNewBest: nb, speed: this.speed, maxCombo: this.maxCombo });
    });
  }

  private getCoin(_r: any, c: any) {
    c.destroy();
    this.coins++;
    this.score += COIN_SCORE * Math.max(1, Math.floor(this.combo));
    this.bumpCombo();
    sfxCoin();

    this.cameras.main.shake(50, 0.003);

    const p = this.add.text(this.runner.x + 18, this.runner.y - 26, `+${COIN_SCORE * Math.max(1, Math.floor(this.combo))}`, {
      fontSize: "14px", fontFamily: FONT_UI, color: "#ffd040", fontStyle: "bold", stroke: "#000", strokeThickness: 3,
    }).setDepth(30);
    this.tweens.add({ targets: p, y: p.y - 45, alpha: 0, duration: 480, onComplete: () => p.destroy() });
  }

  private bumpCombo() {
    this.combo = Math.min(20, this.combo + 1);
    this.comboTimer = COMBO_DECAY_TIME;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
  }

  private getPU(_r: any, p: any) {
    const t = p.texture.key;
    p.destroy();
    sfxPowerup();
    if (t === "magnet") this.actPU("magnet", MAGNET_DURATION, C.magnetBright);
    else if (t === "shield_pu") this.actPU("shield", SHIELD_DURATION, C.shieldBright);
    else if (t === "boost_pu") this.actPU("boost", BOOST_DURATION, C.boostBright);
  }

  private actPU(type: "magnet" | "shield" | "boost", dur: number, col: number) {
    this.pu[type] = true;
    const tk = `${type}Timer` as "magnetTimer" | "shieldTimer" | "boostTimer";
    if (this.pu[tk]) this.pu[tk]!.destroy();
    this.pu[tk] = this.time.delayedCall(dur, () => {
      this.pu[type] = false;
      this.rmPUIcon(type);
      if (type === "shield") this.shieldVis?.setVisible(false);
    });
    if (type === "shield") this.shieldVis?.setVisible(true);
    this.rmPUIcon(type);
    const puGfx = this.add.graphics();
    puGfx.fillStyle(col, 0.08);
    puGfx.fillRoundedRect(-15, -15, 30, 30, 8);
    puGfx.lineStyle(1.5, col, 0.4);
    puGfx.strokeRoundedRect(-15, -15, 30, 30, 8);
    const lb = this.add.text(0, 0, type[0].toUpperCase(), { fontSize: "12px", fontFamily: FONT_UI, color: `#${col.toString(16).padStart(6, "0")}`, fontStyle: "bold" }).setOrigin(0.5);
    const ct = this.add.container(W - 34 - this.puIcons.length * 34, H - 42, [puGfx, lb]).setDepth(91);
    (ct as any).__t = type;
    this.puIcons.push(ct);
  }

  private rmPUIcon(type: string) {
    this.puIcons = this.puIcons.filter((c) => { if ((c as any).__t === type) { c.destroy(); return false; } return true; });
  }

  private drawTunnelRings() {
    const g = this.tunnelRingsGfx;
    g.clear();
    const numRings = 16;
    const baseOffset = this.tunnelOffset % 55;

    for (let i = numRings; i >= 0; i--) {
      const t = (i * 55 + baseOffset) / (numRings * 55);
      const r = 10 + t * (W * 0.9);
      const cy = VY + t * (H * 0.6);
      const rr = r * (0.5 + t * 0.5);

      const ea = 0.18 + t * 0.6;
      const ew = 0.8 + t * 3;
      strokeHex(g, VX, cy, rr, this.phaseColor1, ea, ew);
      if (t > 0.15) strokeHex(g, VX, cy, rr + 2, this.phaseColor1, ea * 0.15, ew + 4);
      if (t > 0.25) strokeHex(g, VX, cy, rr, this.phaseColor2, ea * 0.18, ew * 0.35);

      if (t > 0.35) {
        const pts = hexVerts(VX, cy, rr);
        for (let j = 0; j < 6; j++) {
          g.fillStyle(this.phaseColor1, 0.2 + t * 0.3);
          g.fillCircle(pts[j][0], pts[j][1], 1.2 + t * 3);
        }
      }
    }

    for (let i = 0; i < 6; i++) {
      const angle = (PI / 3) * i - PI / 6;
      const len = W * 0.65;
      g.lineStyle(0.6, this.phaseColor1, 0.05);
      g.lineBetween(VX, VY, VX + Math.cos(angle) * len, VY + Math.sin(angle) * len);
    }
  }

  update(_t: number, delta: number) {
    if (!this.alive) return;
    this.fc++;
    this.gameTimer += delta / 1000;

    this.speed = Math.min(MAX_SPEED, this.speed + SPEED_RAMP * (delta / 16));
    const es = this.pu.boost ? this.speed * BOOST_SPEED_MULT : this.speed;
    this.dist += es * (delta / 16) * 0.15;
    this.score += Math.floor(es * (delta / 16) * 0.1);

    const newPhase = PHASE_THRESHOLDS.reduce((p, thresh, i) => this.score >= thresh ? i : p, 0);
    if (newPhase !== this.phase) {
      this.phase = newPhase;
      this.updatePhaseColors();
      sfxPhase();
      this.cameras.main.flash(300, 0, 229, 255, false);
      this.cameras.main.shake(300, 0.012);
      if (this.phaseTxt) {
        this.phaseTxt.setText(PHASE_NAMES[this.phase] || "");
        this.tweens.add({ targets: this.phaseTxt, scaleX: 1.3, scaleY: 1.3, duration: 200, yoyo: true });
      }
      this.spawnBossWarning();
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.combo = Math.max(0, this.combo - 1);
        if (this.combo > 0) this.comboTimer = COMBO_DECAY_TIME;
      }
    }

    if (!this.dashReady && !this.dashing) {
      this.dashCooldownTimer -= delta;
      if (this.dashCooldownTimer <= 0) {
        this.dashReady = true;
        this.dashIcon.setTexture("dash_icon_ready").setAlpha(1);
        const flash = this.add.circle(44, H - 52, 30, C.cyan, 0.18).setDepth(92);
        this.tweens.add({ targets: flash, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
      } else {
        const pct = 1 - (this.dashCooldownTimer / this.dashCooldownTotal);
        this.dashIcon.setAlpha(0.2 + pct * 0.8);
      }
    }

    this.tunnelOffset += es * 2;
    this.drawTunnelRings();

    this.bgTunnel.tilePositionY -= es * 0.2;
    this.citySkyline.tilePositionX += es * 0.12;

    if (this.chromAbTimer > 0) {
      this.chromAbTimer -= delta;
      if (this.chromAbTimer <= 0 && this.chromAbGfx) { this.chromAbGfx.setAlpha(0); this.chromAbGfx.clear(); }
      else if (this.chromAbGfx) this.chromAbGfx.setAlpha(this.chromAbTimer / 350);
    }

    this.trailTimer -= delta;
    if (this.trailTimer <= 0 && !this.sliding) {
      this.trailTimer = 55;
      const trail = this.add.image(this.runner.x, this.runner.y, "runner")
        .setAlpha(0.18).setTint(this.phaseColor1).setDepth(8).setBlendMode("ADD");
      this.trailImages.push(trail);
      this.tweens.add({ targets: trail, alpha: 0, scaleX: 0.8, scaleY: 0.8, duration: 320, onComplete: () => {
        trail.destroy();
        this.trailImages = this.trailImages.filter(t => t !== trail);
      }});
      if (this.trailImages.length > 6) {
        const old = this.trailImages.shift();
        if (old) old.destroy();
      }
    }

    this.gTiles.forEach((gt) => { gt.tilePositionY -= es * 0.5; });

    this.wingL.x = this.runner.x - 30;
    this.wingR.x = this.runner.x + 30;
    this.wingL.y = this.runner.y - 22;
    this.wingR.y = this.runner.y - 22;

    this.beeShadow.x = this.runner.x;
    const sd = Math.max(0, GROUND_Y - this.runner.y);
    this.beeShadow.setScale(Math.max(0.4, 2.2 - sd * 0.01)).setAlpha(Math.max(0.03, 0.18 - sd * 0.002));

    if (this.shieldVis) { this.shieldVis.x = this.runner.x; this.shieldVis.y = this.runner.y; }
    if (this.dashVis) { this.dashVis.x = this.runner.x; this.dashVis.y = this.runner.y; }

    const body = this.runner.body as Phaser.Physics.Arcade.Body;
    if (!this.sliding && body.y + body.height > GROUND_Y) {
      body.y = GROUND_Y - body.height;
      body.setVelocityY(0);
    }

    if (es > 6.5 && this.fc % 2 === 0) {
      const sl = this.add.image(Phaser.Math.Between(10, W - 10), -10, "speed_line")
        .setAlpha(0.08 + (es - 6.5) * 0.03).setScale(1, 1.2 + es * 0.2).setDepth(2).setTint(this.phaseColor1);
      this.tweens.add({ targets: sl, y: H + 24, alpha: 0, duration: 240 + Phaser.Math.Between(0, 140), onComplete: () => sl.destroy() });
    }

    if (this.combo >= 10 && this.fc % 3 === 0) {
      const sl2 = this.add.image(Phaser.Math.Between(5, W - 5), -5, "speed_line")
        .setAlpha(0.15).setScale(1.5, 2.2 + es * 0.15).setDepth(2).setTint(this.phaseColor2);
      this.tweens.add({ targets: sl2, y: H + 24, alpha: 0, duration: 200, onComplete: () => sl2.destroy() });
    }

    this.obsGroup.getChildren().forEach((o) => {
      const s = o as Phaser.Physics.Arcade.Sprite;
      s.y += es * (delta / 16) * 2;
      if (s.texture.key === "wave_beam") {
        s.x = CX + Math.sin(s.y * 0.02 + this.fc * 0.05) * 45;
      }
      if (s.y > H + 110) s.destroy();
    });
    this.coinGroup.getChildren().forEach((o) => {
      const c = o as Phaser.Physics.Arcade.Sprite;
      c.y += es * (delta / 16) * 2;
      if (c.y > H + 55) c.destroy();
      if (this.pu.magnet) {
        const dx = this.runner.x - c.x, dy = this.runner.y - c.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 160 && d > 5) { c.x += (dx / d) * 8; c.y += (dy / d) * 8; }
      }
    });
    this.puGroup.getChildren().forEach((o) => {
      const p = o as Phaser.Physics.Arcade.Sprite;
      p.y += es * (delta / 16) * 2;
      if (p.y > H + 55) p.destroy();
    });

    const coinDisplay = this.score > 1000 ? `${(this.score / 1000).toFixed(1)}K` : this.score.toString();
    this.coinTxt.setText(coinDisplay);
    this.scoreTxt.setText(`SCORE: ${this.score.toLocaleString()}`);
    this.timerTxt.setText(`${this.gameTimer.toFixed(1)}s`);

    const comboDisplay = Math.max(1, Math.floor(this.combo));
    this.comboTxt.setText(`${comboDisplay}x COMBO`);
    if (comboDisplay >= 10) {
      this.comboTxt.setColor("#ff0080");
    } else if (comboDisplay >= 5) {
      this.comboTxt.setColor("#ffc840");
    } else {
      this.comboTxt.setColor("#60f8ff");
    }
  }
}

class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: "GameOver" }); }
  create(data: { score: number; coins: number; distance: number; bestScore: number; isNewBest: boolean; speed: number; maxCombo: number }) {
    this.add.tileSprite(0, 0, W, H, "bg_tunnel").setOrigin(0, 0);
    this.add.rectangle(CX, H / 2, W, H, 0x020010, 0.55);
    this.add.image(CX, H / 2, "noise_overlay").setAlpha(0.2);

    const tg = this.add.text(CX, 50, "GAME OVER", {
      fontSize: "48px", fontFamily: FONT_DISPLAY, color: "#ff2848", fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0.06);
    this.tweens.add({ targets: tg, alpha: 0.15, duration: 2000, yoyo: true, repeat: -1 });

    const tg2 = this.add.text(CX, 50, "GAME OVER", {
      fontSize: "47px", fontFamily: FONT_DISPLAY, color: "#ff0080", fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0.03);
    this.tweens.add({ targets: tg2, alpha: 0.08, scaleX: 1.02, duration: 2500, yoyo: true, repeat: -1 });

    this.add.text(CX, 50, "GAME OVER", {
      fontSize: "46px", fontFamily: FONT_DISPLAY, color: "#ff2848",
      fontStyle: "bold", stroke: "#100008", strokeThickness: 8,
    }).setOrigin(0.5);

    if (data.isNewBest) {
      const nb = this.add.text(CX, 92, "NEW BEST!", {
        fontSize: "24px", fontFamily: FONT_DISPLAY, color: "#ffc840",
        fontStyle: "bold", stroke: "#201000", strokeThickness: 5,
      }).setOrigin(0.5);
      this.tweens.add({ targets: nb, scaleX: 1.05, scaleY: 1.05, duration: 600, yoyo: true, repeat: -1 });
    }

    const beeGlow = this.add.image(CX, 142, "bloom_circle").setScale(1.5).setAlpha(0.08).setTint(C.cyan);
    this.tweens.add({ targets: beeGlow, scaleX: 2, scaleY: 2, alpha: 0, duration: 2200, repeat: -1 });
    const bee = this.add.image(CX, 142, "runner").setScale(2.5);
    this.tweens.add({ targets: bee, y: 136, duration: 1500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const panelGfx = this.add.graphics();
    const panelY = 184;
    const panelW = 340;
    const panelH = 310;
    drawGlassPanel(panelGfx, CX - panelW / 2, panelY, panelW, panelH, 16, 0.65);

    const stats = [
      { l: "SCORE", v: data.score.toLocaleString(), c: "#00e5ff" },
      { l: "HONEY", v: data.coins.toString(), c: "#ffc840" },
      { l: "DISTANCE", v: `${data.distance.toLocaleString()}m`, c: "#ff0080" },
      { l: "MAX COMBO", v: `${data.maxCombo}x`, c: "#30ff10" },
      { l: "TOP SPEED", v: `${data.speed.toFixed(1)}x`, c: "#ff6800" },
      { l: "BEST", v: data.bestScore.toLocaleString(), c: "#ffc840" },
    ];
    stats.forEach((s, i) => {
      const y = panelY + 20 + i * 46;
      const rowGfx = this.add.graphics();
      rowGfx.fillStyle(0x000010, 0.35);
      rowGfx.fillRoundedRect(CX - panelW / 2 + 14, y, panelW - 28, 38, 8);
      rowGfx.lineStyle(0.8, C.glassBorder, 0.2);
      rowGfx.strokeRoundedRect(CX - panelW / 2 + 14, y, panelW - 28, 38, 8);

      this.add.text(CX - panelW / 2 + 28, y + 10, s.l, {
        fontSize: "10px", fontFamily: FONT_UI, color: "#506888",
        letterSpacing: 1,
      });
      const val = this.add.text(CX + panelW / 2 - 28, y + 18, s.v, {
        fontSize: "20px", fontFamily: FONT_MONO, color: s.c, fontStyle: "bold", stroke: "#000", strokeThickness: 3,
      }).setOrigin(1, 0.5).setAlpha(0).setScale(0.7);
      this.tweens.add({ targets: val, alpha: 1, scaleX: 1, scaleY: 1, duration: 380, delay: 200 + i * 100, ease: "Back.easeOut" });
    });

    const btnY = panelY + panelH + 28;
    const btnGlow = this.add.image(CX, btnY, "bloom_circle").setScale(4, 1).setAlpha(0.04).setTint(C.cyan);
    this.tweens.add({ targets: btnGlow, scaleX: 5, scaleY: 1.3, alpha: 0, duration: 2000, repeat: -1 });

    const retry = this.add.image(CX, btnY, "btn_play").setInteractive({ useHandCursor: true });
    this.add.text(CX, btnY, "PLAY AGAIN", {
      fontSize: "18px", fontFamily: FONT_DISPLAY, color: "#00e5ff", fontStyle: "bold",
    }).setOrigin(0.5);
    retry.on("pointerdown", () => { sfxMenuClick(); this.scene.start("Game"); });
    this.tweens.add({ targets: retry, scaleX: 1.03, scaleY: 1.03, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const menu = this.add.image(CX, btnY + 60, "btn_menu").setInteractive({ useHandCursor: true });
    this.add.text(CX, btnY + 60, "MENU", {
      fontSize: "15px", fontFamily: FONT_DISPLAY, color: "#ff0080",
    }).setOrigin(0.5);
    menu.on("pointerdown", () => { sfxMenuClick(); this.scene.start("Menu"); });

    this.input.keyboard?.once("keydown-SPACE", () => this.scene.start("Game"));
    this.input.keyboard?.once("keydown-ENTER", () => this.scene.start("Game"));

    this.add.image(CX, H / 2, "scanlines").setAlpha(0.06);
    this.add.image(CX, H / 2, "vignette").setAlpha(0.7);
  }
}

export function createHoneyRunnerGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent,
    backgroundColor: "#020010",
    physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, MenuScene, GameScene, GameOverScene],
    input: { activePointers: 3 },
    render: { pixelArt: false, antialias: true },
  });
}
