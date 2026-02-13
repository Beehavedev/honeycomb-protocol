import Phaser from "phaser";
import {
  GAME_WIDTH, GAME_HEIGHT, LANE_POSITIONS, LANE_COUNT,
  RUNNER_Y, GROUND_Y, INITIAL_SPEED, MAX_SPEED, SPEED_RAMP,
  JUMP_VELOCITY, GRAVITY, SLIDE_DURATION,
  OBSTACLE_SPAWN_INTERVAL_MIN, OBSTACLE_SPAWN_INTERVAL_MAX,
  COIN_SPAWN_INTERVAL, POWERUP_SPAWN_INTERVAL,
  MAGNET_DURATION, SHIELD_DURATION, BOOST_DURATION, BOOST_SPEED_MULT,
  COIN_SCORE, C, LANE_WIDTH,
} from "./constants";
import { getBestScore, setBestScore, addCoins, incrementRuns } from "./storage";

const CX = GAME_WIDTH / 2;
const PI = Math.PI;
const TAU = PI * 2;

function hexPts(cx: number, cy: number, r: number, rot = -PI / 6): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (PI / 3) * i + rot;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

function strokeHex(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, color: number, alpha: number, lw = 1) {
  const pts = hexPts(cx, cy, r);
  g.lineStyle(lw, color, alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < 6; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.strokePath();
}

function fillHex(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, color: number, alpha: number) {
  const pts = hexPts(cx, cy, r);
  g.fillStyle(color, alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < 6; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fillPath();
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const gg = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (gg << 8) | bl;
}

class BootScene extends Phaser.Scene {
  constructor() { super({ key: "Boot" }); }

  create() {
    const g = this.make.graphics({ x: 0, y: 0 });
    this.genTunnelBg(g);
    this.genNebula(g);
    this.genStars(g);
    this.genScanlines(g);
    this.genVignette(g);
    this.genBee(g);
    this.genBeeSlide(g);
    this.genBeeShadow(g);
    this.genWingL(g);
    this.genWingR(g);
    this.genObstacles(g);
    this.genCoin(g);
    this.genPowerups(g);
    this.genGround(g);
    this.genParticles(g);
    this.genHexFrame(g);
    g.destroy();
    this.scene.start("Menu");
  }

  private genTunnelBg(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    g.fillGradientStyle(0x030008, 0x030008, 0x0e0525, 0x0e0525, 1);
    g.fillRect(0, 0, W, H);

    const vx = W / 2, vy = H * 0.15;
    g.fillStyle(C.hexRingAmber, 0.012);
    g.fillCircle(vx, vy, 180);
    g.fillStyle(C.hexRingAmber, 0.008);
    g.fillCircle(vx, vy, 260);

    const rings = 12;
    for (let i = rings; i >= 0; i--) {
      const t = i / rings;
      const r = 20 + t * (W * 0.85);
      const cy = vy + t * (H * 0.58);
      const sq = 0.75 + t * 0.25;
      const rr = r * sq;

      const wallAlpha = 0.06 + t * 0.12;
      fillHex(g, vx, cy, rr, C.tunnelWall, wallAlpha);

      if (i % 2 === 0) {
        fillHex(g, vx, cy, rr, C.tunnelDeep, 0.04);
      }

      const edgeAlpha = 0.15 + t * 0.5;
      const edgeWidth = 1 + t * 1.5;
      const edgeColor = lerpColor(C.hexRingAmberDim, C.hexRingAmberBright, t);
      strokeHex(g, vx, cy, rr, edgeColor, edgeAlpha, edgeWidth);

      if (t > 0.2) {
        strokeHex(g, vx, cy, rr + 2, C.hexRingAmber, edgeAlpha * 0.15, edgeWidth + 3);
        strokeHex(g, vx, cy, rr + 5, C.hexRingAmber, edgeAlpha * 0.04, edgeWidth + 8);
      }

      if (t > 0.5) {
        const innerGlowAlpha = (t - 0.5) * 0.06;
        strokeHex(g, vx, cy, rr - 4, C.hexRingAmberBright, innerGlowAlpha, 1);
      }
    }

    for (let i = 0; i < 6; i++) {
      const angle = (PI / 3) * i - PI / 6;
      const ex = vx + Math.cos(angle) * W * 1.4;
      const ey = vy + Math.sin(angle) * H * 1.4;
      g.lineStyle(1, C.hexRingAmber, 0.05);
      g.lineBetween(vx, vy, ex, ey);
      g.lineStyle(4, C.hexRingAmber, 0.012);
      g.lineBetween(vx, vy, ex, ey);
    }

    const hexR = 20;
    const hexH = hexR * Math.sqrt(3);
    for (let row = -1; row < H / hexH + 1; row++) {
      for (let col = -1; col < W / (hexR * 1.5) + 1; col++) {
        const hx = col * hexR * 1.5;
        const hy = row * hexH + (col % 2 ? hexH / 2 : 0);
        const d = Math.sqrt((hx - vx) ** 2 + (hy - vy) ** 2) / (W * 0.7);
        const a = Math.max(0.01, 0.08 - d * 0.06);
        strokeHex(g, hx, hy, hexR - 3, C.neonCyan, a * 0.35);

        if (Math.random() < 0.03) {
          fillHex(g, hx, hy, hexR - 4, C.neonCyan, 0.01 + Math.random() * 0.02);
        }
        if (Math.random() < 0.008) {
          fillHex(g, hx, hy, hexR - 4, C.hexRingAmber, 0.015);
        }
      }
    }

    g.generateTexture("bg_tunnel", W, H);
    g.clear();
  }

  private genNebula(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    for (let i = 0; i < 12; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const r = 30 + Math.random() * 60;
      const colors = [C.neonPurpleDim, C.tunnelWall, C.neonPinkDim, C.neonCyanDim];
      g.fillStyle(colors[Math.floor(Math.random() * colors.length)], 0.015 + Math.random() * 0.02);
      g.fillCircle(x, y, r);
      g.fillStyle(colors[Math.floor(Math.random() * colors.length)], 0.008);
      g.fillCircle(x + 10, y - 10, r * 1.3);
    }

    g.generateTexture("nebula", W, H);
    g.clear();
  }

  private genStars(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    for (let i = 0; i < 160; i++) {
      const sx = Math.random() * W;
      const sy = Math.random() * H;
      const sr = 0.2 + Math.random() * 1.2;
      const bright = Math.random();
      if (bright > 0.92) {
        g.fillStyle(C.hexRingAmberBright, 0.4 + Math.random() * 0.4);
        g.fillCircle(sx, sy, sr + 0.3);
        g.fillStyle(C.white, 0.15);
        g.fillCircle(sx, sy, sr + 1.5);
      } else if (bright > 0.8) {
        g.fillStyle(C.neonCyanBright, 0.3 + Math.random() * 0.3);
        g.fillCircle(sx, sy, sr);
      } else {
        const starColors = [C.white, C.neonCyanBright, C.neonPurpleBright, C.hexRingAmberHot];
        g.fillStyle(starColors[Math.floor(Math.random() * starColors.length)], 0.1 + Math.random() * 0.25);
        g.fillCircle(sx, sy, sr * 0.7);
      }
    }

    g.generateTexture("stars", W, H);
    g.clear();
  }

  private genScanlines(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    for (let y = 0; y < H; y += 3) {
      g.fillStyle(0x000000, 0.04);
      g.fillRect(0, y, W, 1);
    }
    g.generateTexture("scanlines", W, H);
    g.clear();
  }

  private genVignette(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const steps = 20;
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const a = (1 - t) * 0.6;
      const rx = (W / 2) * (0.5 + t * 0.5);
      const ry = (H / 2) * (0.5 + t * 0.5);
      g.fillStyle(0x000000, a * 0.08);
      g.fillEllipse(W / 2, H / 2, rx * 2, ry * 2);
    }
    g.fillStyle(0x000000, 0.3);
    g.fillRect(0, 0, W, 15);
    g.fillRect(0, H - 15, W, 15);
    g.fillStyle(0x000000, 0.15);
    g.fillRect(0, 0, 8, H);
    g.fillRect(W - 8, 0, 8, H);
    g.generateTexture("vignette", W, H);
    g.clear();
  }

  private genBee(g: Phaser.GameObjects.Graphics) {
    const w = 48, h = 56;
    g.clear();

    g.fillStyle(C.beeGold, 1);
    g.fillEllipse(w / 2, 16, 22, 20);
    g.fillStyle(C.beeGoldLight, 0.35);
    g.fillEllipse(w / 2 - 2, 14, 10, 10);
    g.fillStyle(C.beeGoldDark, 0.25);
    g.fillEllipse(w / 2 + 3, 19, 12, 10);

    g.fillStyle(C.black, 1);
    g.fillCircle(w / 2 - 6, 12, 4);
    g.fillCircle(w / 2 + 6, 12, 4);
    g.fillStyle(C.beeEye, 0.9);
    g.fillCircle(w / 2 - 6, 11.5, 2.8);
    g.fillCircle(w / 2 + 6, 11.5, 2.8);
    g.fillStyle(C.beeEyeGlow, 0.5);
    g.fillCircle(w / 2 - 6, 11, 1.8);
    g.fillCircle(w / 2 + 6, 11, 1.8);
    g.fillStyle(C.white, 0.9);
    g.fillCircle(w / 2 - 5, 10, 1);
    g.fillCircle(w / 2 + 7, 10, 1);

    g.lineStyle(1.5, C.beeGoldDark, 0.8);
    g.beginPath(); g.moveTo(w / 2 - 4, 5); g.lineTo(w / 2 - 8, 0); g.strokePath();
    g.beginPath(); g.moveTo(w / 2 + 4, 5); g.lineTo(w / 2 + 8, 0); g.strokePath();
    g.fillStyle(C.neonCyan, 1);
    g.fillCircle(w / 2 - 8, 0, 2.2);
    g.fillCircle(w / 2 + 8, 0, 2.2);
    g.fillStyle(C.neonCyanBright, 0.5);
    g.fillCircle(w / 2 - 8, 0, 3.5);
    g.fillCircle(w / 2 + 8, 0, 3.5);

    g.fillStyle(C.beeGold, 1);
    g.fillEllipse(w / 2, 36, 28, 30);
    g.fillStyle(C.beeGoldMetal, 0.4);
    g.fillEllipse(w / 2 + 6, 32, 12, 18);
    g.fillStyle(C.beeGoldLight, 0.25);
    g.fillEllipse(w / 2 - 5, 30, 12, 16);

    const stripes = [28, 34, 40];
    for (const sy of stripes) {
      g.fillStyle(C.beeStripeDark, 0.85);
      g.fillRect(w / 2 - 13, sy, 26, 3);
      g.fillStyle(C.beeStripe, 0.5);
      g.fillRect(w / 2 - 13, sy + 1, 26, 1);
    }

    g.lineStyle(1.5, C.hexRingAmber, 0.35);
    g.strokeEllipse(w / 2, 36, 28, 30);
    g.lineStyle(3, C.hexRingAmber, 0.06);
    g.strokeEllipse(w / 2, 36, 32, 34);

    g.fillStyle(C.beeGoldDark, 1);
    g.fillTriangle(w / 2, h - 2, w / 2 - 3.5, h - 10, w / 2 + 3.5, h - 10);
    g.fillStyle(C.hexRingAmberBright, 0.5);
    g.fillTriangle(w / 2, h - 4, w / 2 - 1.5, h - 9, w / 2 + 1.5, h - 9);

    g.fillStyle(C.hexRingAmber, 0.04);
    g.fillCircle(w / 2, 32, 30);

    g.generateTexture("runner", w, h);
    g.clear();
  }

  private genBeeSlide(g: Phaser.GameObjects.Graphics) {
    const w = 54, h = 28;
    g.clear();

    g.fillStyle(C.beeGold, 1);
    g.fillEllipse(13, h / 2, 18, 16);
    g.fillStyle(C.beeGoldLight, 0.3);
    g.fillEllipse(11, h / 2 - 2, 8, 8);

    g.fillStyle(C.black, 1);
    g.fillCircle(9, h / 2 - 2, 3);
    g.fillCircle(15, h / 2 - 2, 3);
    g.fillStyle(C.beeEye, 0.9);
    g.fillCircle(9, h / 2 - 3, 1.6);
    g.fillCircle(15, h / 2 - 3, 1.6);
    g.fillStyle(C.white, 0.8);
    g.fillCircle(9, h / 2 - 3.5, 0.8);
    g.fillCircle(15, h / 2 - 3.5, 0.8);

    g.fillStyle(C.beeGold, 1);
    g.fillEllipse(w / 2 + 3, h / 2, 32, 20);
    g.fillStyle(C.beeGoldMetal, 0.3);
    g.fillEllipse(w / 2 + 5, h / 2 - 3, 14, 10);
    g.fillStyle(C.beeGoldLight, 0.2);
    g.fillEllipse(w / 2, h / 2 - 4, 14, 8);

    const sx = [23, 30, 37];
    for (const x of sx) {
      g.fillStyle(C.beeStripeDark, 0.85);
      g.fillRect(x, h / 2 - 8, 3, 16);
    }

    g.lineStyle(1.5, C.hexRingAmber, 0.3);
    g.strokeEllipse(w / 2 + 3, h / 2, 32, 20);

    g.fillStyle(C.beeWing, 0.15);
    g.fillEllipse(17, 3, 20, 8);
    g.fillEllipse(32, 2, 16, 6);

    g.generateTexture("runner_slide", w, h);
    g.clear();
  }

  private genBeeShadow(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(C.black, 0.18);
    g.fillEllipse(22, 7, 40, 12);
    g.fillStyle(C.black, 0.08);
    g.fillEllipse(22, 7, 48, 16);
    g.fillStyle(C.hexRingAmber, 0.015);
    g.fillEllipse(22, 7, 52, 18);
    g.generateTexture("bee_shadow", 44, 14);
    g.clear();
  }

  private genWingL(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const ww = 28, wh = 32;
    g.fillStyle(C.beeWing, 0.3);
    g.fillEllipse(ww / 2, wh / 2, ww - 2, wh - 2);
    g.fillStyle(C.beeWingShine, 0.12);
    g.fillEllipse(ww / 2 - 3, wh / 2 - 4, ww * 0.5, wh * 0.6);
    g.lineStyle(1.2, C.beeWingGlow, 0.45);
    g.strokeEllipse(ww / 2, wh / 2, ww - 2, wh - 2);
    g.lineStyle(0.6, C.white, 0.15);
    g.lineBetween(6, 6, ww / 2 + 2, wh - 6);
    g.lineBetween(4, wh / 2, ww - 4, wh / 2 - 4);
    g.lineBetween(8, wh / 2 + 4, ww - 6, wh / 2 + 2);
    g.lineStyle(3, C.beeWingGlow, 0.06);
    g.strokeEllipse(ww / 2, wh / 2, ww + 4, wh + 4);
    g.generateTexture("wing_l", ww, wh);
    g.clear();
  }

  private genWingR(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const ww = 28, wh = 32;
    g.fillStyle(C.beeWing, 0.3);
    g.fillEllipse(ww / 2, wh / 2, ww - 2, wh - 2);
    g.fillStyle(C.beeWingShine, 0.12);
    g.fillEllipse(ww / 2 + 3, wh / 2 - 4, ww * 0.5, wh * 0.6);
    g.lineStyle(1.2, C.beeWingGlow, 0.45);
    g.strokeEllipse(ww / 2, wh / 2, ww - 2, wh - 2);
    g.lineStyle(0.6, C.white, 0.15);
    g.lineBetween(ww - 6, 6, ww / 2 - 2, wh - 6);
    g.lineBetween(ww - 4, wh / 2, 4, wh / 2 - 4);
    g.lineBetween(ww - 8, wh / 2 + 4, 6, wh / 2 + 2);
    g.lineStyle(3, C.beeWingGlow, 0.06);
    g.strokeEllipse(ww / 2, wh / 2, ww + 4, wh + 4);
    g.generateTexture("wing_r", ww, wh);
    g.clear();
  }

  private genObstacles(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const bw = 76, bh = 52;
    g.fillStyle(C.tunnelDeep, 0.9);
    g.fillRoundedRect(0, 0, bw, bh, 4);
    g.fillStyle(C.laserRed, 0.03);
    g.fillRoundedRect(2, 2, bw - 4, bh - 4, 3);
    for (let i = 0; i < 5; i++) {
      const ly = 7 + i * 10;
      g.lineStyle(2, C.laserRed, 0.65 - i * 0.08);
      g.lineBetween(5, ly, bw - 5, ly);
      g.lineStyle(5, C.laserRedGlow, 0.06);
      g.lineBetween(5, ly, bw - 5, ly);
      g.lineStyle(10, C.laserRed, 0.015);
      g.lineBetween(5, ly, bw - 5, ly);
    }
    g.lineStyle(2, C.laserRed, 0.85);
    g.strokeRoundedRect(1, 1, bw - 2, bh - 2, 4);
    g.lineStyle(5, C.laserRedGlow, 0.1);
    g.strokeRoundedRect(0, 0, bw, bh, 5);
    g.lineStyle(10, C.laserRed, 0.02);
    g.strokeRoundedRect(-2, -2, bw + 4, bh + 4, 6);
    const corners = [[6, 6], [bw - 6, 6], [6, bh - 6], [bw - 6, bh - 6]];
    for (const [cx, cy] of corners) {
      g.fillStyle(C.laserRedBright, 0.9);
      g.fillCircle(cx, cy, 3);
      g.fillStyle(C.white, 0.6);
      g.fillCircle(cx, cy, 1.5);
      g.fillStyle(C.laserRedGlow, 0.15);
      g.fillCircle(cx, cy, 6);
    }
    g.generateTexture("barrier", bw, bh);
    g.clear();

    g.fillStyle(C.tunnelDeep, 0.85);
    g.fillRoundedRect(0, 0, bw, 18, 2);
    g.lineStyle(3, C.neonPink, 0.85);
    g.lineBetween(0, 9, bw, 9);
    g.lineStyle(8, C.neonPinkBright, 0.06);
    g.lineBetween(0, 9, bw, 9);
    g.lineStyle(16, C.neonPink, 0.015);
    g.lineBetween(0, 9, bw, 9);
    g.lineStyle(1, C.neonPink, 0.35);
    g.lineBetween(0, 3, bw, 3);
    g.lineBetween(0, 15, bw, 15);
    g.fillStyle(C.neonPinkBright, 1);
    g.fillCircle(4, 9, 4);
    g.fillCircle(bw - 4, 9, 4);
    g.fillStyle(C.white, 0.6);
    g.fillCircle(4, 8, 1.8);
    g.fillCircle(bw - 4, 8, 1.8);
    g.fillStyle(C.neonPink, 0.1);
    g.fillCircle(4, 9, 8);
    g.fillCircle(bw - 4, 9, 8);
    g.generateTexture("low_gate", bw, 18);
    g.clear();

    g.fillStyle(C.tunnelDeep, 0.9);
    g.fillRoundedRect(0, 0, 30, 82, 4);
    g.lineStyle(2, C.neonPurple, 0.8);
    g.strokeRoundedRect(1, 1, 28, 80, 4);
    g.lineStyle(5, C.neonPurpleDim, 0.12);
    g.strokeRoundedRect(0, 0, 30, 82, 5);
    for (let i = 0; i < 7; i++) {
      g.fillStyle(C.neonPurple, 0.04 + (i % 2) * 0.05);
      g.fillRect(4, 4 + i * 11, 22, 9);
    }
    g.lineStyle(1, C.neonPurple, 0.45);
    g.lineBetween(15, 3, 15, 79);
    g.fillStyle(C.neonPurpleBright, 0.85);
    g.fillCircle(15, 7, 3.5);
    g.fillCircle(15, 75, 3.5);
    g.fillStyle(C.white, 0.5);
    g.fillCircle(15, 6, 1.5);
    g.fillCircle(15, 74, 1.5);
    g.fillStyle(C.neonPurple, 0.08);
    g.fillCircle(15, 7, 7);
    g.fillCircle(15, 75, 7);
    g.generateTexture("lane_blocker", 30, 82);
    g.clear();
  }

  private genCoin(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const s = 14;
    const pad = 5;
    const cs = s + pad;

    g.fillStyle(C.coinAmber, 0.06);
    g.fillCircle(cs, cs, s + 4);

    fillHex(g, cs, cs, s, C.coinGold, 1);
    fillHex(g, cs, cs, s - 1.5, C.coinGoldLight, 0.25);
    fillHex(g, cs, cs, s - 3, C.coinGold, 0.3);
    strokeHex(g, cs, cs, s, C.coinShine, 0.6, 2);
    strokeHex(g, cs, cs, s + 2, C.coinAmber, 0.12, 3);
    strokeHex(g, cs, cs, s + 4, C.coinAmber, 0.03, 5);

    fillHex(g, cs, cs, 5.5, C.coinAmber, 0.55);
    strokeHex(g, cs, cs, 5.5, C.coinShine, 0.4, 1);

    g.fillStyle(C.coinShine, 0.15);
    g.fillEllipse(cs - 3, cs - 3, 6, 10);

    g.generateTexture("coin", cs * 2, cs * 2);
    g.clear();
  }

  private genPowerups(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const s = 17;

    g.fillStyle(C.magnetBlue, 0.05);
    g.fillCircle(s, s, s + 3);
    g.fillStyle(C.tunnelDeep, 0.92);
    g.fillRoundedRect(0, 0, s * 2, s * 2, 10);
    g.lineStyle(2, C.magnetBlue, 0.85);
    g.strokeRoundedRect(0, 0, s * 2, s * 2, 10);
    g.lineStyle(4, C.magnetBlueBright, 0.08);
    g.strokeRoundedRect(-1, -1, s * 2 + 2, s * 2 + 2, 11);
    g.lineStyle(3.5, C.magnetBlue, 0.75);
    g.beginPath(); g.arc(s, s - 2, 7, PI, 0, false); g.strokePath();
    g.fillStyle(C.magnetBlue, 1);
    g.fillRect(s - 7, s - 2, 4, 14);
    g.fillRect(s + 3, s - 2, 4, 14);
    g.fillStyle(C.laserRedGlow, 0.9);
    g.fillRect(s - 7, s + 8, 4, 4);
    g.fillStyle(C.neonCyan, 0.9);
    g.fillRect(s + 3, s + 8, 4, 4);
    g.fillStyle(C.white, 0.2);
    g.fillRect(s - 6, s - 1, 2, 4);
    g.generateTexture("magnet", s * 2, s * 2);
    g.clear();

    g.fillStyle(C.shieldGreen, 0.05);
    g.fillCircle(s, s, s + 3);
    g.fillStyle(C.tunnelDeep, 0.92);
    g.fillRoundedRect(0, 0, s * 2, s * 2, 10);
    g.lineStyle(2, C.shieldGreen, 0.85);
    g.strokeRoundedRect(0, 0, s * 2, s * 2, 10);
    g.lineStyle(4, C.shieldGreenBright, 0.08);
    g.strokeRoundedRect(-1, -1, s * 2 + 2, s * 2 + 2, 11);
    g.lineStyle(2.5, C.shieldGreen, 0.8);
    g.beginPath();
    g.moveTo(s, 4); g.lineTo(s + 9, 9); g.lineTo(s + 9, 19);
    g.lineTo(s, 27); g.lineTo(s - 9, 19); g.lineTo(s - 9, 9);
    g.closePath(); g.strokePath();
    g.fillStyle(C.shieldGreen, 0.18);
    g.beginPath();
    g.moveTo(s, 4); g.lineTo(s + 9, 9); g.lineTo(s + 9, 19);
    g.lineTo(s, 27); g.lineTo(s - 9, 19); g.lineTo(s - 9, 9);
    g.closePath(); g.fillPath();
    g.fillStyle(C.shieldGreenBright, 0.15);
    g.fillEllipse(s - 2, 12, 6, 8);
    g.generateTexture("shield_pu", s * 2, s * 2);
    g.clear();

    g.fillStyle(C.boostOrange, 0.05);
    g.fillCircle(s, s, s + 3);
    g.fillStyle(C.tunnelDeep, 0.92);
    g.fillRoundedRect(0, 0, s * 2, s * 2, 10);
    g.lineStyle(2, C.boostOrange, 0.85);
    g.strokeRoundedRect(0, 0, s * 2, s * 2, 10);
    g.lineStyle(4, C.boostOrangeBright, 0.08);
    g.strokeRoundedRect(-1, -1, s * 2 + 2, s * 2 + 2, 11);
    g.fillStyle(C.boostOrange, 1);
    g.fillTriangle(s - 5, s + 8, s + 1, s - 10, s + 3, s + 2);
    g.fillStyle(C.boostOrangeBright, 1);
    g.fillTriangle(s - 3, s + 2, s + 5, s + 2, s + 1, s + 10);
    g.fillStyle(C.white, 0.3);
    g.fillTriangle(s - 2, s + 5, s, s - 6, s + 1, s + 1);
    g.generateTexture("boost_pu", s * 2, s * 2);
    g.clear();
  }

  private genGround(g: Phaser.GameObjects.Graphics) {
    const tW = LANE_WIDTH * 3 + 20;
    g.clear();

    g.fillGradientStyle(C.tunnelMid, C.tunnelMid, C.tunnelDeep, C.tunnelDeep, 0.65);
    g.fillRect(0, 0, tW, 26);

    for (let i = 0; i < tW; i += 5) {
      const brightness = (i % 10 === 0) ? 0.03 : 0.015;
      g.fillStyle(C.neonCyan, brightness);
      g.fillRect(i, 0, 2, 26);
    }

    g.lineStyle(2.5, C.hexRingAmber, 0.55);
    g.lineBetween(0, 0, tW, 0);
    g.lineStyle(6, C.hexRingAmberBright, 0.06);
    g.lineBetween(0, 0, tW, 0);
    g.lineStyle(14, C.hexRingAmber, 0.015);
    g.lineBetween(0, 0, tW, 0);

    g.lineStyle(1, C.neonCyanDim, 0.12);
    g.lineBetween(0, 25, tW, 25);

    for (let i = 1; i < 3; i++) {
      const lx = i * LANE_WIDTH + 10;
      g.lineStyle(1, C.hexRingAmber, 0.12);
      g.lineBetween(lx, 0, lx, 26);
    }

    g.generateTexture("ground_tile", tW, 26);
    g.clear();
  }

  private genParticles(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(C.hexRingAmberBright, 0.85);
    g.fillCircle(6, 6, 5);
    g.fillStyle(C.hexRingAmberHot, 0.4);
    g.fillCircle(5, 5, 2.5);
    g.fillStyle(C.white, 0.3);
    g.fillCircle(4.5, 4.5, 1.2);
    g.generateTexture("particle_amber", 12, 12);
    g.clear();

    g.fillStyle(C.neonCyan, 0.75);
    g.fillCircle(5, 5, 4.5);
    g.fillStyle(C.neonCyanBright, 0.35);
    g.fillCircle(4, 4, 2);
    g.fillStyle(C.white, 0.25);
    g.fillCircle(3.5, 3.5, 1);
    g.generateTexture("particle_cyan", 10, 10);
    g.clear();

    g.fillStyle(C.white, 0.5);
    g.fillRect(0, 0, 2, 14);
    g.fillStyle(C.neonCyan, 0.25);
    g.fillRect(0, 0, 2, 14);
    g.fillStyle(C.white, 0.4);
    g.fillRect(0, 0, 2, 3);
    g.generateTexture("speed_line", 2, 14);
    g.clear();

    g.fillStyle(C.hexRingAmber, 0.5);
    g.fillRect(0, 0, 3, 3);
    g.generateTexture("spark", 3, 3);
    g.clear();
  }

  private genHexFrame(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    const cx = W / 2, cy = H * 0.42;
    const sizes = [110, 130, 155, 185];
    const alphas = [0.25, 0.15, 0.08, 0.04];
    const widths = [2, 1.5, 1, 0.5];
    for (let i = 0; i < sizes.length; i++) {
      strokeHex(g, cx, cy, sizes[i], C.hexRingAmber, alphas[i], widths[i]);
      if (i < 2) {
        strokeHex(g, cx, cy, sizes[i] + 3, C.hexRingAmber, alphas[i] * 0.3, widths[i] + 3);
      }
    }
    g.generateTexture("hex_frame", W, H);
    g.clear();
  }
}

class MenuScene extends Phaser.Scene {
  constructor() { super({ key: "Menu" }); }

  create() {
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "bg_tunnel").setOrigin(0, 0);
    this.add.image(CX, GAME_HEIGHT / 2, "nebula").setOrigin(0.5).setAlpha(0.7);
    const stars = this.add.image(CX, GAME_HEIGHT / 2, "stars").setOrigin(0.5).setAlpha(0.8);
    this.tweens.add({ targets: stars, alpha: 0.5, duration: 3000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    this.add.rectangle(CX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.2);

    this.add.image(CX, GAME_HEIGHT * 0.42, "hex_frame").setOrigin(0.5).setAlpha(0.9);

    const titleGlow = this.add.text(CX, 78, "HONEY", {
      fontSize: "56px", fontFamily: "monospace", color: "#f5a000",
      fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0.08);
    this.tweens.add({ targets: titleGlow, alpha: 0.15, scaleX: 1.02, scaleY: 1.02, duration: 2500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    this.add.text(CX, 78, "HONEY", {
      fontSize: "52px", fontFamily: "monospace", color: "#ffb300",
      fontStyle: "bold", stroke: "#6a3a00", strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(CX, 130, "RUNNER", {
      fontSize: "36px", fontFamily: "monospace", color: "#ffd54f",
      fontStyle: "bold", stroke: "#6a3a00", strokeThickness: 4,
    }).setOrigin(0.5);

    const subtitle = this.add.text(CX, 160, "C Y B E R   H I V E", {
      fontSize: "10px", fontFamily: "monospace", color: "#00e5ff",
      letterSpacing: 4,
    }).setOrigin(0.5);
    this.tweens.add({ targets: subtitle, alpha: 0.4, duration: 2000, yoyo: true, repeat: -1 });

    const beeGlowOuter = this.add.circle(CX, 248, 50, C.hexRingAmber, 0.02);
    this.tweens.add({ targets: beeGlowOuter, scaleX: 1.6, scaleY: 1.6, alpha: 0, duration: 2500, repeat: -1 });
    const beeGlowInner = this.add.circle(CX, 248, 35, C.hexRingAmberBright, 0.04);
    this.tweens.add({ targets: beeGlowInner, scaleX: 1.3, scaleY: 1.3, alpha: 0, duration: 2000, repeat: -1, delay: 400 });

    const shadow = this.add.image(CX, 296, "bee_shadow").setScale(4).setAlpha(0.35);
    const beeBody = this.add.image(CX, 248, "runner").setScale(3.5);
    const wingL = this.add.image(CX - 20, 226, "wing_l").setScale(3.2).setAlpha(0.7);
    const wingR = this.add.image(CX + 20, 226, "wing_r").setScale(3.2).setAlpha(0.7);

    this.tweens.add({ targets: beeBody, y: 242, duration: 1600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: shadow, scaleX: 3.5, alpha: 0.25, duration: 1600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: wingL, scaleY: 1.5, scaleX: 3.5, alpha: 0.35, duration: 55, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: wingR, scaleY: 1.5, scaleX: 3.5, alpha: 0.35, duration: 55, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: [wingL, wingR], y: 220, duration: 1600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const bestScore = getBestScore();
    if (bestScore > 0) {
      this.add.text(CX, 326, `BEST: ${bestScore.toLocaleString()}`, {
        fontSize: "17px", fontFamily: "monospace", color: "#ffd54f",
        fontStyle: "bold", stroke: "#000", strokeThickness: 4,
      }).setOrigin(0.5);
    }

    const btnGlowOuter = this.add.rectangle(CX, 382, 200, 58, C.hexRingAmber, 0.04);
    this.tweens.add({ targets: btnGlowOuter, scaleX: 1.25, scaleY: 1.3, alpha: 0, duration: 2000, repeat: -1 });

    const playBtn = this.add.rectangle(CX, 382, 184, 52, C.beeGold, 1).setInteractive({ useHandCursor: true });
    playBtn.setStrokeStyle(2.5, C.hexRingAmberBright);
    this.add.text(CX, 382, "PLAY", {
      fontSize: "24px", fontFamily: "monospace", color: "#1a0a00", fontStyle: "bold",
    }).setOrigin(0.5);
    playBtn.on("pointerdown", () => this.scene.start("Game"));
    this.tweens.add({ targets: playBtn, scaleX: 1.03, scaleY: 1.03, duration: 1000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const controls = [
      "CONTROLS:",
      "",
      "Arrow Left / Right \u2013 Change Lane",
      "Arrow Up / Swipe Up \u2013 Jump",
      "Arrow Down / Swipe Down \u2013 Slide",
      "",
      "Collect honey & dodge lasers!",
    ];
    this.add.text(CX, 492, controls.join("\n"), {
      fontSize: "9px", fontFamily: "monospace", color: "#3a5570",
      align: "center", lineSpacing: 5,
    }).setOrigin(0.5);

    this.add.text(CX, GAME_HEIGHT - 30, "A Honeycomb Arena Game", {
      fontSize: "8px", fontFamily: "monospace", color: "#1a2535",
    }).setOrigin(0.5);

    this.add.image(CX, GAME_HEIGHT / 2, "scanlines").setOrigin(0.5).setAlpha(0.3);
    this.add.image(CX, GAME_HEIGHT / 2, "vignette").setOrigin(0.5).setAlpha(0.8);
  }
}

interface PowerupState {
  magnet: boolean;
  shield: boolean;
  boost: boolean;
  magnetTimer?: Phaser.Time.TimerEvent;
  shieldTimer?: Phaser.Time.TimerEvent;
  boostTimer?: Phaser.Time.TimerEvent;
}

class GameScene extends Phaser.Scene {
  private runner!: Phaser.Physics.Arcade.Sprite;
  private wingL!: Phaser.GameObjects.Image;
  private wingR!: Phaser.GameObjects.Image;
  private beeShadow!: Phaser.GameObjects.Image;
  private laneIndex = 1;
  private isSliding = false;
  private slideTimer?: Phaser.Time.TimerEvent;
  private speed = INITIAL_SPEED;
  private distance = 0;
  private score = 0;
  private coinCount = 0;
  private isAlive = true;

  private obstacles!: Phaser.Physics.Arcade.Group;
  private coins!: Phaser.Physics.Arcade.Group;
  private powerups!: Phaser.Physics.Arcade.Group;

  private powerupState: PowerupState = { magnet: false, shield: false, boost: false };

  private scoreText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private powerupIcons: Phaser.GameObjects.Container[] = [];

  private bgTunnel!: Phaser.GameObjects.TileSprite;
  private bgNebula!: Phaser.GameObjects.TileSprite;
  private bgStars!: Phaser.GameObjects.Image;
  private groundTiles: Phaser.GameObjects.TileSprite[] = [];

  private obstacleTimer?: Phaser.Time.TimerEvent;
  private coinTimer?: Phaser.Time.TimerEvent;
  private powerupTimer?: Phaser.Time.TimerEvent;

  private swipeStart: { x: number; y: number; time: number } | null = null;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;

  private shieldSprite?: Phaser.GameObjects.Arc;
  private speedLines: Phaser.GameObjects.Image[] = [];
  private frameCount = 0;

  private scanlineOverlay!: Phaser.GameObjects.Image;
  private vignetteOverlay!: Phaser.GameObjects.Image;

  constructor() { super({ key: "Game" }); }

  create() {
    this.laneIndex = 1;
    this.isSliding = false;
    this.speed = INITIAL_SPEED;
    this.distance = 0;
    this.score = 0;
    this.coinCount = 0;
    this.isAlive = true;
    this.powerupState = { magnet: false, shield: false, boost: false };
    this.powerupIcons = [];
    this.speedLines = [];
    this.frameCount = 0;

    this.bgTunnel = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "bg_tunnel").setOrigin(0, 0).setScrollFactor(0);
    this.bgNebula = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "nebula").setOrigin(0, 0).setScrollFactor(0).setAlpha(0.4);
    this.bgStars = this.add.image(CX, GAME_HEIGHT / 2, "stars").setOrigin(0.5).setAlpha(0.5);

    const laneArea = this.add.rectangle(CX, GROUND_Y - 50, LANE_WIDTH * 3 + 14, 220, C.tunnelDeep, 0.3);

    for (let i = 0; i <= LANE_COUNT; i++) {
      const lx = CX + LANE_POSITIONS[0] - LANE_WIDTH / 2 + i * LANE_WIDTH;
      const isEdge = (i === 0 || i === LANE_COUNT);
      this.add.line(0, 0, lx, GROUND_Y - 160, lx, GROUND_Y + 26, C.hexRingAmber, isEdge ? 0.18 : 0.06).setOrigin(0, 0);
      if (isEdge) {
        this.add.line(0, 0, lx, GROUND_Y - 160, lx, GROUND_Y + 26, C.hexRingAmber, 0.03).setOrigin(0, 0).setLineWidth(4);
      }
    }

    const gt = this.add.tileSprite(CX, GROUND_Y, LANE_WIDTH * 3 + 20, 26, "ground_tile");
    this.groundTiles.push(gt);

    this.obstacles = this.physics.add.group({ allowGravity: false });
    this.coins = this.physics.add.group({ allowGravity: false });
    this.powerups = this.physics.add.group({ allowGravity: false });

    this.beeShadow = this.add.image(CX, GROUND_Y - 6, "bee_shadow").setScale(1.8).setAlpha(0.3).setDepth(4);

    this.runner = this.physics.add.sprite(CX, RUNNER_Y, "runner");
    this.runner.setCollideWorldBounds(false);
    this.runner.setGravityY(GRAVITY);
    this.runner.setSize(38, 48);
    this.runner.setDepth(10);

    this.wingL = this.add.image(CX - 18, RUNNER_Y - 12, "wing_l").setScale(1.3).setAlpha(0.65).setDepth(9);
    this.wingR = this.add.image(CX + 18, RUNNER_Y - 12, "wing_r").setScale(1.3).setAlpha(0.65).setDepth(11);

    this.tweens.add({ targets: this.wingL, scaleY: 0.4, alpha: 0.25, duration: 45, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: this.wingR, scaleY: 0.4, alpha: 0.25, duration: 45, yoyo: true, repeat: -1 });

    this.particles = this.add.particles(0, 0, "particle_amber", {
      speed: { min: 25, max: 70 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.65, end: 0 },
      lifespan: 550,
      frequency: 45,
      follow: this.runner,
      followOffset: { x: 0, y: 26 },
      blendMode: "ADD",
      tint: [C.hexRingAmberBright, C.hexRingAmberHot, C.neonCyan],
    }).setDepth(8);

    this.shieldSprite = this.add.circle(CX, RUNNER_Y, 36, C.shieldGreen, 0.1);
    this.shieldSprite.setStrokeStyle(2, C.shieldGreenBright, 0.5);
    this.shieldSprite.setVisible(false);
    this.shieldSprite.setDepth(12);

    this.physics.add.overlap(this.runner, this.obstacles, this.hitObstacle, undefined, this);
    this.physics.add.overlap(this.runner, this.coins, this.collectCoin, undefined, this);
    this.physics.add.overlap(this.runner, this.powerups, this.collectPowerup, undefined, this);

    this.scheduleObstacle();
    this.coinTimer = this.time.addEvent({ delay: COIN_SPAWN_INTERVAL, callback: this.spawnCoin, callbackScope: this, loop: true });
    this.powerupTimer = this.time.addEvent({ delay: POWERUP_SPAWN_INTERVAL, callback: this.spawnPowerup, callbackScope: this, loop: true });

    this.setupInput();
    this.createHUD();

    this.scanlineOverlay = this.add.image(CX, GAME_HEIGHT / 2, "scanlines").setOrigin(0.5).setAlpha(0.15).setDepth(99).setScrollFactor(0);
    this.vignetteOverlay = this.add.image(CX, GAME_HEIGHT / 2, "vignette").setOrigin(0.5).setAlpha(0.6).setDepth(100).setScrollFactor(0);
  }

  private createHUD() {
    const hudBg = this.add.rectangle(CX, 18, GAME_WIDTH - 16, 32, C.hudBg, 0.75).setDepth(90).setScrollFactor(0);
    hudBg.setStrokeStyle(1, C.hudBorder, 0.3);

    this.scoreText = this.add.text(CX, 18, "0", {
      fontSize: "18px", fontFamily: "monospace", color: "#ffb300",
      fontStyle: "bold", stroke: "#000", strokeThickness: 3,
    }).setOrigin(0.5).setDepth(91).setScrollFactor(0);

    this.coinText = this.add.text(66, 18, " 0", {
      fontSize: "13px", fontFamily: "monospace", color: "#ffd740",
      stroke: "#000", strokeThickness: 2,
    }).setOrigin(0, 0.5).setDepth(91).setScrollFactor(0);

    const coinIcon = this.add.image(52, 18, "coin").setScale(0.6).setDepth(91).setScrollFactor(0);

    this.speedText = this.add.text(GAME_WIDTH - 16, 18, `${INITIAL_SPEED.toFixed(1)}x`, {
      fontSize: "11px", fontFamily: "monospace", color: "#00e5ff",
      stroke: "#000", strokeThickness: 2,
    }).setOrigin(1, 0.5).setDepth(91).setScrollFactor(0);
  }

  private setupInput() {
    const cursors = this.input.keyboard?.createCursorKeys();
    if (cursors) {
      cursors.left?.on("down", () => this.moveLeft());
      cursors.right?.on("down", () => this.moveRight());
      cursors.up?.on("down", () => this.jump());
      cursors.down?.on("down", () => this.slide());
    }

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.swipeStart = { x: p.x, y: p.y, time: this.time.now };
    });

    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (!this.swipeStart) return;
      const dx = p.x - this.swipeStart.x;
      const dy = p.y - this.swipeStart.y;
      const dt = this.time.now - this.swipeStart.time;
      this.swipeStart = null;
      if (dt > 500) return;
      const absDx = Math.abs(dx), absDy = Math.abs(dy);
      if (absDx < 30 && absDy < 30) return;
      if (absDx > absDy) { dx > 0 ? this.moveRight() : this.moveLeft(); }
      else { dy < 0 ? this.jump() : this.slide(); }
    });
  }

  private moveLeft() { if (this.isAlive && this.laneIndex > 0) { this.laneIndex--; this.tweens.add({ targets: this.runner, x: CX + LANE_POSITIONS[this.laneIndex], duration: 120, ease: "Power2" }); } }
  private moveRight() { if (this.isAlive && this.laneIndex < LANE_COUNT - 1) { this.laneIndex++; this.tweens.add({ targets: this.runner, x: CX + LANE_POSITIONS[this.laneIndex], duration: 120, ease: "Power2" }); } }

  private jump() {
    if (!this.isAlive) return;
    const body = this.runner.body as Phaser.Physics.Arcade.Body;
    const onGround = body.y + body.height >= GROUND_Y - 2;
    if (onGround) body.setVelocityY(JUMP_VELOCITY);
  }

  private slide() {
    if (!this.isAlive || this.isSliding) return;
    this.isSliding = true;
    this.runner.setTexture("runner_slide");
    this.runner.setSize(46, 22);
    this.runner.y = GROUND_Y - 14;
    this.slideTimer = this.time.delayedCall(SLIDE_DURATION, () => {
      if (!this.isAlive) return;
      this.isSliding = false;
      this.runner.setTexture("runner");
      this.runner.setSize(38, 48);
    });
  }

  private scheduleObstacle() {
    const delay = Phaser.Math.Between(OBSTACLE_SPAWN_INTERVAL_MIN, OBSTACLE_SPAWN_INTERVAL_MAX);
    this.obstacleTimer = this.time.delayedCall(delay, () => {
      this.spawnObstacle();
      if (this.isAlive) this.scheduleObstacle();
    });
  }

  private spawnObstacle() {
    const lane = Phaser.Math.Between(0, LANE_COUNT - 1);
    const type = Phaser.Math.Between(0, 2);
    const textures = ["barrier", "low_gate", "lane_blocker"];
    const obs = this.obstacles.create(CX + LANE_POSITIONS[lane], -60, textures[type]) as Phaser.Physics.Arcade.Sprite;
    obs.setImmovable(true);
    obs.setDepth(6);
    if (type === 1) { obs.y = -20; obs.setSize(76, 14); }
    else if (type === 2) { obs.setSize(26, 76); }
    else obs.setSize(70, 44);
  }

  private spawnCoin() {
    const lane = Phaser.Math.Between(0, LANE_COUNT - 1);
    const coin = this.coins.create(CX + LANE_POSITIONS[lane], -30, "coin") as Phaser.Physics.Arcade.Sprite;
    coin.setDepth(5);
    coin.setSize(22, 22);
    this.tweens.add({ targets: coin, scaleX: 0.7, duration: 400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  private spawnPowerup() {
    const lane = Phaser.Math.Between(0, LANE_COUNT - 1);
    const types = ["magnet", "shield_pu", "boost_pu"];
    const tex = types[Phaser.Math.Between(0, 2)];
    const pu = this.powerups.create(CX + LANE_POSITIONS[lane], -30, tex) as Phaser.Physics.Arcade.Sprite;
    pu.setDepth(5);
    pu.setSize(28, 28);
    this.tweens.add({ targets: pu, angle: 360, duration: 3000, repeat: -1 });
    this.tweens.add({ targets: pu, scaleX: 1.15, scaleY: 1.15, duration: 600, yoyo: true, repeat: -1 });
  }

  private hitObstacle(_runner: any, obstacle: any) {
    if (this.powerupState.shield) {
      obstacle.destroy();
      this.powerupState.shield = false;
      if (this.powerupState.shieldTimer) this.powerupState.shieldTimer.destroy();
      this.shieldSprite?.setVisible(false);
      this.removePowerupIcon("shield");

      for (let i = 0; i < 8; i++) {
        const spark = this.add.image(this.runner.x, this.runner.y, "spark")
          .setScale(2).setAlpha(0.8).setDepth(20).setTint(C.shieldGreenBright);
        this.tweens.add({
          targets: spark, x: spark.x + Phaser.Math.Between(-60, 60), y: spark.y + Phaser.Math.Between(-60, 60),
          alpha: 0, scale: 0, duration: 400, onComplete: () => spark.destroy()
        });
      }
      return;
    }
    if (!this.isAlive) return;
    this.isAlive = false;

    this.cameras.main.shake(250, 0.012);
    this.cameras.main.flash(200, 255, 20, 20, false, undefined, undefined);

    for (let i = 0; i < 12; i++) {
      const spark = this.add.image(this.runner.x, this.runner.y, "spark")
        .setScale(2.5).setAlpha(0.9).setDepth(20).setTint(C.laserRedBright);
      this.tweens.add({
        targets: spark, x: spark.x + Phaser.Math.Between(-80, 80), y: spark.y + Phaser.Math.Between(-80, 80),
        alpha: 0, scale: 0, duration: 500, onComplete: () => spark.destroy()
      });
    }

    const finalScore = this.score + Math.floor(this.distance);
    const bestScore = getBestScore();
    const isNewBest = finalScore > bestScore;
    if (isNewBest) setBestScore(finalScore);
    addCoins(this.coinCount);
    incrementRuns();

    this.runner.setTint(0xff3333);
    this.tweens.add({ targets: this.runner, alpha: 0, duration: 600 });
    this.tweens.add({ targets: [this.wingL, this.wingR], alpha: 0, duration: 400 });

    this.time.delayedCall(800, () => {
      this.groundTiles = [];
      this.scene.start("GameOver", {
        score: finalScore, coins: this.coinCount,
        distance: Math.floor(this.distance), bestScore: isNewBest ? finalScore : bestScore,
        isNewBest, speed: this.speed,
      });
    });
  }

  private collectCoin(_runner: any, coin: any) {
    coin.destroy();
    this.coinCount++;
    this.score += COIN_SCORE;

    const popup = this.add.text(this.runner.x + 15, this.runner.y - 20, `+${COIN_SCORE}`, {
      fontSize: "13px", fontFamily: "monospace", color: "#ffd740", fontStyle: "bold",
      stroke: "#000", strokeThickness: 2,
    }).setDepth(30);
    this.tweens.add({ targets: popup, y: popup.y - 35, alpha: 0, duration: 500, onComplete: () => popup.destroy() });
  }

  private collectPowerup(_runner: any, pu: any) {
    const tex = pu.texture.key;
    pu.destroy();

    if (tex === "magnet") this.activatePowerup("magnet", MAGNET_DURATION, C.magnetBlueBright);
    else if (tex === "shield_pu") this.activatePowerup("shield", SHIELD_DURATION, C.shieldGreenBright);
    else if (tex === "boost_pu") this.activatePowerup("boost", BOOST_DURATION, C.boostOrangeBright);
  }

  private activatePowerup(type: "magnet" | "shield" | "boost", duration: number, color: number) {
    this.powerupState[type] = true;
    const timerKey = `${type}Timer` as "magnetTimer" | "shieldTimer" | "boostTimer";
    if (this.powerupState[timerKey]) this.powerupState[timerKey]!.destroy();
    this.powerupState[timerKey] = this.time.delayedCall(duration, () => {
      this.powerupState[type] = false;
      this.removePowerupIcon(type);
      if (type === "shield") this.shieldSprite?.setVisible(false);
    });

    if (type === "shield") this.shieldSprite?.setVisible(true);

    this.removePowerupIcon(type);
    const iconBg = this.add.rectangle(0, 0, 26, 26, color, 0.15).setStrokeStyle(1, color, 0.5);
    const label = this.add.text(0, 0, type[0].toUpperCase(), {
      fontSize: "12px", fontFamily: "monospace", color: `#${color.toString(16).padStart(6, "0")}`,
      fontStyle: "bold",
    }).setOrigin(0.5);
    const container = this.add.container(20 + this.powerupIcons.length * 30, 48, [iconBg, label]).setDepth(91);
    (container as any).__puType = type;
    this.powerupIcons.push(container);
  }

  private removePowerupIcon(type: string) {
    this.powerupIcons = this.powerupIcons.filter((c) => {
      if ((c as any).__puType === type) { c.destroy(); return false; }
      return true;
    });
  }

  update(_time: number, delta: number) {
    if (!this.isAlive) return;

    this.frameCount++;

    this.speed = Math.min(MAX_SPEED, this.speed + SPEED_RAMP * (delta / 16));
    const effectiveSpeed = this.powerupState.boost ? this.speed * BOOST_SPEED_MULT : this.speed;
    this.distance += effectiveSpeed * (delta / 16) * 0.15;
    this.score += Math.floor(effectiveSpeed * (delta / 16) * 0.1);

    this.bgTunnel.tilePositionY -= effectiveSpeed * 0.3;
    this.bgNebula.tilePositionY -= effectiveSpeed * 0.15;
    this.bgNebula.tilePositionX += 0.08;

    this.groundTiles.forEach((gt) => { gt.tilePositionY -= effectiveSpeed * 0.5; });

    const beeBaseY = this.runner.y;
    const targetX = CX + LANE_POSITIONS[this.laneIndex];
    this.wingL.x = this.runner.x - 18;
    this.wingR.x = this.runner.x + 18;
    this.wingL.y = beeBaseY - 14;
    this.wingR.y = beeBaseY - 14;

    this.beeShadow.x = this.runner.x;
    const shadowDist = Math.max(0, GROUND_Y - beeBaseY);
    const shadowScale = Math.max(0.5, 1.8 - shadowDist * 0.009);
    const shadowAlpha = Math.max(0.08, 0.3 - shadowDist * 0.002);
    this.beeShadow.setScale(shadowScale).setAlpha(shadowAlpha);

    if (this.shieldSprite) {
      this.shieldSprite.x = this.runner.x;
      this.shieldSprite.y = this.runner.y;
    }

    const body = this.runner.body as Phaser.Physics.Arcade.Body;
    if (!this.isSliding && body.y + body.height > GROUND_Y) {
      body.y = GROUND_Y - body.height;
      body.setVelocityY(0);
    }

    if (effectiveSpeed > 7 && this.frameCount % 3 === 0) {
      const sl = this.add.image(
        Phaser.Math.Between(20, GAME_WIDTH - 20),
        -10,
        "speed_line"
      ).setAlpha(0.15 + (effectiveSpeed - 7) * 0.04).setScale(1, 1 + effectiveSpeed * 0.15).setDepth(2);
      this.tweens.add({
        targets: sl, y: GAME_HEIGHT + 20, alpha: 0,
        duration: 300 + Phaser.Math.Between(0, 200),
        onComplete: () => sl.destroy()
      });
    }

    this.obstacles.getChildren().forEach((obj) => {
      const obs = obj as Phaser.Physics.Arcade.Sprite;
      obs.y += effectiveSpeed * (delta / 16) * 2;
      if (obs.y > GAME_HEIGHT + 100) obs.destroy();
    });

    this.coins.getChildren().forEach((obj) => {
      const coin = obj as Phaser.Physics.Arcade.Sprite;
      coin.y += effectiveSpeed * (delta / 16) * 2;
      if (coin.y > GAME_HEIGHT + 50) coin.destroy();
      if (this.powerupState.magnet) {
        const dx = this.runner.x - coin.x;
        const dy = this.runner.y - coin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150 && dist > 5) { coin.x += (dx / dist) * 8; coin.y += (dy / dist) * 8; }
      }
    });

    this.powerups.getChildren().forEach((obj) => {
      const pu = obj as Phaser.Physics.Arcade.Sprite;
      pu.y += effectiveSpeed * (delta / 16) * 2;
      if (pu.y > GAME_HEIGHT + 50) pu.destroy();
    });

    this.scoreText.setText(this.score.toLocaleString());
    this.coinText.setText(` ${this.coinCount}`);
    this.speedText.setText(`${effectiveSpeed.toFixed(1)}x`);
  }
}

class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: "GameOver" }); }

  create(data: { score: number; coins: number; distance: number; bestScore: number; isNewBest: boolean; speed: number }) {
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "bg_tunnel").setOrigin(0, 0);
    this.add.image(CX, GAME_HEIGHT / 2, "nebula").setOrigin(0.5).setAlpha(0.4);
    this.add.rectangle(CX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5);

    const titleGlow = this.add.text(CX, 50, "GAME OVER", {
      fontSize: "40px", fontFamily: "monospace", color: "#ff1744",
      fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0.1);
    this.tweens.add({ targets: titleGlow, alpha: 0.2, duration: 2000, yoyo: true, repeat: -1 });

    this.add.text(CX, 50, "GAME OVER", {
      fontSize: "38px", fontFamily: "monospace", color: "#ff1744",
      fontStyle: "bold", stroke: "#400", strokeThickness: 5,
    }).setOrigin(0.5);

    if (data.isNewBest) {
      const nb = this.add.text(CX, 90, "NEW BEST!", {
        fontSize: "22px", fontFamily: "monospace", color: "#ffd54f",
        fontStyle: "bold", stroke: "#7a4a00", strokeThickness: 4,
      }).setOrigin(0.5);
      this.tweens.add({ targets: nb, scaleX: 1.08, scaleY: 1.08, duration: 600, yoyo: true, repeat: -1 });
    }

    const beeGlow = this.add.circle(CX, 138, 30, C.hexRingAmber, 0.04);
    this.tweens.add({ targets: beeGlow, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 2000, repeat: -1 });

    const bee = this.add.image(CX, 138, "runner").setScale(2.4);
    this.tweens.add({ targets: bee, y: 133, duration: 1500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const statsY = 180;
    const stats = [
      { label: "SCORE", value: data.score.toLocaleString(), color: "#ffb300" },
      { label: "HONEY", value: data.coins.toString(), color: "#ffd54f" },
      { label: "DISTANCE", value: `${data.distance.toLocaleString()}m`, color: "#00e5ff" },
      { label: "TOP SPEED", value: `${data.speed.toFixed(1)}x`, color: "#ff6d00" },
      { label: "BEST", value: data.bestScore.toLocaleString(), color: "#f5a000" },
    ];

    stats.forEach((s, i) => {
      const y = statsY + i * 48;
      const rowBg = this.add.rectangle(CX, y + 8, 290, 40, C.hudBg, 0.8);
      rowBg.setStrokeStyle(1, C.hudBorder, 0.2);
      this.add.text(CX - 130, y - 1, s.label, {
        fontSize: "10px", fontFamily: "monospace", color: "#3a5570",
      });
      const val = this.add.text(CX + 130, y + 13, s.value, {
        fontSize: "20px", fontFamily: "monospace", color: s.color, fontStyle: "bold",
        stroke: "#000", strokeThickness: 2,
      }).setOrigin(1, 0.5).setAlpha(0);
      this.tweens.add({ targets: val, alpha: 1, x: CX + 130, duration: 300, delay: i * 100, ease: "Power2" });
    });

    const btnGlow = this.add.rectangle(CX, 455, 210, 56, C.hexRingAmber, 0.04);
    this.tweens.add({ targets: btnGlow, scaleX: 1.2, scaleY: 1.2, alpha: 0, duration: 1800, repeat: -1 });

    const retryBtn = this.add.rectangle(CX, 455, 200, 50, C.beeGold, 1).setInteractive({ useHandCursor: true });
    retryBtn.setStrokeStyle(2.5, C.hexRingAmberBright);
    this.add.text(CX, 455, "PLAY AGAIN", { fontSize: "18px", fontFamily: "monospace", color: "#1a0a00", fontStyle: "bold" }).setOrigin(0.5);
    retryBtn.on("pointerdown", () => this.scene.start("Game"));
    this.tweens.add({ targets: retryBtn, scaleX: 1.03, scaleY: 1.03, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const menuBtn = this.add.rectangle(CX, 518, 200, 40, C.tunnelMid, 1).setInteractive({ useHandCursor: true });
    menuBtn.setStrokeStyle(1, C.hexRingAmber, 0.2);
    this.add.text(CX, 518, "MENU", { fontSize: "14px", fontFamily: "monospace", color: "#f5a000" }).setOrigin(0.5);
    menuBtn.on("pointerdown", () => this.scene.start("Menu"));

    this.input.keyboard?.once("keydown-SPACE", () => this.scene.start("Game"));
    this.input.keyboard?.once("keydown-ENTER", () => this.scene.start("Game"));

    this.add.image(CX, GAME_HEIGHT / 2, "scanlines").setOrigin(0.5).setAlpha(0.2);
    this.add.image(CX, GAME_HEIGHT / 2, "vignette").setOrigin(0.5).setAlpha(0.7);
  }
}

export function createHoneyRunnerGame(parent: HTMLElement): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: "#030008",
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, MenuScene, GameScene, GameOverScene],
    input: { activePointers: 3 },
    render: { pixelArt: false, antialias: true },
  };
  return new Phaser.Game(config);
}
