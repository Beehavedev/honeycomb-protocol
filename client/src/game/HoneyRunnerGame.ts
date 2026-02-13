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
import arenaRunnerBg from "../assets/images/arena-runner.png";
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

const VX = CX;
const VY = H * 0.12;

class BootScene extends Phaser.Scene {
  constructor() { super({ key: "Boot" }); }
  preload() {
    this.load.image("arena_runner_bg", arenaRunnerBg);
  }
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

  private genBg(_g: Phaser.GameObjects.Graphics) {
    const srcTex = this.textures.get("arena_runner_bg");
    const srcImg = srcTex.getSourceImage() as HTMLImageElement;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    const srcW = srcImg.width, srcH = srcImg.height;
    const scale = Math.max(W / srcW, H / srcH);
    const dw = srcW * scale, dh = srcH * scale;
    ctx.drawImage(srcImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, W, H);
    if (this.textures.exists("bg_tunnel")) this.textures.remove("bg_tunnel");
    this.textures.addCanvas("bg_tunnel", canvas);
  }

  private genStars(g: Phaser.GameObjects.Graphics) {
    g.clear();
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      const s = 0.2 + Math.random() * 1.8;
      const b = Math.random();
      if (b > 0.97) {
        g.fillStyle(C.white, 0.95);
        g.fillCircle(x, y, s + 1.5);
        g.fillStyle(C.white, 0.15);
        g.fillCircle(x, y, s + 6);
      } else if (b > 0.92) {
        g.fillStyle(C.amber, 0.7);
        g.fillCircle(x, y, s + 0.8);
        g.fillStyle(C.amber, 0.08);
        g.fillCircle(x, y, s + 5);
      } else if (b > 0.85) {
        g.fillStyle(0xaaccff, 0.6);
        g.fillCircle(x, y, s + 0.3);
      } else if (b > 0.5) {
        g.fillStyle(C.white, 0.25 + Math.random() * 0.35);
        g.fillCircle(x, y, s * 0.5);
      } else {
        g.fillStyle(C.white, 0.08 + Math.random() * 0.15);
        g.fillCircle(x, y, s * 0.3);
      }
    }
    g.generateTexture("stars", W, H);
    g.clear();
  }

  private genScanlines(g: Phaser.GameObjects.Graphics) {
    g.clear();
    for (let y = 0; y < H; y += 3) {
      g.fillStyle(0x000000, y % 6 === 0 ? 0.035 : 0.015);
      g.fillRect(0, y, W, 1);
    }
    g.generateTexture("scanlines", W, H);
    g.clear();
  }

  private genVignette(g: Phaser.GameObjects.Graphics) {
    g.clear();
    for (let i = 0; i < 32; i++) {
      const t = i / 32;
      g.fillStyle(0x000000, (1 - t) * (1 - t) * 0.15);
      g.fillEllipse(CX, H / 2, W * (0.25 + t * 0.75), H * (0.25 + t * 0.75));
    }
    g.fillStyle(0x000000, 0.7);
    g.fillRect(0, 0, W, 12);
    g.fillRect(0, H - 12, W, 12);
    g.fillStyle(0x000000, 0.55);
    g.fillRect(0, 0, 6, H);
    g.fillRect(W - 6, 0, 6, H);
    g.generateTexture("vignette", W, H);
    g.clear();
  }

  private genNoise(g: Phaser.GameObjects.Graphics) {
    g.clear();
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      g.fillStyle(0xffffff, Math.random() * 0.02);
      g.fillRect(x, y, 1, 1);
    }
    g.generateTexture("noise_overlay", W, H);
    g.clear();
  }

  private genCyberBee(g: Phaser.GameObjects.Graphics) {
    const bw = 96, bh = 120;
    const cx = bw / 2;
    g.clear();

    g.lineStyle(2.5, 0x1a1208, 1);
    g.beginPath(); g.moveTo(cx - 6, 12); g.lineTo(cx - 14, -2); g.lineTo(cx - 19, -12); g.strokePath();
    g.beginPath(); g.moveTo(cx + 6, 12); g.lineTo(cx + 14, -2); g.lineTo(cx + 19, -12); g.strokePath();
    g.lineStyle(1.5, 0xf0a500, 0.8);
    g.beginPath(); g.moveTo(cx - 6, 12); g.lineTo(cx - 14, -2); g.lineTo(cx - 19, -12); g.strokePath();
    g.beginPath(); g.moveTo(cx + 6, 12); g.lineTo(cx + 14, -2); g.lineTo(cx + 19, -12); g.strokePath();
    g.fillStyle(0xffd050, 1);
    g.fillCircle(cx - 19, -12, 3.5);
    g.fillCircle(cx + 19, -12, 3.5);
    g.fillStyle(0xf0a500, 0.4);
    g.fillCircle(cx - 19, -12, 8);
    g.fillCircle(cx + 19, -12, 8);

    g.fillStyle(C.beeBody, 1);
    g.fillEllipse(cx, 22, 36, 30);
    g.fillStyle(C.beeBodyLight, 0.6);
    g.fillEllipse(cx, 18, 22, 18);

    g.lineStyle(1.2, 0xf0a500, 0.5);
    g.lineBetween(cx - 3, 10, cx - 3, 32);
    g.lineBetween(cx + 3, 10, cx + 3, 32);
    g.lineStyle(0.8, 0xf0a500, 0.35);
    g.lineBetween(cx - 10, 14, cx - 10, 30);
    g.lineBetween(cx + 10, 14, cx + 10, 30);
    g.fillStyle(0xf0a500, 0.12);
    g.fillRect(cx - 8, 27, 16, 4);

    g.fillStyle(0xf0a500, 0.2);
    g.fillCircle(cx - 11, 17, 13);
    g.fillCircle(cx + 11, 17, 13);
    g.fillStyle(0xffd050, 1);
    g.fillEllipse(cx - 11, 17, 14, 13);
    g.fillEllipse(cx + 11, 17, 14, 13);
    g.fillStyle(0xffe880, 0.95);
    g.fillEllipse(cx - 11, 16, 10, 9);
    g.fillEllipse(cx + 11, 16, 10, 9);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(cx - 13, 13, 3);
    g.fillCircle(cx + 9, 13, 3);
    g.lineStyle(1, 0xc08800, 0.7);
    for (let r = 4; r <= 7; r += 1.5) {
      g.strokeCircle(cx - 11, 17, r);
      g.strokeCircle(cx + 11, 17, r);
    }
    g.fillStyle(0x503000, 1);
    g.fillCircle(cx - 11, 17, 2.5);
    g.fillCircle(cx + 11, 17, 2.5);

    g.lineStyle(2.5, C.beeBody, 1);
    g.lineBetween(cx - 11, 34, cx - 15, 42);
    g.lineBetween(cx - 15, 42, cx - 21, 48);
    g.lineBetween(cx + 11, 34, cx + 15, 42);
    g.lineBetween(cx + 15, 42, cx + 21, 48);
    g.lineBetween(cx - 16, 32, cx - 22, 40);
    g.lineBetween(cx - 22, 40, cx - 29, 46);
    g.lineBetween(cx + 16, 32, cx + 22, 40);
    g.lineBetween(cx + 22, 40, cx + 29, 46);
    g.lineBetween(cx - 13, 41, cx - 17, 50);
    g.lineBetween(cx + 13, 41, cx + 17, 50);
    g.lineStyle(1, 0xf0a500, 0.6);
    g.lineBetween(cx - 11, 34, cx - 15, 42);
    g.lineBetween(cx + 11, 34, cx + 15, 42);
    g.lineBetween(cx - 16, 32, cx - 22, 40);
    g.lineBetween(cx + 16, 32, cx + 22, 40);
    g.fillStyle(0xf0a500, 0.85);
    [-21, -15, -17, 21, 15, 17].forEach((dx, i) => {
      const dy = i < 3 ? [48, 42, 50][i] : [48, 42, 50][i - 3];
      g.fillCircle(cx + dx, dy, 2);
    });

    g.fillStyle(C.beeBody, 1);
    g.fillEllipse(cx, 42, 34, 22);
    g.fillStyle(C.beeBodyLight, 0.6);
    g.fillEllipse(cx, 39, 20, 14);
    g.lineStyle(0.9, 0xf0a500, 0.45);
    g.lineBetween(cx - 13, 36, cx + 13, 36);
    g.lineBetween(cx - 10, 41, cx + 10, 41);
    g.lineBetween(cx - 8, 46, cx + 8, 46);
    g.lineStyle(0.6, 0xf0a500, 0.3);
    g.lineBetween(cx, 32, cx, 50);
    g.fillStyle(0xf0a500, 0.2);
    g.fillRect(cx - 4, 34, 8, 5);

    g.fillStyle(C.beeBody, 1);
    g.fillEllipse(cx, 77, 44, 52);
    g.fillStyle(C.beeBodyLight, 0.6);
    g.fillEllipse(cx - 5, 68, 20, 26);

    const stripes = [57, 64, 71, 78, 85, 92];
    for (let i = 0; i < stripes.length; i++) {
      const sw = 18 - Math.abs(i - 2.5) * 2.8;
      g.fillStyle(0xffaa00, 1);
      g.fillEllipse(cx, stripes[i], sw * 2.2, 5.5);
      g.fillStyle(0xffc850, 0.85);
      g.fillEllipse(cx - 1, stripes[i] - 0.6, sw * 1.5, 3);
      g.fillStyle(0xff9000, 0.5);
      g.fillEllipse(cx + 2, stripes[i] + 1.2, sw * 1, 2);
      g.fillStyle(0xffe090, 0.2);
      g.fillEllipse(cx, stripes[i], sw * 2.8, 8);
    }

    g.lineStyle(0.9, 0xf0a500, 0.4);
    for (let i = 0; i < 5; i++) {
      const ly = 56 + i * 9;
      g.lineBetween(cx - 20, ly, cx - 10, ly + 3);
      g.lineBetween(cx + 20, ly, cx + 10, ly + 3);
    }
    g.lineStyle(0.6, 0xf0a500, 0.25);
    g.lineBetween(cx, 55, cx, 96);
    g.fillStyle(0xf0a500, 0.18);
    g.fillCircle(cx, 70, 5);
    g.fillStyle(0xffe070, 0.08);
    g.fillCircle(cx, 70, 12);

    g.lineStyle(2, 0xc08800, 0.6);
    g.strokeEllipse(cx, 77, 44, 52);
    g.lineStyle(4, 0xf0a500, 0.12);
    g.strokeEllipse(cx, 77, 48, 56);

    g.fillStyle(C.beeBody, 1);
    g.beginPath(); g.moveTo(cx, 106); g.lineTo(cx - 6, 99); g.lineTo(cx + 6, 99); g.closePath(); g.fillPath();
    g.fillStyle(0x90a0b0, 1);
    g.beginPath(); g.moveTo(cx, 116); g.lineTo(cx - 3, 106); g.lineTo(cx + 3, 106); g.closePath(); g.fillPath();
    g.fillStyle(0xd0e0f0, 0.85);
    g.fillRect(cx - 0.6, 106, 1.2, 10);
    g.fillStyle(0xf0a500, 0.75);
    g.fillCircle(cx, 116, 2.5);
    g.fillStyle(0xf0a500, 0.2);
    g.fillCircle(cx, 116, 7);

    g.generateTexture("runner", bw, bh);
    g.clear();
  }

  private genCyberBeeSlide(g: Phaser.GameObjects.Graphics) {
    const sw = 88, sh = 38;
    g.clear();
    g.fillStyle(C.beeBody, 1);
    g.fillEllipse(16, sh / 2, 24, 20);
    g.lineStyle(0.8, 0xf0a500, 0.4);
    g.lineBetween(7, sh / 2, 25, sh / 2);
    g.fillStyle(0xffd050, 1);
    g.fillCircle(12, sh / 2 - 4, 5);
    g.fillCircle(22, sh / 2 - 4, 5);
    g.fillStyle(0xffe880, 0.9);
    g.fillCircle(12, sh / 2 - 4.5, 3);
    g.fillCircle(22, sh / 2 - 4.5, 3);
    g.lineStyle(0.8, 0xc08800, 0.6);
    g.strokeCircle(12, sh / 2 - 4, 5);
    g.strokeCircle(22, sh / 2 - 4, 5);
    g.fillStyle(C.beeBody, 1);
    g.fillEllipse(36, sh / 2, 20, 18);
    g.fillStyle(C.beeBody, 1);
    g.fillEllipse(sw / 2 + 8, sh / 2, 44, 28);
    const sx = [38, 46, 54, 62];
    for (const x of sx) {
      g.fillStyle(0xffaa00, 1);
      g.fillRect(x, sh / 2 - 11, 5, 22);
      g.fillStyle(0xffc850, 0.7);
      g.fillRect(x, sh / 2 - 8, 4, 14);
    }
    g.lineStyle(0.6, 0xf0a500, 0.35);
    g.lineBetween(34, sh / 2, 72, sh / 2);
    g.lineBetween(sw / 2 + 8, sh / 2 - 13, sw / 2 + 8, sh / 2 + 13);
    g.lineStyle(1.2, 0xc08800, 0.5);
    g.strokeEllipse(sw / 2 + 8, sh / 2, 44, 28);
    g.generateTexture("runner_slide", sw, sh);
    g.clear();
  }

  private genBeeShadow(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(C.black, 0.15);
    g.fillEllipse(36, 10, 68, 20);
    g.fillStyle(C.amber, 0.03);
    g.fillEllipse(36, 10, 76, 24);
    g.generateTexture("bee_shadow", 72, 20);
    g.clear();
  }

  private genWings(g: Phaser.GameObjects.Graphics) {
    const ww = 58, wh = 70;

    const drawWing = (flipX: boolean) => {
      g.clear();
      const ox = flipX ? -1 : 1;
      g.fillStyle(0xf0a500, 0.18);
      g.fillEllipse(ww / 2, wh / 2, ww - 2, wh - 2);
      g.fillStyle(0xff7800, 0.12);
      g.fillEllipse(ww / 2 + ox * 4, wh / 2 + 10, ww * 0.6, wh * 0.4);
      g.fillStyle(0xffe890, 0.1);
      g.fillEllipse(ww / 2 - ox * 6, wh / 2 - 12, ww * 0.5, wh * 0.35);
      g.lineStyle(1, 0xf0a500, 0.6);
      g.lineBetween(5, 7, ww / 2, wh - 7);
      g.lineBetween(4, wh / 2, ww - 4, wh / 2 - 5);
      g.lineBetween(ww / 2 - ox * 5, 6, ww / 2 + ox * 4, wh - 10);
      g.lineStyle(0.6, 0xf0a500, 0.45);
      g.lineBetween(8, wh * 0.3, ww - 8, wh * 0.35);
      g.lineBetween(ww / 2, 4, ww / 2 + ox * 16, wh * 0.6);
      g.lineBetween(6, wh * 0.5, ww - 6, wh * 0.48);
      g.lineBetween(9, wh * 0.7, ww - 9, wh * 0.65);
      g.lineStyle(0.5, 0xf0a500, 0.3);
      g.lineBetween(ww * 0.2, wh * 0.15, ww * 0.35, wh * 0.55);
      g.lineBetween(ww * 0.65, wh * 0.1, ww * 0.75, wh * 0.5);
      g.lineBetween(ww * 0.3, wh * 0.42, ww * 0.78, wh * 0.55);
      g.lineStyle(0.8, 0xff7800, 0.25);
      g.lineBetween(7, wh / 2 + 12, ww - 7, wh / 2 + 8);
      g.lineBetween(ww * 0.15, wh * 0.72, ww * 0.85, wh * 0.65);
      g.fillStyle(0xf0a500, 0.15);
      for (let i = 0; i < 8; i++) {
        const px = ww * 0.15 + Math.random() * ww * 0.7;
        const py = wh * 0.1 + Math.random() * wh * 0.8;
        g.fillCircle(px, py, 1.2 + Math.random() * 2.5);
      }
      g.lineStyle(2.5, 0xf0a500, 0.55);
      g.strokeEllipse(ww / 2, wh / 2, ww - 2, wh - 2);
      g.lineStyle(6, 0xff7800, 0.12);
      g.strokeEllipse(ww / 2, wh / 2, ww + 5, wh + 5);
      g.lineStyle(12, 0xf0a500, 0.04);
      g.strokeEllipse(ww / 2, wh / 2, ww + 12, wh + 12);
    };

    drawWing(false);
    g.generateTexture("wing_l", ww, wh);
    g.clear();
    drawWing(true);
    g.generateTexture("wing_r", ww, wh);
    g.clear();
  }

  private genObstacles(g: Phaser.GameObjects.Graphics) {
    const bw = 100, bh = 64;
    g.clear();

    g.fillStyle(C.laserRedGlow, 0.15);
    g.fillRoundedRect(-8, -8, bw + 16, bh + 16, 12);
    g.fillStyle(0x200010, 0.95);
    g.fillRoundedRect(0, 0, bw, bh, 8);

    for (let ly = 5; ly < bh; ly += 5) {
      g.lineStyle(3, C.laserRed, 0.8);
      g.lineBetween(7, ly, bw - 7, ly);
      g.lineStyle(8, C.laserRedGlow, 0.15);
      g.lineBetween(7, ly, bw - 7, ly);
    }
    for (let lx = 14; lx < bw; lx += 11) {
      g.lineStyle(1.5, C.laserRed, 0.45);
      g.lineBetween(lx, 4, lx, bh - 4);
    }

    g.lineStyle(3.5, C.laserRed, 0.95);
    g.strokeRoundedRect(1, 1, bw - 2, bh - 2, 8);
    g.lineStyle(10, C.laserRedGlow, 0.2);
    g.strokeRoundedRect(0, 0, bw, bh, 9);
    g.lineStyle(22, C.laserRedGlow, 0.06);
    g.strokeRoundedRect(-3, -3, bw + 6, bh + 6, 10);

    const corners = [[8, 8], [bw - 8, 8], [8, bh - 8], [bw - 8, bh - 8]];
    for (const [ccx, ccy] of corners) {
      g.fillStyle(C.laserRedWhite, 1);
      g.fillCircle(ccx, ccy, 4);
      g.fillStyle(C.laserRedBright, 0.4);
      g.fillCircle(ccx, ccy, 10);
    }
    g.generateTexture("barrier", bw, bh);
    g.clear();

    g.fillStyle(C.laserRedGlow, 0.12);
    g.fillRoundedRect(-5, -5, bw + 10, 28, 7);
    g.fillStyle(0x200010, 0.95);
    g.fillRoundedRect(0, 0, bw, 20, 5);
    g.lineStyle(4, C.laserRed, 0.95);
    g.lineBetween(0, 10, bw, 10);
    g.lineStyle(12, C.laserRedGlow, 0.16);
    g.lineBetween(0, 10, bw, 10);
    g.lineStyle(2.5, C.laserRed, 0.5);
    g.lineBetween(0, 4, bw, 4);
    g.lineBetween(0, 16, bw, 16);
    for (const ccx of [6, bw - 6]) {
      g.fillStyle(C.laserRedWhite, 1);
      g.fillCircle(ccx, 10, 5);
      g.fillStyle(C.laserRedGlow, 0.3);
      g.fillCircle(ccx, 10, 12);
    }
    g.generateTexture("low_gate", bw, 20);
    g.clear();

    const gw = 100, gh = 64;
    g.fillStyle(C.glitchPurple, 0.1);
    g.fillRoundedRect(-5, -5, gw + 10, gh + 10, 10);
    g.fillStyle(0x0c0020, 0.95);
    g.fillRoundedRect(0, 0, gw, gh, 8);
    for (let i = 0; i < 16; i++) {
      const ox = Phaser.Math.Between(5, gw - 16);
      const oy = Phaser.Math.Between(5, gh - 12);
      const ow = Phaser.Math.Between(8, 28);
      const oh = Phaser.Math.Between(4, 12);
      g.fillStyle(C.glitchPurple, 0.45 + Math.random() * 0.5);
      g.fillRect(ox, oy, ow, oh);
    }
    for (let i = 0; i < 8; i++) {
      const gy = Phaser.Math.Between(3, gh - 3);
      g.lineStyle(1.5 + Math.random() * 3, C.glitchBlue, 0.5 + Math.random() * 0.4);
      g.lineBetween(0, gy, gw, gy);
    }
    g.lineStyle(3, C.glitchPurple, 0.9);
    g.strokeRoundedRect(1, 1, gw - 2, gh - 2, 8);
    g.lineStyle(8, C.glitchPurple, 0.15);
    g.strokeRoundedRect(0, 0, gw, gh, 9);
    g.generateTexture("glitch_wall", gw, gh);
    g.clear();

    g.fillStyle(C.laserRedGlow, 0.1);
    g.fillRoundedRect(-4, -4, 40, 108, 10);
    g.fillStyle(0x200010, 0.95);
    g.fillRoundedRect(0, 0, 34, 100, 8);
    g.lineStyle(3, C.laserRed, 0.95);
    g.strokeRoundedRect(1, 1, 32, 98, 8);
    g.lineStyle(1.5, C.laserRed, 0.5);
    g.lineBetween(17, 4, 17, 96);
    for (const cy of [12, 88]) {
      g.fillStyle(C.laserRedWhite, 1);
      g.fillCircle(17, cy, 5);
      g.fillStyle(C.laserRedGlow, 0.2);
      g.fillCircle(17, cy, 12);
    }
    g.generateTexture("lane_blocker", 34, 100);
    g.clear();
  }

  private genCoin(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const s = 18, pad = 8, cs = s + pad;
    g.fillStyle(C.coinGlow, 0.12);
    g.fillCircle(cs, cs, s + 14);
    g.fillStyle(C.amber, 0.05);
    g.fillCircle(cs, cs, s + 22);
    fillHex(g, cs, cs, s, C.coinBody, 1);
    fillHex(g, cs, cs, s - 2, C.coinLight, 0.4);
    fillHex(g, cs, cs, s - 4, C.coinBody, 0.3);
    g.fillStyle(C.coinShine, 0.25);
    g.fillEllipse(cs - 4, cs - 5, 8, 14);
    strokeHex(g, cs, cs, s, C.coinShine, 0.8, 2.5);
    strokeHex(g, cs, cs, s + 3, C.coinGlow, 0.2, 4);
    strokeHex(g, cs, cs, s + 5, C.amber, 0.08, 6);
    fillHex(g, cs, cs, 6, C.coinGlow, 0.6);
    strokeHex(g, cs, cs, 6, C.coinShine, 0.5, 1.2);
    g.generateTexture("coin", cs * 2, cs * 2);
    g.clear();
  }

  private genPowerups(g: Phaser.GameObjects.Graphics) {
    const s = 24;
    g.clear();

    const drawBase = (col: number, colB: number) => {
      g.fillStyle(col, 0.1);
      g.fillCircle(s, s, s + 10);
      g.fillStyle(0x080018, 0.92);
      g.fillRoundedRect(0, 0, s * 2, s * 2, 12);
      g.lineStyle(3, col, 0.9);
      g.strokeRoundedRect(0, 0, s * 2, s * 2, 12);
      g.lineStyle(6, colB, 0.15);
      g.strokeRoundedRect(-1, -1, s * 2 + 2, s * 2 + 2, 13);
      g.lineStyle(12, col, 0.05);
      g.strokeRoundedRect(-3, -3, s * 2 + 6, s * 2 + 6, 14);
      g.fillStyle(0xffffff, 0.04);
      g.fillRoundedRect(3, 3, s * 2 - 6, s * 0.8, { tl: 10, tr: 10, bl: 0, br: 0 });
    };

    drawBase(C.magnetBlue, C.magnetBright);
    g.lineStyle(4, C.magnetBlue, 0.95);
    g.beginPath(); g.arc(s, s - 2, 9, PI, 0, false); g.strokePath();
    g.fillStyle(C.magnetBlue, 1);
    g.fillRect(s - 9, s - 2, 5, 16);
    g.fillRect(s + 4, s - 2, 5, 16);
    g.fillStyle(C.laserRed, 1);
    g.fillRect(s - 9, s + 9, 5, 5);
    g.fillStyle(C.cyan, 1);
    g.fillRect(s + 4, s + 9, 5, 5);
    g.fillStyle(C.magnetBright, 0.15);
    g.fillCircle(s, s, 8);
    g.generateTexture("magnet", s * 2, s * 2);
    g.clear();

    drawBase(C.shieldGreen, C.shieldBright);
    g.lineStyle(4, C.shieldGreen, 0.95);
    g.beginPath();
    g.moveTo(s, 5); g.lineTo(s + 13, 11); g.lineTo(s + 13, 27);
    g.lineTo(s, 36); g.lineTo(s - 13, 27); g.lineTo(s - 13, 11);
    g.closePath(); g.strokePath();
    g.fillStyle(C.shieldGreen, 0.2);
    g.beginPath();
    g.moveTo(s, 5); g.lineTo(s + 13, 11); g.lineTo(s + 13, 27);
    g.lineTo(s, 36); g.lineTo(s - 13, 27); g.lineTo(s - 13, 11);
    g.closePath(); g.fillPath();
    g.fillStyle(C.shieldBright, 0.1);
    g.fillCircle(s, 20, 10);
    g.generateTexture("shield_pu", s * 2, s * 2);
    g.clear();

    drawBase(C.boostOrange, C.boostBright);
    g.fillStyle(C.boostOrange, 1);
    g.fillTriangle(s - 6, s + 10, s + 2, s - 12, s + 4, s + 3);
    g.fillStyle(C.boostBright, 1);
    g.fillTriangle(s - 4, s + 3, s + 6, s + 3, s + 2, s + 13);
    g.fillStyle(C.boostBright, 0.15);
    g.fillCircle(s, s, 8);
    g.generateTexture("boost_pu", s * 2, s * 2);
    g.clear();
  }

  private genGround(g: Phaser.GameObjects.Graphics) {
    const tW = LANE_WIDTH * 3 + 24;
    const tH = 40;
    g.clear();

    for (let y = 0; y < tH; y++) {
      const t = y / tH;
      g.fillStyle(C.amber, 0.02 * (1 - t));
      g.fillRect(0, y, tW, 1);
    }

    g.lineStyle(2, C.amber, 0.5);
    g.lineBetween(0, 0, tW, 0);
    g.lineStyle(8, C.amber, 0.06);
    g.lineBetween(0, 0, tW, 0);

    for (let i = 1; i < 3; i++) {
      const lx = i * LANE_WIDTH + 12;
      g.lineStyle(0.8, C.amber, 0.12);
      g.lineBetween(lx, 0, lx, tH);
    }
    g.generateTexture("ground_tile", tW, tH);
    g.clear();
  }

  private genParticles(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(C.amberHot, 1);
    g.fillCircle(8, 8, 6);
    g.fillStyle(C.amberWhite, 0.6);
    g.fillCircle(6, 5, 3);
    g.fillStyle(C.amber, 0.18);
    g.fillCircle(8, 8, 10);
    g.generateTexture("particle_amber", 16, 16);
    g.clear();

    g.fillStyle(C.amber, 0.95);
    g.fillCircle(6, 6, 5);
    g.fillStyle(C.amberBright, 0.6);
    g.fillCircle(5, 4, 2.5);
    g.fillStyle(C.amber, 0.12);
    g.fillCircle(6, 6, 9);
    g.generateTexture("particle_cyan", 12, 12);
    g.clear();

    g.fillStyle(C.amberBright, 0.6);
    g.fillRect(0, 0, 3, 28);
    g.fillStyle(C.amber, 0.4);
    g.fillRect(0, 0, 3, 28);
    g.fillStyle(C.orange, 0.1);
    g.fillRect(0, 22, 3, 6);
    g.generateTexture("speed_line", 3, 28);
    g.clear();

    g.fillStyle(C.amberHot, 0.9);
    g.fillRect(0, 0, 4, 4);
    g.fillStyle(C.amberWhite, 0.4);
    g.fillRect(0, 0, 2, 2);
    g.generateTexture("spark", 4, 4);
    g.clear();

    fillHex(g, 8, 8, 6, C.coinBody, 0.8);
    strokeHex(g, 8, 8, 6, C.coinShine, 0.6, 1.2);
    fillHex(g, 8, 8, 3, C.coinGlow, 0.4);
    g.fillStyle(C.coinGlow, 0.1);
    g.fillCircle(8, 8, 11);
    g.generateTexture("hex_dust", 16, 16);
    g.clear();

    g.fillStyle(C.orange, 0.9);
    g.fillCircle(5, 5, 4);
    g.fillStyle(C.orangeBright, 0.5);
    g.fillCircle(4, 3, 2);
    g.fillStyle(C.orange, 0.12);
    g.fillCircle(5, 5, 7);
    g.generateTexture("particle_magenta", 10, 10);
    g.clear();

    g.fillStyle(C.white, 0.7);
    g.fillRect(0, 0, 3, 3);
    g.generateTexture("particle_white", 3, 3);
    g.clear();
  }

  private genDashIcon(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const s = 36;

    g.lineStyle(2.5, C.amber, 0.15);
    g.strokeCircle(s, s, s - 2);
    g.lineStyle(3, C.amber, 0.5);
    g.beginPath(); g.arc(s, s, s - 2, -PI / 2, PI, false); g.strokePath();
    g.fillStyle(C.amberBright, 0.08);
    g.fillCircle(s, s, s - 6);
    g.generateTexture("dash_icon_bg", s * 2, s * 2);
    g.clear();

    g.lineStyle(3.5, C.amber, 0.9);
    g.strokeCircle(s, s, s - 2);
    g.lineStyle(7, C.amberBright, 0.15);
    g.strokeCircle(s, s, s);
    g.fillStyle(C.amberBright, 0.2);
    g.fillCircle(s, s, s - 6);
    g.fillStyle(C.amber, 0.6);
    g.fillTriangle(s - 6, s - 10, s + 10, s, s - 6, s + 10);
    g.fillStyle(C.white, 0.2);
    g.fillTriangle(s - 4, s - 7, s + 7, s, s - 4, s + 7);
    g.generateTexture("dash_icon_ready", s * 2, s * 2);
    g.clear();
  }

  private genHudIcons(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(C.coinBody, 1);
    g.fillCircle(14, 16, 12);
    g.fillStyle(C.amberHot, 0.9);
    g.fillTriangle(14, 4, 9, 16, 19, 16);
    g.fillCircle(14, 16, 7);
    g.fillStyle(C.coinShine, 0.4);
    g.fillCircle(11, 11, 4);
    g.fillStyle(C.coinGlow, 0.12);
    g.fillCircle(14, 16, 18);
    g.generateTexture("honey_drop", 28, 32);
    g.clear();

    g.lineStyle(3, C.amber, 0.6);
    g.strokeCircle(12, 12, 10);
    g.lineStyle(2.5, C.amber, 0.7);
    for (let i = 0; i < 6; i++) {
      const a = (PI / 3) * i;
      g.lineBetween(12 + Math.cos(a) * 5, 12 + Math.sin(a) * 5, 12 + Math.cos(a) * 10, 12 + Math.sin(a) * 10);
    }
    g.fillStyle(C.amber, 0.45);
    g.fillCircle(12, 12, 4);
    g.generateTexture("gear_icon", 24, 24);
    g.clear();

    g.fillStyle(C.white, 0.4);
    const ds = 12;
    g.beginPath();
    g.moveTo(ds, 0); g.lineTo(ds * 2, ds);
    g.lineTo(ds, ds * 2); g.lineTo(0, ds);
    g.closePath(); g.fillPath();
    g.lineStyle(2.5, C.white, 0.6);
    g.beginPath();
    g.moveTo(ds, 0); g.lineTo(ds * 2, ds);
    g.lineTo(ds, ds * 2); g.lineTo(0, ds);
    g.closePath(); g.strokePath();
    g.generateTexture("diamond_icon", ds * 2, ds * 2);
    g.clear();
  }

  private genNewObstacles(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const lw = 110, lh = 16;
    g.fillStyle(C.laserRedGlow, 0.16);
    g.fillRoundedRect(-5, -5, lw + 10, lh + 10, 6);
    for (let i = 0; i < 3; i++) {
      g.lineStyle(4 - i, C.laserRed, 1 - i * 0.2);
      g.lineBetween(0, lh / 2, lw, lh / 2);
    }
    g.lineStyle(16, C.laserRedGlow, 0.1);
    g.lineBetween(0, lh / 2, lw, lh / 2);
    g.fillStyle(C.laserRedWhite, 1);
    g.fillCircle(6, lh / 2, 5);
    g.fillCircle(lw - 6, lh / 2, 5);
    g.fillStyle(C.laserRedGlow, 0.3);
    g.fillCircle(6, lh / 2, 11);
    g.fillCircle(lw - 6, lh / 2, 11);
    g.generateTexture("spinning_laser", lw, lh);
    g.clear();

    const ww = 240, wh = 26;
    g.fillStyle(C.orange, 0.06);
    g.fillRect(0, 0, ww, wh);
    for (let x = 0; x < ww; x += 2) {
      const yOff = Math.sin(x * 0.065) * 8;
      g.fillStyle(C.orangeHot, 0.9);
      g.fillRect(x, wh / 2 + yOff - 2.5, 2, 5);
      g.fillStyle(C.orange, 0.3);
      g.fillRect(x, wh / 2 + yOff - 6, 2, 12);
    }
    g.generateTexture("wave_beam", ww, wh);
    g.clear();

    const dw = 68, dh = 68;
    g.fillStyle(C.laserRedGlow, 0.08);
    g.fillCircle(dw / 2, dh / 2, dw / 2 + 6);
    for (let r = dw / 2; r > 5; r -= 5) {
      g.lineStyle(2, C.laserRed, 0.3 + (1 - r / (dw / 2)) * 0.5);
      g.strokeCircle(dw / 2, dh / 2, r);
    }
    g.fillStyle(C.laserRedWhite, 0.9);
    g.fillCircle(dw / 2, dh / 2, 8);
    g.fillStyle(C.laserRedGlow, 0.2);
    g.fillCircle(dw / 2, dh / 2, 18);
    g.lineStyle(3, C.laserRed, 0.8);
    g.strokeCircle(dw / 2, dh / 2, dw / 2 - 2);
    g.lineStyle(8, C.laserRedGlow, 0.12);
    g.strokeCircle(dw / 2, dh / 2, dw / 2);
    g.generateTexture("pulse_mine", dw, dh);
    g.clear();
  }

  private genCitySkyline(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const sw = W, sh = 170;
    const buildings = [
      { x: 8, w: 34, h: 110 }, { x: 46, w: 26, h: 68 }, { x: 78, w: 42, h: 125 },
      { x: 126, w: 28, h: 78 }, { x: 160, w: 48, h: 138 }, { x: 214, w: 24, h: 62 },
      { x: 242, w: 38, h: 98 }, { x: 286, w: 32, h: 110 }, { x: 324, w: 52, h: 145 },
      { x: 382, w: 28, h: 72 }, { x: 416, w: 40, h: 90 }, { x: 460, w: 24, h: 55 },
    ];
    for (const b of buildings) {
      const by = sh - b.h;
      g.fillStyle(0x050508, 0.95);
      g.fillRect(b.x, by, b.w, b.h);
      g.lineStyle(1, C.amber, 0.1);
      g.strokeRect(b.x, by, b.w, b.h);
      for (let wy = by + 6; wy < sh - 5; wy += 8) {
        for (let wx = b.x + 4; wx < b.x + b.w - 5; wx += 6) {
          const lit = Math.random() > 0.45;
          g.fillStyle(lit ? C.amber : C.orange, lit ? 0.2 + Math.random() * 0.18 : 0.05);
          g.fillRect(wx, wy, 3, 4);
        }
      }
      if (b.h > 75) {
        g.fillStyle(C.laserRed, 0.5);
        g.fillCircle(b.x + b.w / 2, by + 3, 2.5);
        g.fillStyle(C.laserRedGlow, 0.12);
        g.fillCircle(b.x + b.w / 2, by + 3, 8);
      }
    }
    g.lineStyle(1, C.amber, 0.06);
    g.lineBetween(0, sh - 1, sw, sh - 1);
    g.generateTexture("city_skyline", sw, sh);
    g.clear();
  }

  private genBossWarning(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const bw = W, bh = 80;
    g.fillStyle(C.laserRed, 0.16);
    g.fillRect(0, 0, bw, bh);
    for (let x = 0; x < bw; x += 48) {
      g.fillStyle(C.laserRed, 0.25);
      g.fillTriangle(x, 0, x + 24, bh / 2, x, bh);
      g.fillTriangle(x + 48, 0, x + 24, bh / 2, x + 48, bh);
    }
    g.lineStyle(4, C.laserRed, 0.6);
    g.lineBetween(0, 3, bw, 3);
    g.lineBetween(0, bh - 3, bw, bh - 3);
    g.generateTexture("boss_warning_bg", bw, bh);
    g.clear();
  }

  private genGlassPanel(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const pw = 360, ph = 440;
    drawGlassPanel(g, 0, 0, pw, ph, 18, 0.7);
    g.generateTexture("glass_panel", pw, ph);
    g.clear();

    const bw = 240, bh = 56;
    g.fillStyle(0x050508, 0.75);
    g.fillRoundedRect(0, 0, bw, bh, bh / 2);
    g.lineStyle(2.5, C.amber, 0.8);
    g.strokeRoundedRect(0, 0, bw, bh, bh / 2);
    g.fillStyle(C.amber, 0.06);
    g.fillRoundedRect(2, 2, bw - 4, bh * 0.4, { tl: bh / 2, tr: bh / 2, bl: 0, br: 0 });
    g.generateTexture("btn_play", bw, bh);
    g.clear();

    const mw = 200, mh = 48;
    g.fillStyle(0x050508, 0.75);
    g.fillRoundedRect(0, 0, mw, mh, mh / 2);
    g.lineStyle(2, C.orange, 0.6);
    g.strokeRoundedRect(0, 0, mw, mh, mh / 2);
    g.fillStyle(C.orange, 0.05);
    g.fillRoundedRect(2, 2, mw - 4, mh * 0.4, { tl: mh / 2, tr: mh / 2, bl: 0, br: 0 });
    g.generateTexture("btn_menu", mw, mh);
    g.clear();
  }

  private genBloomCircle(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const s = 80;
    for (let i = s; i > 0; i--) {
      const t = i / s;
      g.fillStyle(0xffffff, t * t * 0.1);
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
    const stars = this.add.image(CX, H / 2, "stars").setAlpha(0.7);
    this.tweens.add({ targets: stars, alpha: 0.45, duration: 4000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    this.add.image(CX, H / 2, "noise_overlay").setAlpha(0.08);

    const frameGfx = this.add.graphics();
    const frameRadii = [120, 180, 260];
    for (let i = 0; i < frameRadii.length; i++) {
      const a = [0.06, 0.03, 0.015][i];
      const lw = [1.5, 1, 0.5][i];
      strokeHex(frameGfx, CX, H * 0.3, frameRadii[i], C.amber, a, lw);
    }

    const tGlow = this.add.text(CX, 55, "HONEY", {
      fontSize: "68px", fontFamily: FONT_DISPLAY, color: "#f0a500", fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0.06);
    this.tweens.add({ targets: tGlow, alpha: 0.18, scaleX: 1.04, duration: 2800, yoyo: true, repeat: -1 });

    const tGlow2 = this.add.text(CX, 55, "HONEY", {
      fontSize: "67px", fontFamily: FONT_DISPLAY, color: "#ff7800", fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0.03);
    this.tweens.add({ targets: tGlow2, alpha: 0.1, scaleX: 1.06, duration: 3500, yoyo: true, repeat: -1 });

    this.add.text(CX, 55, "HONEY", {
      fontSize: "64px", fontFamily: FONT_DISPLAY, color: "#f0a500",
      fontStyle: "bold", stroke: "#020204", strokeThickness: 12,
    }).setOrigin(0.5);

    this.add.text(CX, 124, "RUNNER", {
      fontSize: "48px", fontFamily: FONT_DISPLAY, color: "#ff7800",
      fontStyle: "bold", stroke: "#020204", strokeThickness: 10,
    }).setOrigin(0.5);

    const sub = this.add.text(CX, 166, "C Y B E R   H I V E", {
      fontSize: "13px", fontFamily: FONT_UI, color: "#ffe070",
      letterSpacing: 5,
    }).setOrigin(0.5);
    this.tweens.add({ targets: sub, alpha: 0.2, duration: 2500, yoyo: true, repeat: -1 });

    for (let i = 0; i < 4; i++) {
      const pulse = this.add.circle(CX, H * 0.3, 36 + i * 24, C.amber, 0.018 - i * 0.004);
      this.tweens.add({ targets: pulse, scaleX: 1.8 + i * 0.3, scaleY: 1.8 + i * 0.3, alpha: 0, duration: 2400 + i * 300, repeat: -1, delay: i * 300 });
    }

    const shadow = this.add.image(CX, H * 0.3 + 68, "bee_shadow").setScale(5).setAlpha(0.25);
    const body = this.add.image(CX, H * 0.3, "runner").setScale(3.2);
    const wL = this.add.image(CX - 38, H * 0.3 - 30, "wing_l").setScale(3).setAlpha(0.55).setDepth(9);
    const wR = this.add.image(CX + 38, H * 0.3 - 30, "wing_r").setScale(3).setAlpha(0.55).setDepth(11);
    body.setDepth(10);

    this.tweens.add({ targets: body, y: body.y - 14, duration: 2000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: shadow, scaleX: 4.2, alpha: 0.1, duration: 2000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: wL, scaleY: 0.6, alpha: 0.15, duration: 38, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: wR, scaleY: 0.6, alpha: 0.15, duration: 38, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: [wL, wR], y: wL.y - 14, duration: 2000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    this.add.particles(0, 0, "hex_dust", {
      speed: { min: 12, max: 50 }, scale: { start: 0.9, end: 0 },
      alpha: { start: 0.6, end: 0 }, lifespan: 1000, frequency: 70,
      follow: body, followOffset: { x: 0, y: 45 },
      blendMode: "ADD", tint: [C.amberHot, C.coinBody, C.amberWhite],
    }).setDepth(8);

    this.add.particles(0, 0, "particle_white", {
      speed: { min: 6, max: 30 }, scale: { start: 1.2, end: 0 },
      alpha: { start: 0.7, end: 0 }, lifespan: 600, frequency: 90,
      follow: body, followOffset: { x: -28, y: 28 },
      blendMode: "ADD", tint: [C.coinShine, C.amberWhite],
    }).setDepth(8);

    const best = getBestScore();
    if (best > 0) {
      this.add.text(CX, H * 0.3 + 100, `BEST: ${best.toLocaleString()}`, {
        fontSize: "20px", fontFamily: FONT_UI, color: "#ffd050",
        fontStyle: "bold", stroke: "#000", strokeThickness: 6,
      }).setOrigin(0.5);
    }

    const btnGlow = this.add.image(CX, H * 0.57, "bloom_circle").setScale(4.5, 1.4).setAlpha(0.08).setTint(C.amber);
    this.tweens.add({ targets: btnGlow, scaleX: 5.5, scaleY: 1.8, alpha: 0, duration: 2200, repeat: -1 });

    const btn = this.add.image(CX, H * 0.57, "btn_play").setInteractive({ useHandCursor: true });
    this.add.text(CX, H * 0.57, "PLAY", {
      fontSize: "28px", fontFamily: FONT_DISPLAY, color: "#f0a500", fontStyle: "bold",
    }).setOrigin(0.5);
    btn.on("pointerdown", () => { sfxMenuClick(); this.scene.start("Game"); });
    this.tweens.add({ targets: btn, scaleX: 1.04, scaleY: 1.04, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const ctrlPanel = this.add.graphics();
    drawGlassPanel(ctrlPanel, CX - 170, H * 0.65, 340, 170, 14, 0.55);

    const ctrlTitle = this.add.text(CX, H * 0.65 + 20, "CONTROLS", {
      fontSize: "12px", fontFamily: FONT_UI, color: "#ffe070", fontStyle: "bold",
      letterSpacing: 4,
    }).setOrigin(0.5);
    this.tweens.add({ targets: ctrlTitle, alpha: 0.5, duration: 2000, yoyo: true, repeat: -1 });

    const ctrls = [
      { k: "LEFT / RIGHT", v: "Change Lane" },
      { k: "UP / SWIPE UP", v: "Jump / Dash" },
      { k: "DOWN / SWIPE DOWN", v: "Slide" },
      { k: "SPACE", v: "Stinger Dash" },
    ];
    ctrls.forEach((c, i) => {
      const cy = H * 0.65 + 46 + i * 30;
      this.add.text(CX - 148, cy, c.k, {
        fontSize: "11px", fontFamily: FONT_MONO, color: "#506888",
      });
      this.add.text(CX + 148, cy, c.v, {
        fontSize: "11px", fontFamily: FONT_UI, color: "#607898",
      }).setOrigin(1, 0);
    });

    this.add.text(CX, H - 30, "A Honeycomb Arena Game", {
      fontSize: "10px", fontFamily: FONT_UI, color: "#303040",
    }).setOrigin(0.5);

    this.add.image(CX, H / 2, "scanlines").setAlpha(0.06);
    this.add.image(CX, H / 2, "vignette").setAlpha(0.65);
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
  private phaseColor1 = C.amber;
  private phaseColor2 = C.orange;

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
  private chromAbGfx?: Phaser.GameObjects.Graphics;
  private chromAbTimer = 0;
  private bossWarningActive = false;
  private sessionStartTime = 0;

  constructor() { super({ key: "Game" }); }

  create() {
    this.lane = 1; this.sliding = false; this.speed = INITIAL_SPEED;
    this.dist = 0; this.score = 0; this.coins = 0; this.alive = true;
    this.sessionStartTime = Date.now();
    this.pu = { magnet: false, shield: false, boost: false };
    this.puIcons = []; this.gTiles = []; this.fc = 0;
    this.combo = 0; this.comboTimer = 0; this.maxCombo = 0;
    this.dashReady = true; this.dashing = false; this.dashCooldownTimer = 0;
    this.phase = 0; this.tunnelOffset = 0; this.gameTimer = 0;
    this.trailImages = []; this.trailTimer = 0; this.chromAbTimer = 0;
    this.bossWarningActive = false;
    this.updatePhaseColors();

    this.bgTunnel = this.add.tileSprite(0, 0, W, H, "bg_tunnel").setOrigin(0, 0).setScrollFactor(0);
    this.bgStars = this.add.image(CX, H / 2, "stars").setAlpha(0.6);

    this.add.image(CX, H / 2, "noise_overlay").setAlpha(0.06).setDepth(0);

    this.tunnelRingsGfx = this.add.graphics().setDepth(1);

    for (let i = 0; i <= LANE_COUNT; i++) {
      const lx = CX + LANE_POSITIONS[0] - LANE_WIDTH / 2 + i * LANE_WIDTH;
      const edge = (i === 0 || i === LANE_COUNT);
      this.add.line(0, 0, lx, GROUND_Y - 220, lx, GROUND_Y + 40, C.amber, edge ? 0.08 : 0.03).setOrigin(0, 0).setDepth(2);
    }

    this.gTiles.push(this.add.tileSprite(CX, GROUND_Y, LANE_WIDTH * 3 + 24, 40, "ground_tile").setDepth(3));

    this.obsGroup = this.physics.add.group({ allowGravity: false });
    this.coinGroup = this.physics.add.group({ allowGravity: false });
    this.puGroup = this.physics.add.group({ allowGravity: false });

    this.beeShadow = this.add.image(CX, GROUND_Y - 6, "bee_shadow").setScale(2.4).setAlpha(0.2).setDepth(4);

    this.runner = this.physics.add.sprite(CX, RUNNER_Y, "runner");
    this.runner.setCollideWorldBounds(false);
    this.runner.setGravityY(GRAVITY);
    this.runner.setSize(56, 80);
    this.runner.setDepth(10);

    this.wingL = this.add.image(CX - 34, RUNNER_Y - 26, "wing_l").setScale(1.8).setAlpha(0.5).setDepth(9);
    this.wingR = this.add.image(CX + 34, RUNNER_Y - 26, "wing_r").setScale(1.8).setAlpha(0.5).setDepth(11);
    this.tweens.add({ targets: this.wingL, scaleY: 0.35, alpha: 0.15, duration: 38, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: this.wingR, scaleY: 0.35, alpha: 0.15, duration: 38, yoyo: true, repeat: -1 });

    this.particles = this.add.particles(0, 0, "particle_amber", {
      speed: { min: 14, max: 50 }, scale: { start: 0.5, end: 0 },
      alpha: { start: 0.55, end: 0 }, lifespan: 550, frequency: 48,
      follow: this.runner, followOffset: { x: 0, y: 42 },
      blendMode: "ADD", tint: [C.amberHot, C.amberWhite, C.amber],
    }).setDepth(8);

    this.hexDust = this.add.particles(0, 0, "hex_dust", {
      speed: { min: 8, max: 32 }, scale: { start: 0.6, end: 0 },
      alpha: { start: 0.4, end: 0 }, lifespan: 750, frequency: 120,
      follow: this.runner, followOffset: { x: 0, y: 46 },
      blendMode: "ADD", tint: [C.coinBody, C.amberHot],
    }).setDepth(8);

    this.add.particles(0, 0, "particle_white", {
      speed: { min: 5, max: 20 }, scale: { start: 0.8, end: 0 },
      alpha: { start: 0.4, end: 0 }, lifespan: 450, frequency: 100,
      follow: this.runner, followOffset: { x: -18, y: 30 },
      blendMode: "ADD", tint: [C.coinShine, C.amberWhite, C.white],
    }).setDepth(8);

    this.shieldVis = this.add.circle(CX, RUNNER_Y, 50, C.shieldGreen, 0.07);
    this.shieldVis.setStrokeStyle(2.5, C.shieldBright, 0.4);
    this.shieldVis.setVisible(false).setDepth(12);

    this.dashVis = this.add.circle(CX, RUNNER_Y, 54, C.amber, 0.04);
    this.dashVis.setStrokeStyle(2.5, C.amberBright, 0.55);
    this.dashVis.setVisible(false).setDepth(12);

    this.physics.add.overlap(this.runner, this.obsGroup, this.hitObs, undefined, this);
    this.physics.add.overlap(this.runner, this.coinGroup, this.getCoin, undefined, this);
    this.physics.add.overlap(this.runner, this.puGroup, this.getPU, undefined, this);

    this.schedObs();
    this.coinTimer = this.time.addEvent({ delay: COIN_SPAWN_INTERVAL, callback: this.spawnCoin, callbackScope: this, loop: true });
    this.puTimer = this.time.addEvent({ delay: POWERUP_SPAWN_INTERVAL, callback: this.spawnPU, callbackScope: this, loop: true });

    this.setupInput();
    this.makeHUD();

    this.add.image(CX, H / 2, "scanlines").setAlpha(0.05).setDepth(99).setScrollFactor(0);
    this.add.image(CX, H / 2, "vignette").setAlpha(0.35).setDepth(100).setScrollFactor(0);

    this.chromAbGfx = this.add.graphics().setDepth(98).setScrollFactor(0).setAlpha(0);

    this.events.on("shutdown", () => {
      this.trailImages.forEach(t => { if (t && t.active) t.destroy(); });
      this.trailImages = [];
      if (this.chromAbGfx) { this.chromAbGfx.destroy(); this.chromAbGfx = undefined; }
    });
  }

  private updatePhaseColors() {
    const colors = [
      [C.amber, C.orange],
      [C.gold, C.honeyGlow],
      [C.honeyBright, C.goldBright],
      [C.amberBright, C.orangeHot],
    ];
    const c = colors[Math.min(this.phase, colors.length - 1)];
    this.phaseColor1 = c[0];
    this.phaseColor2 = c[1];
  }

  private makeHUD() {
    const d = 91;
    const hY = 22;

    const hudGfx = this.add.graphics().setDepth(d - 1).setScrollFactor(0);
    hudGfx.fillStyle(C.glass, 0.55);
    hudGfx.fillRoundedRect(8, 6, W - 16, 58, 14);
    hudGfx.lineStyle(1.5, C.glassBorder, 0.4);
    hudGfx.strokeRoundedRect(8, 6, W - 16, 58, 14);
    hudGfx.fillStyle(0xffffff, 0.03);
    hudGfx.fillRoundedRect(9, 7, W - 18, 24, { tl: 13, tr: 13, bl: 0, br: 0 });

    this.add.image(24, hY, "honey_drop").setScale(0.8).setDepth(d).setScrollFactor(0);
    this.coinTxt = this.add.text(42, hY, "0", {
      fontSize: "16px", fontFamily: FONT_MONO, color: "#ffffff", fontStyle: "bold", stroke: "#000", strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(d).setScrollFactor(0);

    this.comboTxt = this.add.text(CX, hY, "1x", {
      fontSize: "14px", fontFamily: FONT_UI, color: "#ffc840", fontStyle: "bold", stroke: "#000", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(d).setScrollFactor(0);

    this.timerTxt = this.add.text(W - 20, hY, "0.0s", {
      fontSize: "15px", fontFamily: FONT_MONO, color: "#d0e0f0", fontStyle: "bold", stroke: "#000", strokeThickness: 3,
    }).setOrigin(1, 0.5).setDepth(d).setScrollFactor(0);

    this.scoreTxt = this.add.text(CX, hY + 24, "0", {
      fontSize: "14px", fontFamily: FONT_UI, color: "#ffe070", stroke: "#000", strokeThickness: 3,
    }).setOrigin(0.5).setDepth(d).setScrollFactor(0);

    this.phaseTxt = this.add.text(CX, hY + 44, PHASE_NAMES[0], {
      fontSize: "10px", fontFamily: FONT_UI, color: "#ffe070", stroke: "#000", strokeThickness: 2,
      letterSpacing: 3,
    }).setOrigin(0.5).setDepth(d).setScrollFactor(0).setAlpha(0.7);

    const dashGfx = this.add.graphics().setDepth(d - 1).setScrollFactor(0);
    dashGfx.fillStyle(C.glass, 0.5);
    dashGfx.fillRoundedRect(10, H - 84, 72, 74, 14);
    dashGfx.lineStyle(1.2, C.glassBorder, 0.3);
    dashGfx.strokeRoundedRect(10, H - 84, 72, 74, 14);

    this.dashIcon = this.add.image(46, H - 54, "dash_icon_ready").setScale(0.82).setDepth(d).setScrollFactor(0);
    this.add.text(46, H - 22, "DASH", {
      fontSize: "9px", fontFamily: FONT_UI, color: "#ffe070", fontStyle: "bold",
      letterSpacing: 2,
    }).setOrigin(0.5).setDepth(d).setScrollFactor(0);

    this.add.image(W - 24, H - 24, "diamond_icon").setScale(0.8).setDepth(d).setScrollFactor(0).setAlpha(0.4);
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
    this.runner.setSize(70, 28);
    this.runner.y = GROUND_Y - 16;
    this.slideTimer = this.time.delayedCall(SLIDE_DURATION, () => {
      if (!this.alive) return;
      this.sliding = false;
      this.runner.setTexture("runner");
      this.runner.setSize(56, 80);
    });
  }

  private triggerDash() {
    if (!this.alive || !this.dashReady || this.dashing) return;
    this.dashing = true;
    this.dashReady = false;
    this.dashCooldownTimer = STINGER_DASH_COOLDOWN;
    this.runner.setAlpha(0.5);
    this.runner.setTint(C.amberBright);
    this.dashVis?.setVisible(true);
    sfxDash();

    this.cameras.main.flash(200, 240, 165, 0, false);

    for (let i = 0; i < 14; i++) {
      const s = this.add.image(this.runner.x + Phaser.Math.Between(-42, 42), this.runner.y + Phaser.Math.Between(-42, 42), "particle_amber")
        .setScale(3.5).setAlpha(0.75).setDepth(15).setBlendMode("ADD");
      this.tweens.add({ targets: s, x: s.x + Phaser.Math.Between(-90, 90), y: s.y + Phaser.Math.Between(-90, 90), alpha: 0, scale: 0, duration: 450, onComplete: () => s.destroy() });
    }

    this.dashIcon.setTexture("dash_icon_bg").setAlpha(0.3);

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
    const o = this.obsGroup.create(CX + LANE_POSITIONS[l], -80, tx[t]) as Phaser.Physics.Arcade.Sprite;
    o.setImmovable(true).setDepth(6);
    if (t === 1) { o.y = -26; o.setSize(96, 16); }
    else if (t === 2) o.setSize(30, 94);
    else if (t === 3) { o.setSize(92, 58); if (Math.random() > 0.5) this.tweens.add({ targets: o, alpha: 0.3, duration: 80, yoyo: true, repeat: 3 }); }
    else if (t === 4) { o.setSize(106, 14); this.tweens.add({ targets: o, angle: 360, duration: 1800, repeat: -1 }); }
    else if (t === 5) { o.setSize(220, 20); o.x = CX; }
    else if (t === 6) { o.setSize(54, 54); this.tweens.add({ targets: o, scaleX: 1.3, scaleY: 1.3, duration: 500, yoyo: true, repeat: -1 }); }
    else o.setSize(92, 58);
  }

  private spawnCoin() {
    const l = Phaser.Math.Between(0, LANE_COUNT - 1);
    const c = this.coinGroup.create(CX + LANE_POSITIONS[l], -40, "coin") as Phaser.Physics.Arcade.Sprite;
    c.setDepth(5).setSize(28, 28);
    this.tweens.add({ targets: c, scaleX: 0.6, duration: 320, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  private spawnPU() {
    const l = Phaser.Math.Between(0, LANE_COUNT - 1);
    const ts = ["magnet", "shield_pu", "boost_pu"];
    const p = this.puGroup.create(CX + LANE_POSITIONS[l], -40, ts[Phaser.Math.Between(0, 2)]) as Phaser.Physics.Arcade.Sprite;
    p.setDepth(5).setSize(36, 36);
    this.tweens.add({ targets: p, angle: 360, duration: 2800, repeat: -1 });
    this.tweens.add({ targets: p, scaleX: 1.12, scaleY: 1.12, duration: 450, yoyo: true, repeat: -1 });
  }

  private triggerChromAb() {
    this.chromAbTimer = 350;
    if (this.chromAbGfx) {
      this.chromAbGfx.setAlpha(1);
      this.chromAbGfx.clear();
      this.chromAbGfx.fillStyle(0xff0000, 0.04);
      this.chromAbGfx.fillRect(4, 0, W, H);
      this.chromAbGfx.fillStyle(0x0000ff, 0.04);
      this.chromAbGfx.fillRect(-4, 0, W, H);
      this.chromAbGfx.fillStyle(0xff0050, 0.06);
      this.chromAbGfx.fillRect(0, 0, W, 4);
      this.chromAbGfx.fillRect(0, H - 4, W, 4);
    }
  }

  private spawnBossWarning() {
    if (this.bossWarningActive || !this.alive) return;
    this.bossWarningActive = true;
    const warn = this.add.image(CX, H / 2 - 50, "boss_warning_bg").setAlpha(0).setDepth(95);
    const txt = this.add.text(CX, H / 2 - 50, "WARNING", {
      fontSize: "36px", fontFamily: FONT_DISPLAY, color: "#ff3858", fontStyle: "bold", stroke: "#000", strokeThickness: 7,
    }).setOrigin(0.5).setAlpha(0).setDepth(96);
    this.tweens.add({ targets: [warn, txt], alpha: 1, duration: 200, yoyo: true, repeat: 3, hold: 150, onComplete: () => {
      warn.destroy(); txt.destroy();
      this.bossWarningActive = false;
      if (!this.alive) return;
      for (let i = 0; i < LANE_COUNT; i++) {
        this.time.delayedCall(i * 200, () => {
          if (!this.alive) return;
          const bObs = this.obsGroup.create(CX + LANE_POSITIONS[i], -80, "barrier") as Phaser.Physics.Arcade.Sprite;
          bObs.setImmovable(true).setDepth(6).setSize(92, 58).setTint(this.phaseColor1);
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
      const p = this.add.text(this.runner.x, this.runner.y - 38, "PHASED!", {
        fontSize: "16px", fontFamily: FONT_UI, color: "#f0a500", fontStyle: "bold", stroke: "#000", strokeThickness: 4,
      }).setDepth(30);
      this.tweens.add({ targets: p, y: p.y - 55, alpha: 0, duration: 500, onComplete: () => p.destroy() });
      return;
    }

    if (this.pu.shield) {
      o.destroy();
      this.pu.shield = false;
      if (this.pu.shieldTimer) this.pu.shieldTimer.destroy();
      this.shieldVis?.setVisible(false);
      this.rmPUIcon("shield");
      sfxShieldBreak();
      this.cameras.main.shake(200, 0.012);
      this.triggerChromAb();
      for (let i = 0; i < 14; i++) {
        const s = this.add.image(this.runner.x, this.runner.y, "spark").setScale(3).setAlpha(0.8).setDepth(20).setTint(C.shieldBright);
        this.tweens.add({ targets: s, x: s.x + Phaser.Math.Between(-80, 80), y: s.y + Phaser.Math.Between(-80, 80), alpha: 0, scale: 0, duration: 450, onComplete: () => s.destroy() });
      }
      return;
    }

    if (!this.alive) return;
    this.alive = false;
    sfxDeath();

    this.cameras.main.shake(500, 0.03);
    this.cameras.main.flash(300, 255, 20, 72);
    this.triggerChromAb();

    for (let i = 0; i < 24; i++) {
      const tint = i % 2 === 0 ? C.laserRedWhite : C.orangeBright;
      const s = this.add.image(this.runner.x, this.runner.y, "spark").setScale(3.5).setAlpha(0.9).setDepth(20).setTint(tint);
      this.tweens.add({ targets: s, x: s.x + Phaser.Math.Between(-120, 120), y: s.y + Phaser.Math.Between(-120, 120), alpha: 0, scale: 0, duration: 600, onComplete: () => s.destroy() });
    }

    const fs = this.score + Math.floor(this.dist);
    const bs = getBestScore();
    const nb = fs > bs;
    if (nb) setBestScore(fs);
    addCoins(this.coins);
    incrementRuns();

    this.runner.setTint(0xff2030);
    this.tweens.add({ targets: this.runner, alpha: 0, duration: 600 });
    this.tweens.add({ targets: [this.wingL, this.wingR], alpha: 0, duration: 350 });

    this.time.delayedCall(900, () => {
      this.gTiles = [];
      const sessionDuration = Math.floor((Date.now() - this.sessionStartTime) / 1000);
      this.scene.start("GameOver", { score: fs, coins: this.coins, distance: Math.floor(this.dist), bestScore: nb ? fs : bs, isNewBest: nb, speed: this.speed, maxCombo: this.maxCombo, sessionDuration });
    });
  }

  private getCoin(_r: any, c: any) {
    c.destroy();
    this.coins++;
    this.score += COIN_SCORE * Math.max(1, Math.floor(this.combo));
    this.bumpCombo();
    sfxCoin();

    this.cameras.main.shake(50, 0.004);

    const p = this.add.text(this.runner.x + 20, this.runner.y - 30, `+${COIN_SCORE * Math.max(1, Math.floor(this.combo))}`, {
      fontSize: "15px", fontFamily: FONT_UI, color: "#ffe050", fontStyle: "bold", stroke: "#000", strokeThickness: 4,
    }).setDepth(30);
    this.tweens.add({ targets: p, y: p.y - 50, alpha: 0, duration: 500, onComplete: () => p.destroy() });
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
    puGfx.fillStyle(col, 0.12);
    puGfx.fillRoundedRect(-17, -17, 34, 34, 10);
    puGfx.lineStyle(2, col, 0.5);
    puGfx.strokeRoundedRect(-17, -17, 34, 34, 10);
    const lb = this.add.text(0, 0, type[0].toUpperCase(), { fontSize: "13px", fontFamily: FONT_UI, color: `#${col.toString(16).padStart(6, "0")}`, fontStyle: "bold" }).setOrigin(0.5);
    const ct = this.add.container(W - 38 - this.puIcons.length * 38, H - 44, [puGfx, lb]).setDepth(91);
    (ct as any).__t = type;
    this.puIcons.push(ct);
  }

  private rmPUIcon(type: string) {
    this.puIcons = this.puIcons.filter((c) => { if ((c as any).__t === type) { c.destroy(); return false; } return true; });
  }

  private drawTunnelRings() {
    const g = this.tunnelRingsGfx;
    g.clear();
    const numRings = 8;
    const baseOffset = this.tunnelOffset % 80;

    for (let i = numRings; i >= 0; i--) {
      const t = (i * 80 + baseOffset) / (numRings * 80);
      const r = 20 + t * (W * 0.8);
      const cy = VY + t * (H * 0.55);
      const rr = r * (0.5 + t * 0.5);
      const ea = 0.04 + t * 0.08;
      const ew = 0.5 + t * 1.5;
      strokeHex(g, VX, cy, rr, this.phaseColor1, ea, ew);
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
      this.cameras.main.flash(300, 240, 165, 0, false);
      this.cameras.main.shake(300, 0.015);
      if (this.phaseTxt) {
        this.phaseTxt.setText(PHASE_NAMES[this.phase] || "");
        this.tweens.add({ targets: this.phaseTxt, scaleX: 1.35, scaleY: 1.35, duration: 200, yoyo: true });
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
        const flash = this.add.circle(46, H - 54, 34, C.amber, 0.22).setDepth(92);
        this.tweens.add({ targets: flash, scaleX: 1.6, scaleY: 1.6, alpha: 0, duration: 420, onComplete: () => flash.destroy() });
      } else {
        const pct = 1 - (this.dashCooldownTimer / this.dashCooldownTotal);
        this.dashIcon.setAlpha(0.25 + pct * 0.75);
      }
    }

    this.tunnelOffset += es * 2;
    this.drawTunnelRings();

    this.bgTunnel.tilePositionY -= es * 0.2;
    if (this.chromAbTimer > 0) {
      this.chromAbTimer -= delta;
      if (this.chromAbTimer <= 0 && this.chromAbGfx) { this.chromAbGfx.setAlpha(0); this.chromAbGfx.clear(); }
      else if (this.chromAbGfx) this.chromAbGfx.setAlpha(this.chromAbTimer / 350);
    }

    this.trailTimer -= delta;
    if (this.trailTimer <= 0 && !this.sliding) {
      this.trailTimer = 50;
      const trail = this.add.image(this.runner.x, this.runner.y, "runner")
        .setAlpha(0.22).setTint(this.phaseColor1).setDepth(8).setBlendMode("ADD");
      this.trailImages.push(trail);
      this.tweens.add({ targets: trail, alpha: 0, scaleX: 0.75, scaleY: 0.75, duration: 340, onComplete: () => {
        trail.destroy();
        this.trailImages = this.trailImages.filter(t => t !== trail);
      }});
      if (this.trailImages.length > 7) {
        const old = this.trailImages.shift();
        if (old) old.destroy();
      }
    }

    this.gTiles.forEach((gt) => { gt.tilePositionY -= es * 0.5; });

    this.wingL.x = this.runner.x - 34;
    this.wingR.x = this.runner.x + 34;
    this.wingL.y = this.runner.y - 26;
    this.wingR.y = this.runner.y - 26;

    this.beeShadow.x = this.runner.x;
    const sd = Math.max(0, GROUND_Y - this.runner.y);
    this.beeShadow.setScale(Math.max(0.5, 2.4 - sd * 0.01)).setAlpha(Math.max(0.04, 0.2 - sd * 0.002));

    if (this.shieldVis) { this.shieldVis.x = this.runner.x; this.shieldVis.y = this.runner.y; }
    if (this.dashVis) { this.dashVis.x = this.runner.x; this.dashVis.y = this.runner.y; }

    const body = this.runner.body as Phaser.Physics.Arcade.Body;
    if (!this.sliding && body.y + body.height > GROUND_Y) {
      body.y = GROUND_Y - body.height;
      body.setVelocityY(0);
    }

    if (es > 6.5 && this.fc % 2 === 0) {
      const sl = this.add.image(Phaser.Math.Between(10, W - 10), -12, "speed_line")
        .setAlpha(0.1 + (es - 6.5) * 0.04).setScale(1.2, 1.4 + es * 0.22).setDepth(2).setTint(this.phaseColor1);
      this.tweens.add({ targets: sl, y: H + 28, alpha: 0, duration: 240 + Phaser.Math.Between(0, 140), onComplete: () => sl.destroy() });
    }

    if (this.combo >= 10 && this.fc % 3 === 0) {
      const sl2 = this.add.image(Phaser.Math.Between(5, W - 5), -6, "speed_line")
        .setAlpha(0.18).setScale(1.6, 2.4 + es * 0.18).setDepth(2).setTint(this.phaseColor2);
      this.tweens.add({ targets: sl2, y: H + 28, alpha: 0, duration: 200, onComplete: () => sl2.destroy() });
    }

    this.obsGroup.getChildren().forEach((o) => {
      const s = o as Phaser.Physics.Arcade.Sprite;
      s.y += es * (delta / 16) * 2;
      if (s.texture.key === "wave_beam") {
        s.x = CX + Math.sin(s.y * 0.02 + this.fc * 0.05) * 50;
      }
      if (s.y > H + 120) s.destroy();
    });
    this.coinGroup.getChildren().forEach((o) => {
      const c = o as Phaser.Physics.Arcade.Sprite;
      c.y += es * (delta / 16) * 2;
      if (c.y > H + 60) c.destroy();
      if (this.pu.magnet) {
        const dx = this.runner.x - c.x, dy = this.runner.y - c.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 180 && d > 5) { c.x += (dx / d) * 9; c.y += (dy / d) * 9; }
      }
    });
    this.puGroup.getChildren().forEach((o) => {
      const p = o as Phaser.Physics.Arcade.Sprite;
      p.y += es * (delta / 16) * 2;
      if (p.y > H + 60) p.destroy();
    });

    const coinDisplay = this.score > 1000 ? `${(this.score / 1000).toFixed(1)}K` : this.score.toString();
    this.coinTxt.setText(coinDisplay);
    this.scoreTxt.setText(`SCORE: ${this.score.toLocaleString()}`);
    this.timerTxt.setText(`${this.gameTimer.toFixed(1)}s`);

    const comboDisplay = Math.max(1, Math.floor(this.combo));
    this.comboTxt.setText(`${comboDisplay}x COMBO`);
    if (comboDisplay >= 10) {
      this.comboTxt.setColor("#ff7800");
    } else if (comboDisplay >= 5) {
      this.comboTxt.setColor("#ffd050");
    } else {
      this.comboTxt.setColor("#ffe070");
    }
  }
}

class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: "GameOver" }); }
  create(data: { score: number; coins: number; distance: number; bestScore: number; isNewBest: boolean; speed: number; maxCombo: number; sessionDuration?: number }) {
    window.dispatchEvent(new CustomEvent("honeyrunner:gameover", {
      detail: { score: data.score, coins: data.coins, distance: data.distance, maxCombo: data.maxCombo, duration: data.sessionDuration || 0 },
    }));

    this.add.tileSprite(0, 0, W, H, "bg_tunnel").setOrigin(0, 0);
    this.add.image(CX, H / 2, "stars").setAlpha(0.4);
    this.add.rectangle(CX, H / 2, W, H, 0x000000, 0.4);
    this.add.image(CX, H / 2, "noise_overlay").setAlpha(0.06);

    const tg = this.add.text(CX, 52, "GAME OVER", {
      fontSize: "52px", fontFamily: FONT_DISPLAY, color: "#ff3858", fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0.08);
    this.tweens.add({ targets: tg, alpha: 0.2, duration: 2000, yoyo: true, repeat: -1 });

    const tg2 = this.add.text(CX, 52, "GAME OVER", {
      fontSize: "51px", fontFamily: FONT_DISPLAY, color: "#ff7800", fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0.04);
    this.tweens.add({ targets: tg2, alpha: 0.12, scaleX: 1.03, duration: 2500, yoyo: true, repeat: -1 });

    this.add.text(CX, 52, "GAME OVER", {
      fontSize: "50px", fontFamily: FONT_DISPLAY, color: "#ff3858",
      fontStyle: "bold", stroke: "#020204", strokeThickness: 10,
    }).setOrigin(0.5);

    if (data.isNewBest) {
      const nb = this.add.text(CX, 98, "NEW BEST!", {
        fontSize: "26px", fontFamily: FONT_DISPLAY, color: "#ffd050",
        fontStyle: "bold", stroke: "#020204", strokeThickness: 6,
      }).setOrigin(0.5);
      this.tweens.add({ targets: nb, scaleX: 1.06, scaleY: 1.06, duration: 600, yoyo: true, repeat: -1 });
    }

    const beeGlow = this.add.image(CX, 148, "bloom_circle").setScale(1.8).setAlpha(0.1).setTint(C.amber);
    this.tweens.add({ targets: beeGlow, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 2200, repeat: -1 });
    const bee = this.add.image(CX, 148, "runner").setScale(2.2);
    this.tweens.add({ targets: bee, y: 142, duration: 1500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const panelGfx = this.add.graphics();
    const panelY = 192;
    const panelW = 360;
    const panelH = 320;
    drawGlassPanel(panelGfx, CX - panelW / 2, panelY, panelW, panelH, 18, 0.7);

    const stats = [
      { l: "SCORE", v: data.score.toLocaleString(), c: "#f0a500" },
      { l: "HONEY", v: data.coins.toString(), c: "#ffd050" },
      { l: "DISTANCE", v: `${data.distance.toLocaleString()}m`, c: "#ff7800" },
      { l: "MAX COMBO", v: `${data.maxCombo}x`, c: "#50ff30" },
      { l: "TOP SPEED", v: `${data.speed.toFixed(1)}x`, c: "#ff7800" },
      { l: "BEST", v: data.bestScore.toLocaleString(), c: "#ffd050" },
    ];
    stats.forEach((s, i) => {
      const y = panelY + 22 + i * 48;
      const rowGfx = this.add.graphics();
      rowGfx.fillStyle(0x000000, 0.4);
      rowGfx.fillRoundedRect(CX - panelW / 2 + 16, y, panelW - 32, 40, 10);
      rowGfx.lineStyle(1, C.glassBorder, 0.25);
      rowGfx.strokeRoundedRect(CX - panelW / 2 + 16, y, panelW - 32, 40, 10);

      this.add.text(CX - panelW / 2 + 32, y + 12, s.l, {
        fontSize: "11px", fontFamily: FONT_UI, color: "#607898",
        letterSpacing: 1,
      });
      const val = this.add.text(CX + panelW / 2 - 32, y + 20, s.v, {
        fontSize: "22px", fontFamily: FONT_MONO, color: s.c, fontStyle: "bold", stroke: "#000", strokeThickness: 4,
      }).setOrigin(1, 0.5).setAlpha(0).setScale(0.7);
      this.tweens.add({ targets: val, alpha: 1, scaleX: 1, scaleY: 1, duration: 400, delay: 200 + i * 110, ease: "Back.easeOut" });
    });

    const btnY = panelY + panelH + 30;
    const btnGlow = this.add.image(CX, btnY, "bloom_circle").setScale(5, 1.2).setAlpha(0.06).setTint(C.amber);
    this.tweens.add({ targets: btnGlow, scaleX: 6, scaleY: 1.5, alpha: 0, duration: 2000, repeat: -1 });

    const retry = this.add.image(CX, btnY, "btn_play").setInteractive({ useHandCursor: true });
    this.add.text(CX, btnY, "PLAY AGAIN", {
      fontSize: "20px", fontFamily: FONT_DISPLAY, color: "#f0a500", fontStyle: "bold",
    }).setOrigin(0.5);
    retry.on("pointerdown", () => { sfxMenuClick(); this.scene.start("Game"); });
    this.tweens.add({ targets: retry, scaleX: 1.04, scaleY: 1.04, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const menu = this.add.image(CX, btnY + 64, "btn_menu").setInteractive({ useHandCursor: true });
    this.add.text(CX, btnY + 64, "MENU", {
      fontSize: "16px", fontFamily: FONT_DISPLAY, color: "#ff7800",
    }).setOrigin(0.5);
    menu.on("pointerdown", () => { sfxMenuClick(); this.scene.start("Menu"); });

    this.input.keyboard?.once("keydown-SPACE", () => this.scene.start("Game"));
    this.input.keyboard?.once("keydown-ENTER", () => this.scene.start("Game"));

    this.add.image(CX, H / 2, "scanlines").setAlpha(0.05);
    this.add.image(CX, H / 2, "vignette").setAlpha(0.65);
  }
}

export function createHoneyRunnerGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent,
    backgroundColor: "#020204",
    physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, MenuScene, GameScene, GameOverScene],
    input: { activePointers: 3 },
    render: { pixelArt: false, antialias: true },
  });
}
