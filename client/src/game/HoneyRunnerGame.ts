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
} from "./constants";
import { getBestScore, setBestScore, addCoins, incrementRuns } from "./storage";

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

const VX = CX;
const VY = H * 0.15;

class BootScene extends Phaser.Scene {
  constructor() { super({ key: "Boot" }); }
  create() {
    const g = this.make.graphics({ x: 0, y: 0 });
    this.genBg(g);
    this.genStars(g);
    this.genScanlines(g);
    this.genVignette(g);
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
    g.destroy();
    this.scene.start("Menu");
  }

  private genBg(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(0x000004, 1);
    g.fillRect(0, 0, W, H);
    g.fillGradientStyle(0x0a001a, 0x0a001a, 0x000004, 0x000004, 0.6);
    g.fillRect(0, 0, W, H * 0.6);

    for (let i = 12; i >= 0; i--) {
      const rad = 8 + i * 18;
      const a = 0.35 - i * 0.025;
      if (a <= 0) continue;
      const col = lerpColor(0xffffff, 0xff2060, Math.min(1, i / 6));
      g.fillStyle(col, a);
      g.fillCircle(VX, VY, rad);
    }
    g.fillStyle(0xff4080, 0.08);
    g.fillCircle(VX, VY, 120);
    g.fillStyle(0xff2060, 0.04);
    g.fillCircle(VX, VY, 200);

    const S = 60;
    for (let i = 0; i < S; i++) {
      const angle = (TAU / S) * i;
      const spread = 0.015 + Math.random() * 0.025;
      const len = 200 + Math.random() * 650;
      const x1 = VX + Math.cos(angle - spread) * len;
      const y1 = VY + Math.sin(angle - spread) * len;
      const x2 = VX + Math.cos(angle + spread) * len;
      const y2 = VY + Math.sin(angle + spread) * len;
      const cols = [0x00e5ff, 0xff0090, 0xff1040, 0x8040ff, 0x00e5ff, 0xff0090];
      g.fillStyle(cols[i % cols.length], 0.06 + Math.random() * 0.09);
      g.beginPath(); g.moveTo(VX, VY); g.lineTo(x1, y1); g.lineTo(x2, y2); g.closePath(); g.fillPath();
    }

    for (let i = 0; i < 36; i++) {
      const angle = (TAU / 36) * i;
      const len = 300 + Math.random() * 550;
      const col = i % 3 === 0 ? C.magenta : i % 3 === 1 ? C.cyan : 0x8040ff;
      g.lineStyle(1 + Math.random() * 2, col, 0.12 + Math.random() * 0.15);
      g.lineBetween(VX, VY, VX + Math.cos(angle) * len, VY + Math.sin(angle) * len);
    }

    const rings = 16;
    for (let i = rings; i >= 0; i--) {
      const t = i / rings;
      const baseR = 12 + t * (W * 0.9);
      const cy = VY + t * (H * 0.58);
      const rr = baseR * (0.5 + t * 0.5);
      fillHex(g, VX, cy, rr, 0x000008, 0.08 + t * 0.15);
      const ea = 0.3 + t * 0.7;
      const ew = 1 + t * 3.5;
      strokeHex(g, VX, cy, rr, C.cyan, ea, ew);
      if (t > 0.15) strokeHex(g, VX, cy, rr + 2, C.cyanBright, ea * 0.2, ew + 4);
      if (t > 0.3) strokeHex(g, VX, cy, rr, C.magenta, ea * 0.25, ew * 0.4);
      if (t > 0.4) {
        const pts = hexVerts(VX, cy, rr);
        for (let j = 0; j < 6; j++) {
          g.fillStyle(C.cyanBright, 0.3 + t * 0.4);
          g.fillCircle(pts[j][0], pts[j][1], 1.5 + t * 4);
        }
      }
    }

    const laserY = VY + H * 0.26;
    g.lineStyle(5, C.laserRed, 0.8);
    g.lineBetween(0, laserY, W, laserY);
    g.lineStyle(12, C.laserRedGlow, 0.2);
    g.lineBetween(0, laserY, W, laserY);
    g.lineStyle(28, C.laserRedGlow, 0.04);
    g.lineBetween(0, laserY, W, laserY);
    for (let px = 0; px < W; px += 5) {
      g.fillStyle(C.laserRed, 0.3 + Math.random() * 0.5);
      g.fillRect(px, laserY - 2, 3, 4);
    }

    g.generateTexture("bg_tunnel", W, H);
    g.clear();
  }

  private genStars(g: Phaser.GameObjects.Graphics) {
    g.clear();
    for (let i = 0; i < 350; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      const s = 0.4 + Math.random() * 1.8;
      const b = Math.random();
      if (b > 0.88) {
        g.fillStyle(C.cyan, 0.7 + Math.random() * 0.3);
        g.fillCircle(x, y, s + 1);
        g.fillStyle(C.cyanWhite, 0.25);
        g.fillCircle(x, y, s + 5);
      } else if (b > 0.76) {
        g.fillStyle(C.magentaBright, 0.6 + Math.random() * 0.4);
        g.fillCircle(x, y, s + 0.5);
        g.fillStyle(C.magenta, 0.12);
        g.fillCircle(x, y, s + 4);
      } else if (b > 0.66) {
        g.fillStyle(0x8060ff, 0.4 + Math.random() * 0.3);
        g.fillCircle(x, y, s * 0.8);
      } else {
        g.fillStyle(C.white, 0.15 + Math.random() * 0.25);
        g.fillCircle(x, y, s * 0.4);
      }
    }
    g.generateTexture("stars", W, H);
    g.clear();
  }

  private genScanlines(g: Phaser.GameObjects.Graphics) {
    g.clear();
    for (let y = 0; y < H; y += 2) {
      g.fillStyle(0x000000, y % 4 === 0 ? 0.07 : 0.035);
      g.fillRect(0, y, W, 1);
    }
    g.generateTexture("scanlines", W, H);
    g.clear();
  }

  private genVignette(g: Phaser.GameObjects.Graphics) {
    g.clear();
    for (let i = 0; i < 20; i++) {
      const t = i / 20;
      g.fillStyle(0x000000, (1 - t) * (1 - t) * 0.1);
      g.fillEllipse(CX, H / 2, W * (0.35 + t * 0.65), H * (0.35 + t * 0.65));
    }
    g.fillStyle(0x000000, 0.6);
    g.fillRect(0, 0, W, 10);
    g.fillRect(0, H - 10, W, 10);
    g.fillStyle(0x000000, 0.45);
    g.fillRect(0, 0, 5, H);
    g.fillRect(W - 5, 0, 5, H);
    g.generateTexture("vignette", W, H);
    g.clear();
  }

  private genCyberBee(g: Phaser.GameObjects.Graphics) {
    const bw = 80, bh = 100;
    const cx = bw / 2;
    g.clear();

    g.lineStyle(1.8, 0x1a1008, 0.9);
    g.beginPath(); g.moveTo(cx - 4, 10); g.lineTo(cx - 10, -2); g.lineTo(cx - 13, -8); g.strokePath();
    g.beginPath(); g.moveTo(cx + 4, 10); g.lineTo(cx + 10, -2); g.lineTo(cx + 13, -8); g.strokePath();
    g.lineStyle(0.8, 0x302010, 0.5);
    g.beginPath(); g.moveTo(cx - 13, -8); g.lineTo(cx - 15, -12); g.strokePath();
    g.beginPath(); g.moveTo(cx + 13, -8); g.lineTo(cx + 15, -12); g.strokePath();
    g.fillStyle(0x2a1a08, 0.9);
    g.fillCircle(cx - 15, -12, 2);
    g.fillCircle(cx + 15, -12, 2);

    g.fillStyle(0x1a1008, 1);
    g.fillEllipse(cx, 18, 28, 22);
    g.fillStyle(0x2a1a0a, 0.5);
    g.fillEllipse(cx - 2, 15, 14, 12);
    for (let i = 0; i < 30; i++) {
      const fx = cx + (Math.random() - 0.5) * 26;
      const fy = 18 + (Math.random() - 0.5) * 20;
      g.fillStyle(0x302010, 0.15 + Math.random() * 0.15);
      g.fillCircle(fx, fy, 0.6 + Math.random() * 1.2);
    }

    g.fillStyle(0x0a0400, 1);
    g.fillEllipse(cx - 8, 14, 10, 9);
    g.fillEllipse(cx + 8, 14, 10, 9);
    g.fillStyle(0x201808, 0.9);
    g.fillEllipse(cx - 8, 13, 8, 7);
    g.fillEllipse(cx + 8, 13, 8, 7);
    g.fillStyle(0x3a2810, 0.5);
    g.fillEllipse(cx - 9, 12, 4, 3.5);
    g.fillEllipse(cx + 7, 12, 4, 3.5);
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(cx - 9, 11, 1.5);
    g.fillCircle(cx + 7, 11, 1.5);

    g.fillStyle(0x1a1008, 1);
    g.fillEllipse(cx, 16, 6, 4);

    g.lineStyle(1.2, 0x1a1008, 0.8);
    g.lineBetween(cx - 8, 28, cx - 10, 34);
    g.lineBetween(cx - 10, 34, cx - 14, 38);
    g.lineBetween(cx + 8, 28, cx + 10, 34);
    g.lineBetween(cx + 10, 34, cx + 14, 38);
    g.lineBetween(cx - 12, 26, cx - 16, 32);
    g.lineBetween(cx - 16, 32, cx - 20, 37);
    g.lineBetween(cx + 12, 26, cx + 16, 32);
    g.lineBetween(cx + 16, 32, cx + 20, 37);
    g.lineBetween(cx - 10, 36, cx - 12, 42);
    g.lineBetween(cx + 10, 36, cx + 12, 42);

    g.fillStyle(0x302010, 1);
    g.fillEllipse(cx, 34, 26, 18);
    g.fillStyle(0x3a2814, 0.6);
    g.fillEllipse(cx - 2, 32, 14, 10);
    for (let i = 0; i < 40; i++) {
      const fx = cx + (Math.random() - 0.5) * 24;
      const fy = 34 + (Math.random() - 0.5) * 16;
      g.fillStyle(0x4a3820, 0.12 + Math.random() * 0.15);
      g.fillCircle(fx, fy, 0.5 + Math.random() * 1.2);
    }

    g.fillStyle(0x1a1008, 1);
    g.fillEllipse(cx, 64, 34, 40);
    g.fillStyle(0x201408, 0.4);
    g.fillEllipse(cx - 4, 56, 16, 20);

    const stripes = [48, 54, 60, 66, 72, 78];
    for (let i = 0; i < stripes.length; i++) {
      const sw = 14 - Math.abs(i - 2.5) * 2;
      g.fillStyle(0xd4940a, 1);
      g.fillEllipse(cx, stripes[i], sw * 2, 4);
      g.fillStyle(0xe8a820, 0.7);
      g.fillEllipse(cx - 1, stripes[i] - 0.5, sw * 1.3, 2.5);
      g.fillStyle(0xc88808, 0.4);
      g.fillEllipse(cx + 2, stripes[i] + 1, sw * 0.8, 1.5);
    }

    for (let i = 0; i < 60; i++) {
      const fx = cx + (Math.random() - 0.5) * 32;
      const fy = 48 + (Math.random() - 0.5) * 38;
      const dist = Math.sqrt((fx - cx) ** 2 + ((fy - 64) * 0.85) ** 2);
      if (dist > 16) continue;
      g.fillStyle(i % 3 === 0 ? 0x5a4828 : 0x3a2818, 0.1 + Math.random() * 0.15);
      g.fillCircle(fx, fy, 0.4 + Math.random() * 1);
    }

    g.lineStyle(1, 0x100a04, 0.4);
    g.strokeEllipse(cx, 64, 34, 40);

    g.fillStyle(0x1a1008, 1);
    g.beginPath(); g.moveTo(cx, 86); g.lineTo(cx - 4, 82); g.lineTo(cx + 4, 82); g.closePath(); g.fillPath();
    g.fillStyle(0x0a0400, 1);
    g.beginPath(); g.moveTo(cx, 92); g.lineTo(cx - 2, 86); g.lineTo(cx + 2, 86); g.closePath(); g.fillPath();
    g.fillStyle(0x201408, 0.6);
    g.fillRect(cx - 0.5, 86, 1, 6);

    g.generateTexture("runner", bw, bh);
    g.clear();
  }

  private genCyberBeeSlide(g: Phaser.GameObjects.Graphics) {
    const sw = 74, sh = 32;
    g.clear();
    g.fillStyle(0x1a1008, 1);
    g.fillEllipse(14, sh / 2, 18, 16);
    for (let i = 0; i < 12; i++) {
      g.fillStyle(0x302010, 0.15 + Math.random() * 0.1);
      g.fillCircle(14 + (Math.random() - 0.5) * 16, sh / 2 + (Math.random() - 0.5) * 14, 0.5 + Math.random() * 0.8);
    }
    g.fillStyle(0x0a0400, 1);
    g.fillCircle(10, sh / 2 - 3, 3.5);
    g.fillCircle(18, sh / 2 - 3, 3.5);
    g.fillStyle(0x201808, 0.8);
    g.fillCircle(10, sh / 2 - 3.5, 2.5);
    g.fillCircle(18, sh / 2 - 3.5, 2.5);
    g.fillStyle(0x302010, 1);
    g.fillEllipse(30, sh / 2, 18, 14);
    g.fillStyle(0x1a1008, 1);
    g.fillEllipse(sw / 2 + 6, sh / 2, 36, 22);
    const sx = [32, 39, 46, 53];
    for (const x of sx) {
      g.fillStyle(0xd4940a, 0.95);
      g.fillRect(x, sh / 2 - 9, 4, 18);
      g.fillStyle(0xe8a820, 0.5);
      g.fillRect(x, sh / 2 - 7, 3, 12);
    }
    for (let i = 0; i < 20; i++) {
      const fx = sw / 2 + 6 + (Math.random() - 0.5) * 34;
      const fy = sh / 2 + (Math.random() - 0.5) * 20;
      g.fillStyle(0x3a2818, 0.1 + Math.random() * 0.1);
      g.fillCircle(fx, fy, 0.4 + Math.random() * 0.8);
    }
    g.lineStyle(0.8, 0x100a04, 0.35);
    g.strokeEllipse(sw / 2 + 6, sh / 2, 36, 22);
    g.generateTexture("runner_slide", sw, sh);
    g.clear();
  }

  private genBeeShadow(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(C.black, 0.15);
    g.fillEllipse(30, 8, 56, 16);
    g.fillStyle(C.cyan, 0.03);
    g.fillEllipse(30, 8, 64, 20);
    g.generateTexture("bee_shadow", 60, 16);
    g.clear();
  }

  private genWings(g: Phaser.GameObjects.Graphics) {
    const ww = 50, wh = 60;

    const drawWing = (flipX: boolean) => {
      g.clear();
      const ox = flipX ? -1 : 1;

      g.fillStyle(0xd8e8f0, 0.18);
      g.fillEllipse(ww / 2, wh / 2, ww - 2, wh - 2);

      g.fillStyle(0xffffff, 0.08);
      g.fillEllipse(ww / 2 - ox * 4, wh / 2 - 8, ww * 0.5, wh * 0.35);

      g.fillStyle(0xc8d8e8, 0.06);
      g.fillEllipse(ww / 2 + ox * 2, wh / 2 + 8, ww * 0.6, wh * 0.35);

      g.lineStyle(0.8, 0x302010, 0.35);
      g.lineBetween(ww / 2 - ox * 2, 4, ww / 2, wh - 5);
      g.lineBetween(ww / 2 - ox * 8, 8, ww / 2 + ox * 10, wh * 0.7);
      g.lineBetween(4, wh * 0.25, ww - 4, wh * 0.3);
      g.lineBetween(6, wh * 0.5, ww - 6, wh * 0.45);
      g.lineBetween(8, wh * 0.7, ww - 8, wh * 0.65);

      g.lineStyle(0.5, 0x403020, 0.2);
      g.lineBetween(ww * 0.15, wh * 0.15, ww * 0.4, wh * 0.55);
      g.lineBetween(ww * 0.6, wh * 0.1, ww * 0.7, wh * 0.5);
      g.lineBetween(ww * 0.3, wh * 0.4, ww * 0.8, wh * 0.55);

      g.fillStyle(0xe8d8c0, 0.06);
      for (let i = 0; i < 8; i++) {
        const px = ww * 0.2 + Math.random() * ww * 0.6;
        const py = wh * 0.15 + Math.random() * wh * 0.7;
        g.fillCircle(px, py, 2 + Math.random() * 4);
      }

      g.lineStyle(1.5, 0x806840, 0.25);
      g.strokeEllipse(ww / 2, wh / 2, ww - 2, wh - 2);
      g.lineStyle(4, 0xffffff, 0.04);
      g.strokeEllipse(ww / 2, wh / 2, ww + 4, wh + 4);
    };

    drawWing(false);
    g.generateTexture("wing_l", ww, wh);
    g.clear();
    drawWing(true);
    g.generateTexture("wing_r", ww, wh);
    g.clear();
  }

  private genObstacles(g: Phaser.GameObjects.Graphics) {
    const bw = 80, bh = 54;
    g.clear();

    g.fillStyle(C.laserRedGlow, 0.05);
    g.fillRoundedRect(-4, -4, bw + 8, bh + 8, 6);
    g.fillStyle(0x08000a, 0.95);
    g.fillRoundedRect(0, 0, bw, bh, 4);

    for (let ly = 4; ly < bh; ly += 5) {
      g.lineStyle(2.5, C.laserRed, 0.6);
      g.lineBetween(5, ly, bw - 5, ly);
      g.lineStyle(6, C.laserRedGlow, 0.06);
      g.lineBetween(5, ly, bw - 5, ly);
    }
    for (let lx = 10; lx < bw; lx += 10) {
      g.lineStyle(1, C.laserRed, 0.3);
      g.lineBetween(lx, 3, lx, bh - 3);
    }

    g.lineStyle(3, C.laserRed, 0.95);
    g.strokeRoundedRect(1, 1, bw - 2, bh - 2, 4);
    g.lineStyle(7, C.laserRedGlow, 0.12);
    g.strokeRoundedRect(0, 0, bw, bh, 5);

    const corners = [[6, 6], [bw - 6, 6], [6, bh - 6], [bw - 6, bh - 6]];
    for (const [cx, cy] of corners) {
      g.fillStyle(C.laserRedWhite, 0.9);
      g.fillCircle(cx, cy, 3.5);
      g.fillStyle(C.laserRedBright, 0.2);
      g.fillCircle(cx, cy, 8);
    }
    g.generateTexture("barrier", bw, bh);
    g.clear();

    g.fillStyle(0x08000a, 0.9);
    g.fillRoundedRect(0, 0, bw, 18, 3);
    g.lineStyle(3.5, C.laserRed, 0.85);
    g.lineBetween(0, 9, bw, 9);
    g.lineStyle(10, C.laserRedGlow, 0.1);
    g.lineBetween(0, 9, bw, 9);
    g.lineStyle(1.5, C.laserRed, 0.35);
    g.lineBetween(0, 3, bw, 3);
    g.lineBetween(0, 15, bw, 15);
    for (const cx of [4, bw - 4]) {
      g.fillStyle(C.laserRedWhite, 1);
      g.fillCircle(cx, 9, 4.5);
      g.fillStyle(C.laserRedGlow, 0.15);
      g.fillCircle(cx, 9, 9);
    }
    g.generateTexture("low_gate", bw, 18);
    g.clear();

    const gw = 80, gh = 54;
    g.fillStyle(0x060008, 0.85);
    g.fillRoundedRect(0, 0, gw, gh, 4);
    for (let i = 0; i < 10; i++) {
      const ox = Phaser.Math.Between(4, gw - 12);
      const oy = Phaser.Math.Between(4, gh - 8);
      const ow = Phaser.Math.Between(6, 22);
      const oh = Phaser.Math.Between(3, 10);
      g.fillStyle(C.glitchPurple, 0.3 + Math.random() * 0.4);
      g.fillRect(ox, oy, ow, oh);
    }
    for (let i = 0; i < 5; i++) {
      const gy = Phaser.Math.Between(2, gh - 2);
      g.lineStyle(1 + Math.random() * 2.5, C.glitchBlue, 0.4 + Math.random() * 0.4);
      g.lineBetween(0, gy, gw, gy);
    }
    g.lineStyle(2.5, C.glitchPurple, 0.75);
    g.strokeRoundedRect(1, 1, gw - 2, gh - 2, 4);
    g.lineStyle(6, C.glitchPurple, 0.08);
    g.strokeRoundedRect(0, 0, gw, gh, 5);
    g.generateTexture("glitch_wall", gw, gh);
    g.clear();

    g.fillStyle(0x08000a, 0.95);
    g.fillRoundedRect(0, 0, 30, 84, 4);
    g.lineStyle(2.5, C.laserRed, 0.8);
    g.strokeRoundedRect(1, 1, 28, 82, 4);
    g.lineStyle(1, C.laserRed, 0.4);
    g.lineBetween(15, 3, 15, 81);
    for (const cy of [8, 76]) {
      g.fillStyle(C.laserRedWhite, 0.85);
      g.fillCircle(15, cy, 4);
      g.fillStyle(C.laserRedGlow, 0.12);
      g.fillCircle(15, cy, 8);
    }
    g.generateTexture("lane_blocker", 30, 84);
    g.clear();
  }

  private genCoin(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const s = 14, pad = 5, cs = s + pad;
    g.fillStyle(C.coinGlow, 0.06);
    g.fillCircle(cs, cs, s + 8);
    fillHex(g, cs, cs, s, C.coinBody, 1);
    fillHex(g, cs, cs, s - 1.5, C.coinLight, 0.3);
    fillHex(g, cs, cs, s - 3, C.coinBody, 0.25);
    g.fillStyle(C.coinShine, 0.15);
    g.fillEllipse(cs - 3, cs - 3, 6, 10);
    strokeHex(g, cs, cs, s, C.coinShine, 0.7, 2);
    strokeHex(g, cs, cs, s + 2, C.coinGlow, 0.15, 3);
    fillHex(g, cs, cs, 5, C.coinGlow, 0.5);
    strokeHex(g, cs, cs, 5, C.coinShine, 0.4, 1);
    g.generateTexture("coin", cs * 2, cs * 2);
    g.clear();
  }

  private genPowerups(g: Phaser.GameObjects.Graphics) {
    const s = 18;
    g.clear();

    const drawBase = (col: number, colB: number) => {
      g.fillStyle(col, 0.04);
      g.fillCircle(s, s, s + 4);
      g.fillStyle(0x06000a, 0.95);
      g.fillRoundedRect(0, 0, s * 2, s * 2, 8);
      g.lineStyle(2.5, col, 0.85);
      g.strokeRoundedRect(0, 0, s * 2, s * 2, 8);
      g.lineStyle(5, colB, 0.08);
      g.strokeRoundedRect(-1, -1, s * 2 + 2, s * 2 + 2, 9);
    };

    drawBase(C.magnetBlue, C.magnetBright);
    g.lineStyle(3, C.magnetBlue, 0.8);
    g.beginPath(); g.arc(s, s - 2, 7, PI, 0, false); g.strokePath();
    g.fillStyle(C.magnetBlue, 1);
    g.fillRect(s - 7, s - 2, 4, 13);
    g.fillRect(s + 3, s - 2, 4, 13);
    g.fillStyle(C.laserRed, 0.9);
    g.fillRect(s - 7, s + 7, 4, 4);
    g.fillStyle(C.cyan, 0.9);
    g.fillRect(s + 3, s + 7, 4, 4);
    g.generateTexture("magnet", s * 2, s * 2);
    g.clear();

    drawBase(C.shieldGreen, C.shieldBright);
    g.lineStyle(3, C.shieldGreen, 0.8);
    g.beginPath();
    g.moveTo(s, 4); g.lineTo(s + 9, 9); g.lineTo(s + 9, 20);
    g.lineTo(s, 28); g.lineTo(s - 9, 20); g.lineTo(s - 9, 9);
    g.closePath(); g.strokePath();
    g.fillStyle(C.shieldGreen, 0.15);
    g.beginPath();
    g.moveTo(s, 4); g.lineTo(s + 9, 9); g.lineTo(s + 9, 20);
    g.lineTo(s, 28); g.lineTo(s - 9, 20); g.lineTo(s - 9, 9);
    g.closePath(); g.fillPath();
    g.generateTexture("shield_pu", s * 2, s * 2);
    g.clear();

    drawBase(C.boostOrange, C.boostBright);
    g.fillStyle(C.boostOrange, 1);
    g.fillTriangle(s - 5, s + 8, s + 1, s - 10, s + 3, s + 2);
    g.fillStyle(C.boostBright, 1);
    g.fillTriangle(s - 3, s + 2, s + 5, s + 2, s + 1, s + 10);
    g.generateTexture("boost_pu", s * 2, s * 2);
    g.clear();
  }

  private genGround(g: Phaser.GameObjects.Graphics) {
    const tW = LANE_WIDTH * 3 + 20;
    g.clear();
    g.fillStyle(0x04000c, 0.9);
    g.fillRect(0, 0, tW, 28);

    for (let i = 0; i < tW; i += 4) {
      g.fillStyle(C.cyan, (i % 8 === 0) ? 0.06 : 0.02);
      g.fillRect(i, 0, 1, 28);
    }

    g.lineStyle(3.5, C.cyan, 0.85);
    g.lineBetween(0, 0, tW, 0);
    g.lineStyle(10, C.cyanBright, 0.12);
    g.lineBetween(0, 0, tW, 0);
    g.lineStyle(22, C.cyan, 0.03);
    g.lineBetween(0, 0, tW, 0);
    g.lineStyle(2, C.magenta, 0.2);
    g.lineBetween(0, 27, tW, 27);

    for (let i = 1; i < 3; i++) {
      const lx = i * LANE_WIDTH + 10;
      g.lineStyle(1, C.cyan, 0.2);
      g.lineBetween(lx, 0, lx, 28);
    }
    g.generateTexture("ground_tile", tW, 28);
    g.clear();
  }

  private genParticles(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(C.amberHot, 0.9);
    g.fillCircle(6, 6, 5);
    g.fillStyle(C.amberWhite, 0.4);
    g.fillCircle(5, 5, 2.5);
    g.generateTexture("particle_amber", 12, 12);
    g.clear();

    g.fillStyle(C.cyan, 0.85);
    g.fillCircle(5, 5, 4);
    g.fillStyle(C.cyanBright, 0.4);
    g.fillCircle(4, 4, 2);
    g.generateTexture("particle_cyan", 10, 10);
    g.clear();

    g.fillStyle(C.white, 0.5);
    g.fillRect(0, 0, 2, 18);
    g.fillStyle(C.cyan, 0.3);
    g.fillRect(0, 0, 2, 18);
    g.generateTexture("speed_line", 2, 18);
    g.clear();

    g.fillStyle(C.amberHot, 0.75);
    g.fillRect(0, 0, 3, 3);
    g.generateTexture("spark", 3, 3);
    g.clear();

    fillHex(g, 6, 6, 5, C.coinBody, 0.6);
    strokeHex(g, 6, 6, 5, C.coinShine, 0.4, 0.8);
    g.generateTexture("hex_dust", 12, 12);
    g.clear();

    g.fillStyle(C.magenta, 0.75);
    g.fillCircle(4, 4, 3);
    g.fillStyle(C.magentaBright, 0.3);
    g.fillCircle(3, 3, 1.5);
    g.generateTexture("particle_magenta", 8, 8);
    g.clear();

    g.fillStyle(C.white, 0.6);
    g.fillRect(0, 0, 2, 2);
    g.generateTexture("particle_white", 2, 2);
    g.clear();
  }

  private genDashIcon(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const s = 30;

    g.lineStyle(2, C.cyan, 0.15);
    g.strokeCircle(s, s, s - 2);
    g.lineStyle(3, C.cyan, 0.5);
    g.beginPath(); g.arc(s, s, s - 2, -PI / 2, PI, false); g.strokePath();
    g.fillStyle(C.cyanBright, 0.08);
    g.fillCircle(s, s, s - 6);
    g.generateTexture("dash_icon_bg", s * 2, s * 2);
    g.clear();

    g.lineStyle(3.5, C.cyan, 0.9);
    g.strokeCircle(s, s, s - 2);
    g.lineStyle(7, C.cyanBright, 0.12);
    g.strokeCircle(s, s, s);
    g.fillStyle(C.cyanBright, 0.2);
    g.fillCircle(s, s, s - 6);
    g.fillStyle(C.cyan, 0.55);
    g.fillTriangle(s - 5, s - 8, s + 8, s, s - 5, s + 8);
    g.fillStyle(C.white, 0.2);
    g.fillTriangle(s - 3, s - 5, s + 5, s, s - 3, s + 5);
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
    g.fillStyle(C.coinShine, 0.35);
    g.fillCircle(10, 10, 3);
    g.fillStyle(C.coinGlow, 0.1);
    g.fillCircle(12, 14, 16);
    g.generateTexture("honey_drop", 24, 28);
    g.clear();

    g.lineStyle(2.5, C.cyan, 0.6);
    g.strokeCircle(10, 10, 8);
    g.lineStyle(2, C.cyan, 0.7);
    for (let i = 0; i < 6; i++) {
      const a = (PI / 3) * i;
      g.lineBetween(10 + Math.cos(a) * 4, 10 + Math.sin(a) * 4, 10 + Math.cos(a) * 8, 10 + Math.sin(a) * 8);
    }
    g.fillStyle(C.cyan, 0.4);
    g.fillCircle(10, 10, 3);
    g.generateTexture("gear_icon", 20, 20);
    g.clear();

    g.fillStyle(C.white, 0.35);
    const ds = 10;
    g.beginPath();
    g.moveTo(ds, 0); g.lineTo(ds * 2, ds);
    g.lineTo(ds, ds * 2); g.lineTo(0, ds);
    g.closePath(); g.fillPath();
    g.lineStyle(2, C.white, 0.6);
    g.beginPath();
    g.moveTo(ds, 0); g.lineTo(ds * 2, ds);
    g.lineTo(ds, ds * 2); g.lineTo(0, ds);
    g.closePath(); g.strokePath();
    g.generateTexture("diamond_icon", ds * 2, ds * 2);
    g.clear();
  }
}

class MenuScene extends Phaser.Scene {
  constructor() { super({ key: "Menu" }); }
  create() {
    this.add.tileSprite(0, 0, W, H, "bg_tunnel").setOrigin(0, 0);
    const stars = this.add.image(CX, H / 2, "stars").setAlpha(0.5);
    this.tweens.add({ targets: stars, alpha: 0.25, duration: 3500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    this.add.rectangle(CX, H / 2, W, H, 0x000004, 0.2);

    const frameGfx = this.add.graphics();
    const frameRadii = [70, 100, 135, 175, 220];
    for (let i = 0; i < frameRadii.length; i++) {
      const a = [0.35, 0.22, 0.14, 0.07, 0.03][i];
      const lw = [3.5, 2.5, 2, 1.5, 1][i];
      strokeHex(frameGfx, CX, H * 0.34, frameRadii[i], C.cyan, a, lw);
      if (i < 3) strokeHex(frameGfx, CX, H * 0.34, frameRadii[i] + 3, C.cyanBright, a * 0.18, lw + 5);
      if (i < 2) strokeHex(frameGfx, CX, H * 0.34, frameRadii[i], C.magenta, a * 0.2, lw * 0.5);
    }

    const tGlow = this.add.text(CX, 48, "HONEY", {
      fontSize: "58px", fontFamily: "monospace", color: "#00e5ff", fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0.08);
    this.tweens.add({ targets: tGlow, alpha: 0.16, scaleX: 1.03, duration: 2500, yoyo: true, repeat: -1 });

    this.add.text(CX, 48, "HONEY", {
      fontSize: "54px", fontFamily: "monospace", color: "#00e5ff",
      fontStyle: "bold", stroke: "#001020", strokeThickness: 10,
    }).setOrigin(0.5);

    this.add.text(CX, 104, "RUNNER", {
      fontSize: "38px", fontFamily: "monospace", color: "#ff0090",
      fontStyle: "bold", stroke: "#200010", strokeThickness: 7,
    }).setOrigin(0.5);

    const sub = this.add.text(CX, 138, "C Y B E R   H I V E", {
      fontSize: "11px", fontFamily: "monospace", color: "#00e5ff",
    }).setOrigin(0.5);
    this.tweens.add({ targets: sub, alpha: 0.25, duration: 2200, yoyo: true, repeat: -1 });

    for (let i = 0; i < 3; i++) {
      const pulse = this.add.circle(CX, H * 0.34, 30 + i * 18, C.cyan, 0.015 - i * 0.004);
      this.tweens.add({ targets: pulse, scaleX: 1.6 + i * 0.25, scaleY: 1.6 + i * 0.25, alpha: 0, duration: 2200 + i * 300, repeat: -1, delay: i * 300 });
    }

    const shadow = this.add.image(CX, H * 0.34 + 58, "bee_shadow").setScale(4.5).setAlpha(0.25);
    const body = this.add.image(CX, H * 0.34, "runner").setScale(3.4);
    const wL = this.add.image(CX - 32, H * 0.34 - 24, "wing_l").setScale(3.2).setAlpha(0.6).setDepth(9);
    const wR = this.add.image(CX + 32, H * 0.34 - 24, "wing_r").setScale(3.2).setAlpha(0.6).setDepth(11);
    body.setDepth(10);

    this.tweens.add({ targets: body, y: body.y - 10, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: shadow, scaleX: 4, alpha: 0.1, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: wL, scaleY: 0.7, alpha: 0.15, duration: 35, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: wR, scaleY: 0.7, alpha: 0.15, duration: 35, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: [wL, wR], y: wL.y - 10, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    this.add.particles(0, 0, "hex_dust", {
      speed: { min: 12, max: 45 }, scale: { start: 0.9, end: 0 },
      alpha: { start: 0.6, end: 0 }, lifespan: 900, frequency: 70,
      follow: body, followOffset: { x: 0, y: 38 },
      blendMode: "ADD", tint: [C.amberHot, C.coinBody, C.amberWhite],
    }).setDepth(8);

    this.add.particles(0, 0, "particle_white", {
      speed: { min: 6, max: 28 }, scale: { start: 1.2, end: 0 },
      alpha: { start: 0.7, end: 0 }, lifespan: 550, frequency: 90,
      follow: body, followOffset: { x: -22, y: 22 },
      blendMode: "ADD", tint: [C.coinShine, C.amberWhite],
    }).setDepth(8);

    const best = getBestScore();
    if (best > 0) {
      this.add.text(CX, H * 0.34 + 85, `BEST: ${best.toLocaleString()}`, {
        fontSize: "17px", fontFamily: "monospace", color: "#ffc030",
        fontStyle: "bold", stroke: "#000", strokeThickness: 5,
      }).setOrigin(0.5);
    }

    const btnGlow = this.add.rectangle(CX, H * 0.6, 210, 58, C.cyan, 0.03);
    this.tweens.add({ targets: btnGlow, scaleX: 1.35, scaleY: 1.45, alpha: 0, duration: 2200, repeat: -1 });

    const btn = this.add.rectangle(CX, H * 0.6, 190, 54, 0x000008, 0.95).setInteractive({ useHandCursor: true });
    btn.setStrokeStyle(3, C.cyan);
    this.add.text(CX, H * 0.6, "PLAY", {
      fontSize: "26px", fontFamily: "monospace", color: "#00e5ff", fontStyle: "bold",
    }).setOrigin(0.5);
    btn.on("pointerdown", () => this.scene.start("Game"));
    this.tweens.add({ targets: btn, scaleX: 1.04, scaleY: 1.04, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const ctrl = [
      "CONTROLS:",
      "",
      "Left / Right - Change Lane",
      "Up / Swipe Up - Jump / Stinger Dash",
      "Down / Swipe Down - Slide",
      "",
      "Collect hex-honey & dodge lasers!",
    ];
    this.add.text(CX, H * 0.74, ctrl.join("\n"), {
      fontSize: "9px", fontFamily: "monospace", color: "#203858",
      align: "center", lineSpacing: 5,
    }).setOrigin(0.5);

    this.add.text(CX, H - 24, "A Honeycomb Arena Game", {
      fontSize: "8px", fontFamily: "monospace", color: "#142040",
    }).setOrigin(0.5);

    this.add.image(CX, H / 2, "scanlines").setAlpha(0.22);
    this.add.image(CX, H / 2, "vignette").setAlpha(0.85);
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
  private dashLabelTop!: Phaser.GameObjects.Text;
  private dashLabelBot!: Phaser.GameObjects.Text;
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

  constructor() { super({ key: "Game" }); }

  create() {
    this.lane = 1; this.sliding = false; this.speed = INITIAL_SPEED;
    this.dist = 0; this.score = 0; this.coins = 0; this.alive = true;
    this.pu = { magnet: false, shield: false, boost: false };
    this.puIcons = []; this.gTiles = []; this.fc = 0;
    this.combo = 0; this.comboTimer = 0; this.maxCombo = 0;
    this.dashReady = true; this.dashing = false; this.dashCooldownTimer = 0;
    this.phase = 0; this.tunnelOffset = 0; this.gameTimer = 0;
    this.updatePhaseColors();

    this.bgTunnel = this.add.tileSprite(0, 0, W, H, "bg_tunnel").setOrigin(0, 0).setScrollFactor(0);
    this.bgStars = this.add.image(CX, H / 2, "stars").setAlpha(0.3);

    this.tunnelRingsGfx = this.add.graphics().setDepth(1);

    this.add.rectangle(CX, GROUND_Y - 50, LANE_WIDTH * 3 + 14, 220, C.tunnelDark, 0.2).setDepth(2);

    for (let i = 0; i <= LANE_COUNT; i++) {
      const lx = CX + LANE_POSITIONS[0] - LANE_WIDTH / 2 + i * LANE_WIDTH;
      const edge = (i === 0 || i === LANE_COUNT);
      this.add.line(0, 0, lx, GROUND_Y - 160, lx, GROUND_Y + 28, C.cyan, edge ? 0.12 : 0.04).setOrigin(0, 0).setDepth(2);
      if (edge) this.add.line(0, 0, lx, GROUND_Y - 160, lx, GROUND_Y + 28, C.cyan, 0.02).setOrigin(0, 0).setLineWidth(4).setDepth(2);
    }

    this.gTiles.push(this.add.tileSprite(CX, GROUND_Y, LANE_WIDTH * 3 + 20, 28, "ground_tile").setDepth(3));

    this.obsGroup = this.physics.add.group({ allowGravity: false });
    this.coinGroup = this.physics.add.group({ allowGravity: false });
    this.puGroup = this.physics.add.group({ allowGravity: false });

    this.beeShadow = this.add.image(CX, GROUND_Y - 6, "bee_shadow").setScale(2).setAlpha(0.2).setDepth(4);

    this.runner = this.physics.add.sprite(CX, RUNNER_Y, "runner");
    this.runner.setCollideWorldBounds(false);
    this.runner.setGravityY(GRAVITY);
    this.runner.setSize(50, 70);
    this.runner.setDepth(10);

    this.wingL = this.add.image(CX - 28, RUNNER_Y - 20, "wing_l").setScale(1.6).setAlpha(0.5).setDepth(9);
    this.wingR = this.add.image(CX + 28, RUNNER_Y - 20, "wing_r").setScale(1.6).setAlpha(0.5).setDepth(11);
    this.tweens.add({ targets: this.wingL, scaleY: 0.3, alpha: 0.15, duration: 38, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: this.wingR, scaleY: 0.3, alpha: 0.15, duration: 38, yoyo: true, repeat: -1 });

    this.particles = this.add.particles(0, 0, "particle_amber", {
      speed: { min: 15, max: 50 }, scale: { start: 0.5, end: 0 },
      alpha: { start: 0.5, end: 0 }, lifespan: 500, frequency: 50,
      follow: this.runner, followOffset: { x: 0, y: 35 },
      blendMode: "ADD", tint: [C.amberHot, C.amberWhite, C.cyan],
    }).setDepth(8);

    this.hexDust = this.add.particles(0, 0, "hex_dust", {
      speed: { min: 8, max: 30 }, scale: { start: 0.6, end: 0 },
      alpha: { start: 0.4, end: 0 }, lifespan: 700, frequency: 120,
      follow: this.runner, followOffset: { x: 0, y: 40 },
      blendMode: "ADD", tint: [C.coinBody, C.amberHot],
    }).setDepth(8);

    this.add.particles(0, 0, "particle_white", {
      speed: { min: 5, max: 20 }, scale: { start: 0.8, end: 0 },
      alpha: { start: 0.4, end: 0 }, lifespan: 400, frequency: 100,
      follow: this.runner, followOffset: { x: -15, y: 25 },
      blendMode: "ADD", tint: [C.coinShine, C.amberWhite, C.white],
    }).setDepth(8);

    this.shieldVis = this.add.circle(CX, RUNNER_Y, 42, C.shieldGreen, 0.06);
    this.shieldVis.setStrokeStyle(2, C.shieldBright, 0.35);
    this.shieldVis.setVisible(false).setDepth(12);

    this.dashVis = this.add.circle(CX, RUNNER_Y, 46, C.cyan, 0.04);
    this.dashVis.setStrokeStyle(2, C.cyanBright, 0.5);
    this.dashVis.setVisible(false).setDepth(12);

    this.physics.add.overlap(this.runner, this.obsGroup, this.hitObs, undefined, this);
    this.physics.add.overlap(this.runner, this.coinGroup, this.getCoin, undefined, this);
    this.physics.add.overlap(this.runner, this.puGroup, this.getPU, undefined, this);

    this.schedObs();
    this.coinTimer = this.time.addEvent({ delay: COIN_SPAWN_INTERVAL, callback: this.spawnCoin, callbackScope: this, loop: true });
    this.puTimer = this.time.addEvent({ delay: POWERUP_SPAWN_INTERVAL, callback: this.spawnPU, callbackScope: this, loop: true });

    this.setupInput();
    this.makeHUD();

    this.add.image(CX, H / 2, "scanlines").setAlpha(0.12).setDepth(99).setScrollFactor(0);
    this.add.image(CX, H / 2, "vignette").setAlpha(0.5).setDepth(100).setScrollFactor(0);
  }

  private updatePhaseColors() {
    const colors = [
      [C.cyan, C.magenta],
      [C.magenta, C.amberHot],
      [C.lime, C.cyan],
      [C.amberHot, C.magenta],
    ];
    const c = colors[Math.min(this.phase, colors.length - 1)];
    this.phaseColor1 = c[0];
    this.phaseColor2 = c[1];
  }

  private makeHUD() {
    const d = 91;
    const hY = 18;

    this.add.image(20, hY, "honey_drop").setScale(0.8).setDepth(d).setScrollFactor(0);
    this.coinTxt = this.add.text(36, hY, "0", {
      fontSize: "14px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold", stroke: "#000", strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(d).setScrollFactor(0);

    this.add.image(100, hY, "gear_icon").setScale(0.7).setDepth(d).setScrollFactor(0).setAlpha(0.5);

    this.comboTxt = this.add.text(CX, hY, "1X NEURAL OVERLOAD", {
      fontSize: "11px", fontFamily: "monospace", color: "#ffc030", fontStyle: "bold", stroke: "#000", strokeThickness: 3,
    }).setOrigin(0.5).setDepth(d).setScrollFactor(0);

    this.timerTxt = this.add.text(W - 14, hY, "0.0s", {
      fontSize: "14px", fontFamily: "monospace", color: "#ffffff", fontStyle: "bold", stroke: "#000", strokeThickness: 3,
    }).setOrigin(1, 0.5).setDepth(d).setScrollFactor(0);

    this.scoreTxt = this.add.text(CX, hY + 20, "0", {
      fontSize: "12px", fontFamily: "monospace", color: "#00e5ff", stroke: "#000", strokeThickness: 2,
    }).setOrigin(0.5).setDepth(d).setScrollFactor(0);

    this.phaseTxt = this.add.text(CX, hY + 36, PHASE_NAMES[0], {
      fontSize: "8px", fontFamily: "monospace", color: "#00e5ff", stroke: "#000", strokeThickness: 2,
    }).setOrigin(0.5).setDepth(d).setScrollFactor(0).setAlpha(0.6);

    this.dashIcon = this.add.image(38, H - 42, "dash_icon_ready").setScale(0.85).setDepth(d).setScrollFactor(0);
    this.dashLabelTop = this.add.text(38, H - 18, "STINGER", {
      fontSize: "6px", fontFamily: "monospace", color: "#00e5ff", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(d).setScrollFactor(0);
    this.dashLabelBot = this.add.text(38, H - 10, "DASH", {
      fontSize: "7px", fontFamily: "monospace", color: "#00e5ff", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(d).setScrollFactor(0);

    this.add.image(W - 20, H - 20, "diamond_icon").setScale(0.8).setDepth(d).setScrollFactor(0).setAlpha(0.4);
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
    if (this.dashReady) {
      this.triggerDash();
    } else {
      this.jump();
    }
  }

  private jump() {
    if (!this.alive) return;
    const b = this.runner.body as Phaser.Physics.Arcade.Body;
    if (b.y + b.height >= GROUND_Y - 2) b.setVelocityY(JUMP_VELOCITY);
  }

  private slide() {
    if (!this.alive || this.sliding) return;
    this.sliding = true;
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

    this.cameras.main.flash(200, 0, 229, 255, false);

    for (let i = 0; i < 10; i++) {
      const s = this.add.image(this.runner.x + Phaser.Math.Between(-35, 35), this.runner.y + Phaser.Math.Between(-35, 35), "particle_cyan")
        .setScale(3).setAlpha(0.7).setDepth(15).setBlendMode("ADD");
      this.tweens.add({ targets: s, x: s.x + Phaser.Math.Between(-70, 70), y: s.y + Phaser.Math.Between(-70, 70), alpha: 0, scale: 0, duration: 400, onComplete: () => s.destroy() });
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
    const t = Phaser.Math.Between(0, 3);
    const tx = ["barrier", "low_gate", "lane_blocker", "glitch_wall"];
    const o = this.obsGroup.create(CX + LANE_POSITIONS[l], -60, tx[t]) as Phaser.Physics.Arcade.Sprite;
    o.setImmovable(true).setDepth(6);
    if (t === 1) { o.y = -20; o.setSize(78, 14); }
    else if (t === 2) o.setSize(26, 78);
    else if (t === 3) { o.setSize(72, 48); if (Math.random() > 0.5) this.tweens.add({ targets: o, alpha: 0.3, duration: 80, yoyo: true, repeat: 3 }); }
    else o.setSize(72, 48);
  }

  private spawnCoin() {
    const l = Phaser.Math.Between(0, LANE_COUNT - 1);
    const c = this.coinGroup.create(CX + LANE_POSITIONS[l], -30, "coin") as Phaser.Physics.Arcade.Sprite;
    c.setDepth(5).setSize(22, 22);
    this.tweens.add({ targets: c, scaleX: 0.6, duration: 320, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  private spawnPU() {
    const l = Phaser.Math.Between(0, LANE_COUNT - 1);
    const ts = ["magnet", "shield_pu", "boost_pu"];
    const p = this.puGroup.create(CX + LANE_POSITIONS[l], -30, ts[Phaser.Math.Between(0, 2)]) as Phaser.Physics.Arcade.Sprite;
    p.setDepth(5).setSize(28, 28);
    this.tweens.add({ targets: p, angle: 360, duration: 2800, repeat: -1 });
    this.tweens.add({ targets: p, scaleX: 1.1, scaleY: 1.1, duration: 450, yoyo: true, repeat: -1 });
  }

  private hitObs(_r: any, o: any) {
    if (this.dashing) {
      o.destroy();
      this.score += 50;
      this.bumpCombo();
      const p = this.add.text(this.runner.x, this.runner.y - 30, "PHASED!", {
        fontSize: "14px", fontFamily: "monospace", color: "#00e5ff", fontStyle: "bold", stroke: "#000", strokeThickness: 3,
      }).setDepth(30);
      this.tweens.add({ targets: p, y: p.y - 45, alpha: 0, duration: 500, onComplete: () => p.destroy() });
      return;
    }

    if (this.pu.shield) {
      o.destroy();
      this.pu.shield = false;
      if (this.pu.shieldTimer) this.pu.shieldTimer.destroy();
      this.shieldVis?.setVisible(false);
      this.rmPUIcon("shield");
      for (let i = 0; i < 10; i++) {
        const s = this.add.image(this.runner.x, this.runner.y, "spark").setScale(2.5).setAlpha(0.8).setDepth(20).setTint(C.shieldBright);
        this.tweens.add({ targets: s, x: s.x + Phaser.Math.Between(-70, 70), y: s.y + Phaser.Math.Between(-70, 70), alpha: 0, scale: 0, duration: 400, onComplete: () => s.destroy() });
      }
      return;
    }

    if (!this.alive) return;
    this.alive = false;

    this.cameras.main.shake(400, 0.02);
    this.cameras.main.flash(300, 255, 16, 64);

    for (let i = 0; i < 18; i++) {
      const tint = i % 2 === 0 ? C.laserRedWhite : C.magentaBright;
      const s = this.add.image(this.runner.x, this.runner.y, "spark").setScale(3).setAlpha(0.9).setDepth(20).setTint(tint);
      this.tweens.add({ targets: s, x: s.x + Phaser.Math.Between(-100, 100), y: s.y + Phaser.Math.Between(-100, 100), alpha: 0, scale: 0, duration: 550, onComplete: () => s.destroy() });
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

    this.cameras.main.shake(60, 0.004);

    const p = this.add.text(this.runner.x + 15, this.runner.y - 22, `+${COIN_SCORE * Math.max(1, Math.floor(this.combo))}`, {
      fontSize: "13px", fontFamily: "monospace", color: "#ffd040", fontStyle: "bold", stroke: "#000", strokeThickness: 3,
    }).setDepth(30);
    this.tweens.add({ targets: p, y: p.y - 40, alpha: 0, duration: 450, onComplete: () => p.destroy() });
  }

  private bumpCombo() {
    this.combo = Math.min(20, this.combo + 1);
    this.comboTimer = COMBO_DECAY_TIME;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
  }

  private getPU(_r: any, p: any) {
    const t = p.texture.key;
    p.destroy();
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
    const bg = this.add.rectangle(0, 0, 26, 26, col, 0.1).setStrokeStyle(1, col, 0.4);
    const lb = this.add.text(0, 0, type[0].toUpperCase(), { fontSize: "11px", fontFamily: "monospace", color: `#${col.toString(16).padStart(6, "0")}`, fontStyle: "bold" }).setOrigin(0.5);
    const ct = this.add.container(W - 30 - this.puIcons.length * 30, H - 38, [bg, lb]).setDepth(91);
    (ct as any).__t = type;
    this.puIcons.push(ct);
  }

  private rmPUIcon(type: string) {
    this.puIcons = this.puIcons.filter((c) => { if ((c as any).__t === type) { c.destroy(); return false; } return true; });
  }

  private drawTunnelRings() {
    const g = this.tunnelRingsGfx;
    g.clear();
    const numRings = 14;
    const baseOffset = this.tunnelOffset % 55;

    for (let i = numRings; i >= 0; i--) {
      const t = (i * 55 + baseOffset) / (numRings * 55);
      const r = 10 + t * (W * 0.85);
      const cy = VY + t * (H * 0.55);
      const rr = r * (0.5 + t * 0.5);

      const ea = 0.2 + t * 0.7;
      const ew = 1 + t * 3;
      strokeHex(g, VX, cy, rr, this.phaseColor1, ea, ew);
      if (t > 0.15) strokeHex(g, VX, cy, rr + 2, this.phaseColor1, ea * 0.18, ew + 4);
      if (t > 0.25) strokeHex(g, VX, cy, rr, this.phaseColor2, ea * 0.2, ew * 0.4);

      if (t > 0.35) {
        const pts = hexVerts(VX, cy, rr);
        for (let j = 0; j < 6; j++) {
          g.fillStyle(this.phaseColor1, 0.25 + t * 0.35);
          g.fillCircle(pts[j][0], pts[j][1], 1.5 + t * 3.5);
        }
      }
    }

    for (let i = 0; i < 6; i++) {
      const angle = (PI / 3) * i - PI / 6;
      const len = W * 0.6;
      g.lineStyle(0.8, this.phaseColor1, 0.06);
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
      this.cameras.main.flash(300, 0, 229, 255, false);
      if (this.phaseTxt) {
        this.phaseTxt.setText(PHASE_NAMES[this.phase] || "");
        this.tweens.add({ targets: this.phaseTxt, scaleX: 1.3, scaleY: 1.3, duration: 200, yoyo: true });
      }
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
        const flash = this.add.circle(38, H - 42, 28, C.cyan, 0.2).setDepth(92);
        this.tweens.add({ targets: flash, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
      } else {
        const pct = 1 - (this.dashCooldownTimer / this.dashCooldownTotal);
        this.dashIcon.setAlpha(0.25 + pct * 0.75);
      }
    }

    this.tunnelOffset += es * 2;
    this.drawTunnelRings();

    this.bgTunnel.tilePositionY -= es * 0.25;

    this.gTiles.forEach((gt) => { gt.tilePositionY -= es * 0.5; });

    this.wingL.x = this.runner.x - 28;
    this.wingR.x = this.runner.x + 28;
    this.wingL.y = this.runner.y - 20;
    this.wingR.y = this.runner.y - 20;

    this.beeShadow.x = this.runner.x;
    const sd = Math.max(0, GROUND_Y - this.runner.y);
    this.beeShadow.setScale(Math.max(0.4, 2 - sd * 0.01)).setAlpha(Math.max(0.04, 0.2 - sd * 0.002));

    if (this.shieldVis) { this.shieldVis.x = this.runner.x; this.shieldVis.y = this.runner.y; }
    if (this.dashVis) { this.dashVis.x = this.runner.x; this.dashVis.y = this.runner.y; }

    const body = this.runner.body as Phaser.Physics.Arcade.Body;
    if (!this.sliding && body.y + body.height > GROUND_Y) {
      body.y = GROUND_Y - body.height;
      body.setVelocityY(0);
    }

    if (es > 6.5 && this.fc % 2 === 0) {
      const sl = this.add.image(Phaser.Math.Between(10, W - 10), -10, "speed_line")
        .setAlpha(0.1 + (es - 6.5) * 0.04).setScale(1, 1 + es * 0.2).setDepth(2).setTint(this.phaseColor1);
      this.tweens.add({ targets: sl, y: H + 20, alpha: 0, duration: 220 + Phaser.Math.Between(0, 120), onComplete: () => sl.destroy() });
    }

    if (this.combo >= 10 && this.fc % 3 === 0) {
      const sl2 = this.add.image(Phaser.Math.Between(5, W - 5), -5, "speed_line")
        .setAlpha(0.2).setScale(1.5, 2 + es * 0.15).setDepth(2).setTint(this.phaseColor2);
      this.tweens.add({ targets: sl2, y: H + 20, alpha: 0, duration: 180, onComplete: () => sl2.destroy() });
    }

    this.obsGroup.getChildren().forEach((o) => {
      const s = o as Phaser.Physics.Arcade.Sprite;
      s.y += es * (delta / 16) * 2;
      if (s.y > H + 100) s.destroy();
    });
    this.coinGroup.getChildren().forEach((o) => {
      const c = o as Phaser.Physics.Arcade.Sprite;
      c.y += es * (delta / 16) * 2;
      if (c.y > H + 50) c.destroy();
      if (this.pu.magnet) {
        const dx = this.runner.x - c.x, dy = this.runner.y - c.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 150 && d > 5) { c.x += (dx / d) * 8; c.y += (dy / d) * 8; }
      }
    });
    this.puGroup.getChildren().forEach((o) => {
      const p = o as Phaser.Physics.Arcade.Sprite;
      p.y += es * (delta / 16) * 2;
      if (p.y > H + 50) p.destroy();
    });

    const coinDisplay = this.score > 1000 ? `${(this.score / 1000).toFixed(1)}K` : this.score.toString();
    this.coinTxt.setText(coinDisplay);
    this.scoreTxt.setText(`SCORE: ${this.score.toLocaleString()}`);
    this.timerTxt.setText(`${this.gameTimer.toFixed(1)}s`);

    const comboDisplay = Math.max(1, Math.floor(this.combo));
    this.comboTxt.setText(`${comboDisplay}X NEURAL OVERLOAD`);
    if (comboDisplay >= 10) {
      this.comboTxt.setColor("#ff0090");
    } else if (comboDisplay >= 5) {
      this.comboTxt.setColor("#ffc030");
    } else {
      this.comboTxt.setColor("#00e5ff");
    }
  }
}

class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: "GameOver" }); }
  create(data: { score: number; coins: number; distance: number; bestScore: number; isNewBest: boolean; speed: number; maxCombo: number }) {
    this.add.tileSprite(0, 0, W, H, "bg_tunnel").setOrigin(0, 0);
    this.add.rectangle(CX, H / 2, W, H, 0x000004, 0.55);

    const tg = this.add.text(CX, 44, "GAME OVER", {
      fontSize: "42px", fontFamily: "monospace", color: "#ff1040", fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0.1);
    this.tweens.add({ targets: tg, alpha: 0.2, duration: 1800, yoyo: true, repeat: -1 });

    this.add.text(CX, 44, "GAME OVER", {
      fontSize: "40px", fontFamily: "monospace", color: "#ff1040",
      fontStyle: "bold", stroke: "#180006", strokeThickness: 7,
    }).setOrigin(0.5);

    if (data.isNewBest) {
      const nb = this.add.text(CX, 82, "NEW BEST!", {
        fontSize: "22px", fontFamily: "monospace", color: "#ffd860",
        fontStyle: "bold", stroke: "#281800", strokeThickness: 5,
      }).setOrigin(0.5);
      this.tweens.add({ targets: nb, scaleX: 1.06, scaleY: 1.06, duration: 600, yoyo: true, repeat: -1 });
    }

    const beeGlow = this.add.circle(CX, 126, 30, C.cyan, 0.02);
    this.tweens.add({ targets: beeGlow, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 2000, repeat: -1 });
    const bee = this.add.image(CX, 126, "runner").setScale(2.3);
    this.tweens.add({ targets: bee, y: 120, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const sy = 164;
    const stats = [
      { l: "SCORE", v: data.score.toLocaleString(), c: "#00e5ff" },
      { l: "HONEY", v: data.coins.toString(), c: "#ffd040" },
      { l: "DISTANCE", v: `${data.distance.toLocaleString()}m`, c: "#ff0090" },
      { l: "MAX COMBO", v: `${data.maxCombo}x`, c: "#39ff14" },
      { l: "TOP SPEED", v: `${data.speed.toFixed(1)}x`, c: "#ff6000" },
      { l: "BEST", v: data.bestScore.toLocaleString(), c: "#ffc030" },
    ];
    stats.forEach((s, i) => {
      const y = sy + i * 42;
      this.add.rectangle(CX, y + 7, 290, 34, 0x04000a, 0.9).setStrokeStyle(1, C.cyan, 0.15);
      this.add.text(CX - 130, y, s.l, { fontSize: "9px", fontFamily: "monospace", color: "#203858" });
      const val = this.add.text(CX + 130, y + 12, s.v, {
        fontSize: "18px", fontFamily: "monospace", color: s.c, fontStyle: "bold", stroke: "#000", strokeThickness: 3,
      }).setOrigin(1, 0.5).setAlpha(0).setScale(0.7);
      this.tweens.add({ targets: val, alpha: 1, scaleX: 1, scaleY: 1, duration: 350, delay: 200 + i * 100, ease: "Back.easeOut" });
    });

    const btnGlow = this.add.rectangle(CX, 432, 210, 56, C.cyan, 0.025);
    this.tweens.add({ targets: btnGlow, scaleX: 1.3, scaleY: 1.3, alpha: 0, duration: 1800, repeat: -1 });
    const retry = this.add.rectangle(CX, 432, 200, 50, 0x000008, 0.95).setInteractive({ useHandCursor: true });
    retry.setStrokeStyle(3, C.cyan);
    this.add.text(CX, 432, "PLAY AGAIN", { fontSize: "16px", fontFamily: "monospace", color: "#00e5ff", fontStyle: "bold" }).setOrigin(0.5);
    retry.on("pointerdown", () => this.scene.start("Game"));
    this.tweens.add({ targets: retry, scaleX: 1.04, scaleY: 1.04, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const menu = this.add.rectangle(CX, 490, 200, 40, 0x08000e, 0.95).setInteractive({ useHandCursor: true });
    menu.setStrokeStyle(1.5, C.magenta, 0.4);
    this.add.text(CX, 490, "MENU", { fontSize: "13px", fontFamily: "monospace", color: "#ff0090" }).setOrigin(0.5);
    menu.on("pointerdown", () => this.scene.start("Menu"));

    this.input.keyboard?.once("keydown-SPACE", () => this.scene.start("Game"));
    this.input.keyboard?.once("keydown-ENTER", () => this.scene.start("Game"));

    this.add.image(CX, H / 2, "scanlines").setAlpha(0.18);
    this.add.image(CX, H / 2, "vignette").setAlpha(0.8);
  }
}

export function createHoneyRunnerGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent,
    backgroundColor: "#000004",
    physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, MenuScene, GameScene, GameOverScene],
    input: { activePointers: 3 },
    render: { pixelArt: false, antialias: true },
  });
}
