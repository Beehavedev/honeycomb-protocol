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
    g.destroy();
    this.scene.start("Menu");
  }

  private genBg(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const vx = CX, vy = H * 0.12;
    g.fillGradientStyle(C.bgDeep, C.bgDeep, C.bgMid, C.bgMid, 1);
    g.fillRect(0, 0, W, H);

    for (let i = 0; i < 4; i++) {
      g.fillStyle(C.cyan, 0.005 - i * 0.001);
      g.fillCircle(vx, vy, 50 + i * 40);
    }

    const rings = 16;
    for (let i = rings; i >= 0; i--) {
      const t = i / rings;
      const r = 12 + t * (W * 0.95);
      const cy = vy + t * (H * 0.65);
      const sq = 0.65 + t * 0.35;
      const rr = r * sq;

      fillHex(g, vx, cy, rr, C.tunnelDark, 0.06 + t * 0.12);

      const ea = 0.15 + t * 0.6;
      const ew = 1 + t * 2.5;
      strokeHex(g, vx, cy, rr, C.cyan, ea * 0.7, ew);
      strokeHex(g, vx, cy, rr + 2, C.cyanBright, ea * 0.15, ew + 3);
      strokeHex(g, vx, cy, rr + 5, C.cyan, ea * 0.04, ew + 8);

      if (t > 0.3) {
        strokeHex(g, vx, cy, rr, C.magenta, ea * 0.15, ew * 0.5);
      }

      if (t > 0.5) {
        const pts = hexVerts(vx, cy, rr);
        for (let j = 0; j < 6; j++) {
          g.fillStyle(C.cyanBright, 0.12 + t * 0.12);
          g.fillCircle(pts[j][0], pts[j][1], 1.5 + t * 2);
        }
      }
    }

    for (let i = 0; i < 6; i++) {
      const angle = (PI / 3) * i - PI / 6;
      const ex = vx + Math.cos(angle) * W * 1.5;
      const ey = vy + Math.sin(angle) * H * 1.5;
      g.lineStyle(1, C.cyan, 0.03);
      g.lineBetween(vx, vy, ex, ey);
      g.lineStyle(1, C.magenta, 0.015);
      g.lineBetween(vx + 2, vy, ex + 2, ey);
    }

    for (let i = 0; i < 14; i++) {
      const angle = (TAU / 14) * i + PI / 14;
      const spread = 0.03 + Math.random() * 0.025;
      const len = 180 + Math.random() * 300;
      const x1 = vx + Math.cos(angle - spread) * len;
      const y1 = vy + Math.sin(angle - spread) * len;
      const x2 = vx + Math.cos(angle + spread) * len;
      const y2 = vy + Math.sin(angle + spread) * len;
      const rc = i % 2 === 0 ? C.cyan : C.magenta;
      g.fillStyle(rc, 0.006 + Math.random() * 0.006);
      g.beginPath(); g.moveTo(vx, vy); g.lineTo(x1, y1); g.lineTo(x2, y2); g.closePath(); g.fillPath();
    }

    g.generateTexture("bg_tunnel", W, H);
    g.clear();
  }

  private genStars(g: Phaser.GameObjects.Graphics) {
    g.clear();
    for (let i = 0; i < 180; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      const s = 0.2 + Math.random() * 1;
      const b = Math.random();
      if (b > 0.92) {
        g.fillStyle(C.cyan, 0.4 + Math.random() * 0.4);
        g.fillCircle(x, y, s + 0.3);
        g.fillStyle(C.cyanWhite, 0.08);
        g.fillCircle(x, y, s + 2);
      } else if (b > 0.84) {
        g.fillStyle(C.magentaBright, 0.25 + Math.random() * 0.3);
        g.fillCircle(x, y, s);
      } else {
        g.fillStyle(C.white, 0.06 + Math.random() * 0.12);
        g.fillCircle(x, y, s * 0.5);
      }
    }
    g.generateTexture("stars", W, H);
    g.clear();
  }

  private genScanlines(g: Phaser.GameObjects.Graphics) {
    g.clear();
    for (let y = 0; y < H; y += 2) {
      g.fillStyle(0x000000, y % 4 === 0 ? 0.05 : 0.025);
      g.fillRect(0, y, W, 1);
    }
    g.generateTexture("scanlines", W, H);
    g.clear();
  }

  private genVignette(g: Phaser.GameObjects.Graphics) {
    g.clear();
    for (let i = 0; i < 25; i++) {
      const t = i / 25;
      g.fillStyle(0x000000, (1 - t) * (1 - t) * 0.07);
      g.fillEllipse(CX, H / 2, W * (0.4 + t * 0.6), H * (0.4 + t * 0.6));
    }
    g.fillStyle(0x000000, 0.5);
    g.fillRect(0, 0, W, 10);
    g.fillRect(0, H - 10, W, 10);
    g.fillStyle(0x000000, 0.35);
    g.fillRect(0, 0, 5, H);
    g.fillRect(W - 5, 0, 5, H);
    g.generateTexture("vignette", W, H);
    g.clear();
  }

  private genCyberBee(g: Phaser.GameObjects.Graphics) {
    const bw = 56, bh = 72;
    g.clear();

    g.fillStyle(C.beeBody, 1);
    g.fillEllipse(bw / 2, 16, 22, 20);
    g.fillStyle(C.beeBodyLight, 0.3);
    g.fillEllipse(bw / 2 - 3, 12, 10, 10);

    g.fillStyle(C.beeEye, 0.9);
    g.fillCircle(bw / 2 - 6, 12, 4);
    g.fillCircle(bw / 2 + 6, 12, 4);
    g.fillStyle(C.beeEyeBright, 0.6);
    g.fillCircle(bw / 2 - 6, 11, 2);
    g.fillCircle(bw / 2 + 6, 11, 2);
    g.fillStyle(C.white, 0.4);
    g.fillCircle(bw / 2 - 5, 10, 0.8);
    g.fillCircle(bw / 2 + 7, 10, 0.8);

    g.lineStyle(1.5, C.beeStripe, 0.7);
    g.beginPath(); g.moveTo(bw / 2 - 4, 6); g.lineTo(bw / 2 - 8, -2); g.strokePath();
    g.beginPath(); g.moveTo(bw / 2 + 4, 6); g.lineTo(bw / 2 + 8, -2); g.strokePath();
    g.fillStyle(C.cyan, 0.9);
    g.fillCircle(bw / 2 - 8, -2, 2);
    g.fillCircle(bw / 2 + 8, -2, 2);
    g.fillStyle(C.cyanBright, 0.5);
    g.fillCircle(bw / 2 - 8, -2, 4);
    g.fillCircle(bw / 2 + 8, -2, 4);
    g.fillStyle(C.cyan, 0.1);
    g.fillCircle(bw / 2 - 8, -2, 7);
    g.fillCircle(bw / 2 + 8, -2, 7);

    g.lineStyle(1, C.beeBody, 0.5);
    g.lineBetween(bw / 2 - 3, 24, bw / 2 - 3, 28);
    g.lineBetween(bw / 2 + 3, 24, bw / 2 + 3, 28);

    g.fillStyle(C.beeBody, 1);
    g.fillEllipse(bw / 2, 44, 28, 36);
    g.fillStyle(C.beeBodyLight, 0.15);
    g.fillEllipse(bw / 2 - 5, 36, 12, 16);

    const stripes = [32, 38, 44, 50, 56];
    for (let i = 0; i < stripes.length; i++) {
      const sw = 11 - Math.abs(i - 2) * 2;
      g.fillStyle(C.beeStripe, 0.85);
      g.fillEllipse(bw / 2, stripes[i], sw * 2, 3);
      g.fillStyle(C.beeStripeBright, 0.2);
      g.fillEllipse(bw / 2 - 2, stripes[i] - 0.5, sw, 1.5);
    }

    g.lineStyle(0.5, C.cyan, 0.15);
    for (let i = 0; i < 4; i++) {
      const ly = 30 + i * 8;
      g.lineBetween(bw / 2 - 10, ly, bw / 2 - 4, ly + 4);
      g.lineBetween(bw / 2 + 10, ly, bw / 2 + 4, ly + 4);
    }
    g.fillStyle(C.cyan, 0.06);
    g.fillCircle(bw / 2, 42, 3);

    g.lineStyle(1, C.beeBody, 0.4);
    g.strokeEllipse(bw / 2, 44, 28, 36);

    g.fillStyle(C.beeBody, 0.9);
    g.fillTriangle(bw / 2, bh - 1, bw / 2 - 4, bh - 12, bw / 2 + 4, bh - 12);
    g.fillStyle(C.beeStripe, 0.3);
    g.fillTriangle(bw / 2, bh - 3, bw / 2 - 1.5, bh - 10, bw / 2 + 1.5, bh - 10);

    g.fillStyle(C.cyan, 0.02);
    g.fillCircle(bw / 2, 36, 30);

    g.generateTexture("runner", bw, bh);
    g.clear();
  }

  private genCyberBeeSlide(g: Phaser.GameObjects.Graphics) {
    const sw = 58, sh = 28;
    g.clear();
    g.fillStyle(C.beeBody, 1);
    g.fillEllipse(14, sh / 2, 18, 16);
    g.fillStyle(C.beeEye, 0.8);
    g.fillCircle(10, sh / 2 - 2, 3);
    g.fillCircle(18, sh / 2 - 2, 3);
    g.fillStyle(C.beeBody, 1);
    g.fillEllipse(sw / 2 + 3, sh / 2, 32, 20);
    const sx = [24, 31, 38, 44];
    for (const x of sx) {
      g.fillStyle(C.beeStripe, 0.75);
      g.fillRect(x, sh / 2 - 8, 3, 16);
    }
    g.lineStyle(0.8, C.beeBody, 0.3);
    g.strokeEllipse(sw / 2 + 3, sh / 2, 32, 20);
    g.generateTexture("runner_slide", sw, sh);
    g.clear();
  }

  private genBeeShadow(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(C.black, 0.1);
    g.fillEllipse(24, 8, 44, 14);
    g.fillStyle(C.cyan, 0.015);
    g.fillEllipse(24, 8, 50, 18);
    g.generateTexture("bee_shadow", 48, 16);
    g.clear();
  }

  private genWings(g: Phaser.GameObjects.Graphics) {
    const ww = 32, wh = 40;

    g.clear();
    g.fillStyle(C.beeWing, 0.12);
    g.fillEllipse(ww / 2, wh / 2, ww - 2, wh - 2);
    g.fillStyle(C.beeWingTip, 0.06);
    g.fillEllipse(ww / 2 - 6, wh / 2 - 8, ww * 0.4, wh * 0.35);

    g.lineStyle(0.4, C.cyan, 0.15);
    g.lineBetween(4, 6, ww / 2, wh - 6);
    g.lineBetween(3, wh / 2, ww - 3, wh / 2 - 4);
    g.lineBetween(ww / 2 - 4, 5, ww / 2 + 1, wh - 8);
    g.lineStyle(0.4, C.magenta, 0.08);
    g.lineBetween(5, wh / 2 + 6, ww - 6, wh / 2 + 3);

    g.lineStyle(1.5, C.cyan, 0.3);
    g.strokeEllipse(ww / 2, wh / 2, ww - 2, wh - 2);
    g.lineStyle(4, C.beeWingTip, 0.04);
    g.strokeEllipse(ww / 2, wh / 2, ww + 4, wh + 4);
    g.generateTexture("wing_l", ww, wh);
    g.clear();

    g.fillStyle(C.beeWing, 0.12);
    g.fillEllipse(ww / 2, wh / 2, ww - 2, wh - 2);
    g.fillStyle(C.beeWingTip, 0.06);
    g.fillEllipse(ww / 2 + 6, wh / 2 - 8, ww * 0.4, wh * 0.35);

    g.lineStyle(0.4, C.cyan, 0.15);
    g.lineBetween(ww - 4, 6, ww / 2, wh - 6);
    g.lineBetween(ww - 3, wh / 2, 3, wh / 2 - 4);
    g.lineBetween(ww / 2 + 4, 5, ww / 2 - 1, wh - 8);
    g.lineStyle(0.4, C.magenta, 0.08);
    g.lineBetween(ww - 5, wh / 2 + 6, 6, wh / 2 + 3);

    g.lineStyle(1.5, C.cyan, 0.3);
    g.strokeEllipse(ww / 2, wh / 2, ww - 2, wh - 2);
    g.lineStyle(4, C.beeWingTip, 0.04);
    g.strokeEllipse(ww / 2, wh / 2, ww + 4, wh + 4);
    g.generateTexture("wing_r", ww, wh);
    g.clear();
  }

  private genObstacles(g: Phaser.GameObjects.Graphics) {
    const bw = 80, bh = 54;
    g.clear();

    g.fillStyle(C.laserRedGlow, 0.03);
    g.fillRoundedRect(-4, -4, bw + 8, bh + 8, 6);
    g.fillStyle(C.tunnelDark, 0.9);
    g.fillRoundedRect(0, 0, bw, bh, 4);

    for (let ly = 4; ly < bh; ly += 6) {
      g.lineStyle(2, C.laserRed, 0.5);
      g.lineBetween(6, ly, bw - 6, ly);
      g.lineStyle(5, C.laserRedGlow, 0.04);
      g.lineBetween(6, ly, bw - 6, ly);
    }
    for (let lx = 10; lx < bw; lx += 12) {
      g.lineStyle(1, C.laserRed, 0.25);
      g.lineBetween(lx, 4, lx, bh - 4);
    }

    g.lineStyle(2.5, C.laserRed, 0.85);
    g.strokeRoundedRect(1, 1, bw - 2, bh - 2, 4);
    g.lineStyle(6, C.laserRedGlow, 0.08);
    g.strokeRoundedRect(0, 0, bw, bh, 5);
    g.lineStyle(14, C.laserRedGlow, 0.015);
    g.strokeRoundedRect(-3, -3, bw + 6, bh + 6, 8);

    const corners = [[6, 6], [bw - 6, 6], [6, bh - 6], [bw - 6, bh - 6]];
    for (const [cx, cy] of corners) {
      g.fillStyle(C.laserRedWhite, 0.8);
      g.fillCircle(cx, cy, 3);
      g.fillStyle(C.laserRedBright, 0.15);
      g.fillCircle(cx, cy, 7);
    }
    g.generateTexture("barrier", bw, bh);
    g.clear();

    g.fillStyle(C.tunnelDark, 0.85);
    g.fillRoundedRect(0, 0, bw, 18, 3);
    g.lineStyle(3, C.laserRed, 0.75);
    g.lineBetween(0, 9, bw, 9);
    g.lineStyle(8, C.laserRedGlow, 0.06);
    g.lineBetween(0, 9, bw, 9);
    g.lineStyle(18, C.laserRedGlow, 0.01);
    g.lineBetween(0, 9, bw, 9);
    g.lineStyle(1, C.laserRed, 0.25);
    g.lineBetween(0, 3, bw, 3);
    g.lineBetween(0, 15, bw, 15);
    for (const cx of [4, bw - 4]) {
      g.fillStyle(C.laserRedWhite, 0.9);
      g.fillCircle(cx, 9, 4);
      g.fillStyle(C.laserRedGlow, 0.1);
      g.fillCircle(cx, 9, 8);
    }
    g.generateTexture("low_gate", bw, 18);
    g.clear();

    const gw = 80, gh = 54;
    g.fillStyle(C.tunnelDark, 0.8);
    g.fillRoundedRect(0, 0, gw, gh, 4);
    for (let i = 0; i < 8; i++) {
      const ox = Phaser.Math.Between(4, gw - 12);
      const oy = Phaser.Math.Between(4, gh - 8);
      const ow = Phaser.Math.Between(6, 20);
      const oh = Phaser.Math.Between(3, 10);
      g.fillStyle(C.glitchPurple, 0.2 + Math.random() * 0.3);
      g.fillRect(ox, oy, ow, oh);
    }
    for (let i = 0; i < 4; i++) {
      const gy = Phaser.Math.Between(2, gh - 2);
      g.lineStyle(1 + Math.random() * 2, C.glitchBlue, 0.3 + Math.random() * 0.3);
      g.lineBetween(0, gy, gw, gy);
    }
    g.lineStyle(2, C.glitchPurple, 0.6);
    g.strokeRoundedRect(1, 1, gw - 2, gh - 2, 4);
    g.lineStyle(5, C.glitchPurple, 0.06);
    g.strokeRoundedRect(0, 0, gw, gh, 5);
    g.generateTexture("glitch_wall", gw, gh);
    g.clear();

    g.fillStyle(C.tunnelDark, 0.9);
    g.fillRoundedRect(0, 0, 30, 84, 4);
    g.lineStyle(2, C.laserRed, 0.7);
    g.strokeRoundedRect(1, 1, 28, 82, 4);
    g.lineStyle(1, C.laserRed, 0.35);
    g.lineBetween(15, 3, 15, 81);
    for (const cy of [8, 76]) {
      g.fillStyle(C.laserRedWhite, 0.75);
      g.fillCircle(15, cy, 3.5);
      g.fillStyle(C.laserRedGlow, 0.08);
      g.fillCircle(15, cy, 7);
    }
    g.generateTexture("lane_blocker", 30, 84);
    g.clear();
  }

  private genCoin(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const s = 14, pad = 5, cs = s + pad;
    g.fillStyle(C.coinGlow, 0.03);
    g.fillCircle(cs, cs, s + 5);
    fillHex(g, cs, cs, s, C.coinBody, 1);
    fillHex(g, cs, cs, s - 1.5, C.coinLight, 0.2);
    fillHex(g, cs, cs, s - 3, C.coinBody, 0.2);
    g.fillStyle(C.coinShine, 0.1);
    g.fillEllipse(cs - 3, cs - 3, 6, 10);
    strokeHex(g, cs, cs, s, C.coinShine, 0.5, 1.5);
    strokeHex(g, cs, cs, s + 2, C.coinGlow, 0.08, 3);
    fillHex(g, cs, cs, 5, C.coinGlow, 0.4);
    strokeHex(g, cs, cs, 5, C.coinShine, 0.3, 1);
    g.generateTexture("coin", cs * 2, cs * 2);
    g.clear();
  }

  private genPowerups(g: Phaser.GameObjects.Graphics) {
    const s = 18;
    g.clear();

    const drawBase = (col: number, colB: number) => {
      g.fillStyle(col, 0.025);
      g.fillCircle(s, s, s + 3);
      g.fillStyle(C.tunnelDark, 0.92);
      g.fillRoundedRect(0, 0, s * 2, s * 2, 8);
      g.lineStyle(2, col, 0.75);
      g.strokeRoundedRect(0, 0, s * 2, s * 2, 8);
      g.lineStyle(4, colB, 0.05);
      g.strokeRoundedRect(-1, -1, s * 2 + 2, s * 2 + 2, 9);
    };

    drawBase(C.magnetBlue, C.magnetBright);
    g.lineStyle(3, C.magnetBlue, 0.7);
    g.beginPath(); g.arc(s, s - 2, 7, PI, 0, false); g.strokePath();
    g.fillStyle(C.magnetBlue, 1);
    g.fillRect(s - 7, s - 2, 4, 13);
    g.fillRect(s + 3, s - 2, 4, 13);
    g.fillStyle(C.laserRed, 0.85);
    g.fillRect(s - 7, s + 7, 4, 4);
    g.fillStyle(C.cyan, 0.85);
    g.fillRect(s + 3, s + 7, 4, 4);
    g.generateTexture("magnet", s * 2, s * 2);
    g.clear();

    drawBase(C.shieldGreen, C.shieldBright);
    g.lineStyle(2.5, C.shieldGreen, 0.7);
    g.beginPath();
    g.moveTo(s, 4); g.lineTo(s + 9, 9); g.lineTo(s + 9, 20);
    g.lineTo(s, 28); g.lineTo(s - 9, 20); g.lineTo(s - 9, 9);
    g.closePath(); g.strokePath();
    g.fillStyle(C.shieldGreen, 0.12);
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
    g.fillGradientStyle(C.tunnelMid, C.tunnelMid, C.tunnelDark, C.tunnelDark, 0.65);
    g.fillRect(0, 0, tW, 28);

    for (let i = 0; i < tW; i += 5) {
      g.fillStyle(C.cyan, (i % 10 === 0) ? 0.02 : 0.008);
      g.fillRect(i, 0, 1, 28);
    }

    g.lineStyle(2.5, C.cyan, 0.45);
    g.lineBetween(0, 0, tW, 0);
    g.lineStyle(6, C.cyanBright, 0.04);
    g.lineBetween(0, 0, tW, 0);
    g.lineStyle(14, C.cyan, 0.01);
    g.lineBetween(0, 0, tW, 0);
    g.lineStyle(1, C.magenta, 0.08);
    g.lineBetween(0, 27, tW, 27);

    for (let i = 1; i < 3; i++) {
      const lx = i * LANE_WIDTH + 10;
      g.lineStyle(1, C.cyan, 0.08);
      g.lineBetween(lx, 0, lx, 28);
    }
    g.generateTexture("ground_tile", tW, 28);
    g.clear();
  }

  private genParticles(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(C.amberHot, 0.8);
    g.fillCircle(6, 6, 5);
    g.fillStyle(C.amberWhite, 0.3);
    g.fillCircle(5, 5, 2.5);
    g.generateTexture("particle_amber", 12, 12);
    g.clear();

    g.fillStyle(C.cyan, 0.7);
    g.fillCircle(5, 5, 4);
    g.fillStyle(C.cyanBright, 0.3);
    g.fillCircle(4, 4, 2);
    g.generateTexture("particle_cyan", 10, 10);
    g.clear();

    g.fillStyle(C.white, 0.4);
    g.fillRect(0, 0, 2, 18);
    g.fillStyle(C.cyan, 0.2);
    g.fillRect(0, 0, 2, 18);
    g.generateTexture("speed_line", 2, 18);
    g.clear();

    g.fillStyle(C.amberHot, 0.5);
    g.fillRect(0, 0, 3, 3);
    g.generateTexture("spark", 3, 3);
    g.clear();

    fillHex(g, 6, 6, 5, C.coinBody, 0.5);
    strokeHex(g, 6, 6, 5, C.coinShine, 0.3, 0.5);
    g.generateTexture("hex_dust", 12, 12);
    g.clear();

    g.fillStyle(C.magenta, 0.6);
    g.fillCircle(4, 4, 3);
    g.fillStyle(C.magentaBright, 0.2);
    g.fillCircle(3, 3, 1.5);
    g.generateTexture("particle_magenta", 8, 8);
    g.clear();
  }

  private genDashIcon(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const s = 30;
    g.lineStyle(3, C.cyan, 0.15);
    g.strokeCircle(s, s, s - 2);
    g.lineStyle(3, C.cyan, 0.6);
    g.beginPath(); g.arc(s, s, s - 2, -PI / 2, PI, false); g.strokePath();
    g.fillStyle(C.cyanBright, 0.1);
    g.fillCircle(s, s, s - 6);
    g.fillStyle(C.cyan, 0.08);
    g.fillTriangle(s - 5, s - 8, s + 8, s, s - 5, s + 8);
    g.generateTexture("dash_icon_bg", s * 2, s * 2);
    g.clear();

    g.lineStyle(3, C.cyan, 0.7);
    g.strokeCircle(s, s, s - 2);
    g.fillStyle(C.cyanBright, 0.2);
    g.fillCircle(s, s, s - 6);
    g.fillStyle(C.cyan, 0.4);
    g.fillTriangle(s - 5, s - 8, s + 8, s, s - 5, s + 8);
    g.fillStyle(C.white, 0.15);
    g.fillTriangle(s - 3, s - 5, s + 5, s, s - 3, s + 5);
    g.generateTexture("dash_icon_ready", s * 2, s * 2);
    g.clear();
  }
}

class MenuScene extends Phaser.Scene {
  constructor() { super({ key: "Menu" }); }
  create() {
    this.add.tileSprite(0, 0, W, H, "bg_tunnel").setOrigin(0, 0);
    const stars = this.add.image(CX, H / 2, "stars").setAlpha(0.6);
    this.tweens.add({ targets: stars, alpha: 0.3, duration: 3000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    this.add.rectangle(CX, H / 2, W, H, 0x000000, 0.2);

    const frameGfx = this.add.graphics();
    const frameLines = [100, 130, 165, 210, 260];
    for (let i = 0; i < frameLines.length; i++) {
      const a = [0.25, 0.15, 0.08, 0.04, 0.02][i];
      const lw = [2.5, 2, 1.5, 1, 0.5][i];
      strokeHex(frameGfx, CX, H * 0.38, frameLines[i], C.cyan, a, lw);
      if (i < 3) {
        strokeHex(frameGfx, CX, H * 0.38, frameLines[i] + 2, C.cyanBright, a * 0.2, lw + 2);
      }
      if (i < 2) {
        strokeHex(frameGfx, CX, H * 0.38, frameLines[i], C.magenta, a * 0.12, lw * 0.5);
      }
    }

    const tGlow = this.add.text(CX, 60, "HONEY", {
      fontSize: "56px", fontFamily: "monospace", color: "#00e5ff", fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0.06);
    this.tweens.add({ targets: tGlow, alpha: 0.12, scaleX: 1.02, duration: 2500, yoyo: true, repeat: -1 });

    this.add.text(CX, 60, "HONEY", {
      fontSize: "52px", fontFamily: "monospace", color: "#00e5ff",
      fontStyle: "bold", stroke: "#001828", strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(CX, 114, "RUNNER", {
      fontSize: "36px", fontFamily: "monospace", color: "#ff0090",
      fontStyle: "bold", stroke: "#280014", strokeThickness: 6,
    }).setOrigin(0.5);

    const sub = this.add.text(CX, 148, "C Y B E R   H I V E", {
      fontSize: "10px", fontFamily: "monospace", color: "#00e5ff",
    }).setOrigin(0.5);
    this.tweens.add({ targets: sub, alpha: 0.3, duration: 2000, yoyo: true, repeat: -1 });

    for (let i = 0; i < 3; i++) {
      const pulse = this.add.circle(CX, 240, 30 + i * 15, C.cyan, 0.012 - i * 0.003);
      this.tweens.add({ targets: pulse, scaleX: 1.5 + i * 0.2, scaleY: 1.5 + i * 0.2, alpha: 0, duration: 2000 + i * 250, repeat: -1, delay: i * 250 });
    }

    const shadow = this.add.image(CX, 290, "bee_shadow").setScale(3.8).setAlpha(0.2);
    const body = this.add.image(CX, 240, "runner").setScale(3.5);
    const wL = this.add.image(CX - 22, 216, "wing_l").setScale(3.2).setAlpha(0.55).setDepth(9);
    const wR = this.add.image(CX + 22, 216, "wing_r").setScale(3.2).setAlpha(0.55).setDepth(11);
    body.setDepth(10);

    this.tweens.add({ targets: body, y: 234, duration: 1600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: shadow, scaleX: 3.4, alpha: 0.12, duration: 1600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: wL, scaleY: 1, alpha: 0.2, duration: 40, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: wR, scaleY: 1, alpha: 0.2, duration: 40, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: [wL, wR], y: 210, duration: 1600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const trailEmitter = this.add.particles(0, 0, "hex_dust", {
      speed: { min: 10, max: 40 }, scale: { start: 0.8, end: 0 },
      alpha: { start: 0.5, end: 0 }, lifespan: 800, frequency: 80,
      follow: body, followOffset: { x: 0, y: 30 },
      blendMode: "ADD", tint: [C.amberHot, C.coinBody, C.amberWhite],
    }).setDepth(8);

    const best = getBestScore();
    if (best > 0) {
      this.add.text(CX, 322, `BEST: ${best.toLocaleString()}`, {
        fontSize: "16px", fontFamily: "monospace", color: "#ffc030",
        fontStyle: "bold", stroke: "#000", strokeThickness: 4,
      }).setOrigin(0.5);
    }

    const btnGlow = this.add.rectangle(CX, 378, 200, 56, C.cyan, 0.025);
    this.tweens.add({ targets: btnGlow, scaleX: 1.3, scaleY: 1.4, alpha: 0, duration: 2000, repeat: -1 });

    const btn = this.add.rectangle(CX, 378, 188, 52, C.bgDeep, 0.95).setInteractive({ useHandCursor: true });
    btn.setStrokeStyle(2.5, C.cyan);
    this.add.text(CX, 378, "PLAY", {
      fontSize: "24px", fontFamily: "monospace", color: "#00e5ff", fontStyle: "bold",
    }).setOrigin(0.5);
    btn.on("pointerdown", () => this.scene.start("Game"));
    this.tweens.add({ targets: btn, scaleX: 1.03, scaleY: 1.03, duration: 1000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const ctrl = [
      "CONTROLS:",
      "",
      "Left / Right \u2013 Change Lane",
      "Up / Swipe Up \u2013 Jump / Stinger Dash",
      "Down / Swipe Down \u2013 Slide",
      "",
      "Collect hex-honey & dodge lasers!",
    ];
    this.add.text(CX, 480, ctrl.join("\n"), {
      fontSize: "9px", fontFamily: "monospace", color: "#1a3050",
      align: "center", lineSpacing: 5,
    }).setOrigin(0.5);

    this.add.text(CX, H - 28, "A Honeycomb Arena Game", {
      fontSize: "8px", fontFamily: "monospace", color: "#0c1828",
    }).setOrigin(0.5);

    this.add.image(CX, H / 2, "scanlines").setAlpha(0.2);
    this.add.image(CX, H / 2, "vignette").setAlpha(0.8);
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
  private spdTxt!: Phaser.GameObjects.Text;
  private comboTxt!: Phaser.GameObjects.Text;
  private phaseTxt!: Phaser.GameObjects.Text;
  private dashIcon!: Phaser.GameObjects.Image;
  private dashLabel!: Phaser.GameObjects.Text;
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

  constructor() { super({ key: "Game" }); }

  create() {
    this.lane = 1; this.sliding = false; this.speed = INITIAL_SPEED;
    this.dist = 0; this.score = 0; this.coins = 0; this.alive = true;
    this.pu = { magnet: false, shield: false, boost: false };
    this.puIcons = []; this.gTiles = []; this.fc = 0;
    this.combo = 0; this.comboTimer = 0; this.maxCombo = 0;
    this.dashReady = true; this.dashing = false; this.dashCooldownTimer = 0;
    this.phase = 0; this.tunnelOffset = 0;
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

    this.beeShadow = this.add.image(CX, GROUND_Y - 6, "bee_shadow").setScale(1.8).setAlpha(0.2).setDepth(4);

    this.runner = this.physics.add.sprite(CX, RUNNER_Y, "runner");
    this.runner.setCollideWorldBounds(false);
    this.runner.setGravityY(GRAVITY);
    this.runner.setSize(40, 56);
    this.runner.setDepth(10);

    this.wingL = this.add.image(CX - 20, RUNNER_Y - 16, "wing_l").setScale(1.4).setAlpha(0.5).setDepth(9);
    this.wingR = this.add.image(CX + 20, RUNNER_Y - 16, "wing_r").setScale(1.4).setAlpha(0.5).setDepth(11);
    this.tweens.add({ targets: this.wingL, scaleY: 0.3, alpha: 0.15, duration: 38, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: this.wingR, scaleY: 0.3, alpha: 0.15, duration: 38, yoyo: true, repeat: -1 });

    this.particles = this.add.particles(0, 0, "particle_amber", {
      speed: { min: 15, max: 50 }, scale: { start: 0.5, end: 0 },
      alpha: { start: 0.5, end: 0 }, lifespan: 500, frequency: 50,
      follow: this.runner, followOffset: { x: 0, y: 30 },
      blendMode: "ADD", tint: [C.amberHot, C.amberWhite, C.cyan],
    }).setDepth(8);

    this.hexDust = this.add.particles(0, 0, "hex_dust", {
      speed: { min: 8, max: 30 }, scale: { start: 0.6, end: 0 },
      alpha: { start: 0.4, end: 0 }, lifespan: 700, frequency: 120,
      follow: this.runner, followOffset: { x: 0, y: 35 },
      blendMode: "ADD", tint: [C.coinBody, C.amberHot],
    }).setDepth(8);

    this.shieldVis = this.add.circle(CX, RUNNER_Y, 38, C.shieldGreen, 0.06);
    this.shieldVis.setStrokeStyle(2, C.shieldBright, 0.35);
    this.shieldVis.setVisible(false).setDepth(12);

    this.dashVis = this.add.circle(CX, RUNNER_Y, 42, C.cyan, 0.04);
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

    this.add.image(CX, H / 2, "scanlines").setAlpha(0.1).setDepth(99).setScrollFactor(0);
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
    const hudBar = this.add.rectangle(CX, 16, W - 10, 28, C.hudBg, 0.85).setDepth(90).setScrollFactor(0);
    hudBar.setStrokeStyle(1, C.hudBorder, 0.3);

    this.scoreTxt = this.add.text(CX, 16, "0", {
      fontSize: "16px", fontFamily: "monospace", color: "#00e5ff", fontStyle: "bold", stroke: "#000", strokeThickness: 3,
    }).setOrigin(0.5).setDepth(91).setScrollFactor(0);

    this.add.image(50, 16, "coin").setScale(0.45).setDepth(91).setScrollFactor(0);
    this.coinTxt = this.add.text(64, 16, " 0", {
      fontSize: "12px", fontFamily: "monospace", color: "#ffd040", stroke: "#000", strokeThickness: 2,
    }).setOrigin(0, 0.5).setDepth(91).setScrollFactor(0);

    this.spdTxt = this.add.text(W - 12, 16, `${INITIAL_SPEED.toFixed(1)}x`, {
      fontSize: "10px", fontFamily: "monospace", color: "#ff0090", stroke: "#000", strokeThickness: 2,
    }).setOrigin(1, 0.5).setDepth(91).setScrollFactor(0);

    const comboBar = this.add.rectangle(CX, 40, W - 10, 18, C.hudBg, 0.65).setDepth(90).setScrollFactor(0);
    comboBar.setStrokeStyle(1, C.hudBorder, 0.15);
    this.comboTxt = this.add.text(CX, 40, "1x NEURAL OVERLOAD", {
      fontSize: "10px", fontFamily: "monospace", color: "#ffc030", fontStyle: "bold", stroke: "#000", strokeThickness: 2,
    }).setOrigin(0.5).setDepth(91).setScrollFactor(0);

    this.phaseTxt = this.add.text(CX, 58, PHASE_NAMES[0], {
      fontSize: "8px", fontFamily: "monospace", color: "#00e5ff", stroke: "#000", strokeThickness: 2,
    }).setOrigin(0.5).setDepth(91).setScrollFactor(0).setAlpha(0.6);

    this.dashIcon = this.add.image(38, H - 38, "dash_icon_ready").setScale(0.9).setDepth(91).setScrollFactor(0);
    this.dashLabel = this.add.text(38, H - 12, "DASH", {
      fontSize: "7px", fontFamily: "monospace", color: "#00e5ff", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(91).setScrollFactor(0);
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
    this.runner.setSize(50, 22);
    this.runner.y = GROUND_Y - 14;
    this.slideTimer = this.time.delayedCall(SLIDE_DURATION, () => {
      if (!this.alive) return;
      this.sliding = false;
      this.runner.setTexture("runner");
      this.runner.setSize(40, 56);
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

    for (let i = 0; i < 8; i++) {
      const s = this.add.image(this.runner.x + Phaser.Math.Between(-30, 30), this.runner.y + Phaser.Math.Between(-30, 30), "particle_cyan")
        .setScale(2.5).setAlpha(0.7).setDepth(15).setBlendMode("ADD");
      this.tweens.add({ targets: s, x: s.x + Phaser.Math.Between(-60, 60), y: s.y + Phaser.Math.Between(-60, 60), alpha: 0, scale: 0, duration: 400, onComplete: () => s.destroy() });
    }

    this.dashIcon.setTexture("dash_icon_bg").setAlpha(0.4);

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
    const vx = CX, vy = H * 0.12;
    const numRings = 8;
    const baseOffset = this.tunnelOffset % 50;

    for (let i = numRings; i >= 0; i--) {
      const t = (i * 50 + baseOffset) / (numRings * 50);
      const r = 12 + t * (W * 0.65);
      const cy = vy + t * (H * 0.5);
      const sq = 0.6 + t * 0.4;
      const rr = r * sq;

      const ea = (0.05 + t * 0.3) * 0.6;
      const ew = 0.5 + t * 1.5;
      strokeHex(g, vx, cy, rr, this.phaseColor1, ea, ew);
      if (t > 0.3) {
        strokeHex(g, vx, cy, rr, this.phaseColor2, ea * 0.15, ew * 0.5);
      }
    }

    for (let i = 0; i < 6; i++) {
      const angle = (PI / 3) * i - PI / 6;
      const len = W * 0.5;
      const ex = vx + Math.cos(angle) * len;
      const ey = vy + Math.sin(angle) * len;
      g.lineStyle(0.5, this.phaseColor1, 0.02);
      g.lineBetween(vx, vy, ex, ey);
    }
  }

  update(_t: number, delta: number) {
    if (!this.alive) return;
    this.fc++;

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
        const flash = this.add.circle(38, H - 38, 28, C.cyan, 0.2).setDepth(92);
        this.tweens.add({ targets: flash, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
      } else {
        const pct = 1 - (this.dashCooldownTimer / this.dashCooldownTotal);
        this.dashIcon.setAlpha(0.3 + pct * 0.7);
      }
    }

    this.tunnelOffset += es * 2;
    this.drawTunnelRings();

    this.bgTunnel.tilePositionY -= es * 0.25;

    this.gTiles.forEach((gt) => { gt.tilePositionY -= es * 0.5; });

    this.wingL.x = this.runner.x - 22;
    this.wingR.x = this.runner.x + 22;
    this.wingL.y = this.runner.y - 18;
    this.wingR.y = this.runner.y - 18;

    this.beeShadow.x = this.runner.x;
    const sd = Math.max(0, GROUND_Y - this.runner.y);
    this.beeShadow.setScale(Math.max(0.4, 1.8 - sd * 0.01)).setAlpha(Math.max(0.04, 0.2 - sd * 0.002));

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

    this.scoreTxt.setText(this.score.toLocaleString());
    this.coinTxt.setText(` ${this.coins}`);
    this.spdTxt.setText(`${es.toFixed(1)}x`);

    const comboDisplay = Math.max(1, Math.floor(this.combo));
    this.comboTxt.setText(`${comboDisplay}x NEURAL OVERLOAD`);
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
    this.add.rectangle(CX, H / 2, W, H, 0x000000, 0.5);

    const tg = this.add.text(CX, 44, "GAME OVER", {
      fontSize: "40px", fontFamily: "monospace", color: "#ff1040", fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0.08);
    this.tweens.add({ targets: tg, alpha: 0.15, duration: 1800, yoyo: true, repeat: -1 });

    this.add.text(CX, 44, "GAME OVER", {
      fontSize: "38px", fontFamily: "monospace", color: "#ff1040",
      fontStyle: "bold", stroke: "#200008", strokeThickness: 6,
    }).setOrigin(0.5);

    if (data.isNewBest) {
      const nb = this.add.text(CX, 82, "NEW BEST!", {
        fontSize: "20px", fontFamily: "monospace", color: "#ffd860",
        fontStyle: "bold", stroke: "#302000", strokeThickness: 4,
      }).setOrigin(0.5);
      this.tweens.add({ targets: nb, scaleX: 1.05, scaleY: 1.05, duration: 600, yoyo: true, repeat: -1 });
    }

    const beeGlow = this.add.circle(CX, 126, 24, C.cyan, 0.015);
    this.tweens.add({ targets: beeGlow, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 2000, repeat: -1 });
    const bee = this.add.image(CX, 126, "runner").setScale(2.4);
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
      this.add.rectangle(CX, y + 7, 290, 34, C.hudBg, 0.85).setStrokeStyle(1, C.hudBorder, 0.2);
      this.add.text(CX - 130, y, s.l, { fontSize: "9px", fontFamily: "monospace", color: "#1a3050" });
      const val = this.add.text(CX + 130, y + 12, s.v, {
        fontSize: "18px", fontFamily: "monospace", color: s.c, fontStyle: "bold", stroke: "#000", strokeThickness: 3,
      }).setOrigin(1, 0.5).setAlpha(0).setScale(0.7);
      this.tweens.add({ targets: val, alpha: 1, scaleX: 1, scaleY: 1, duration: 350, delay: 200 + i * 100, ease: "Back.easeOut" });
    });

    const btnGlow = this.add.rectangle(CX, 432, 210, 54, C.cyan, 0.02);
    this.tweens.add({ targets: btnGlow, scaleX: 1.25, scaleY: 1.25, alpha: 0, duration: 1800, repeat: -1 });
    const retry = this.add.rectangle(CX, 432, 200, 50, C.bgDeep, 0.95).setInteractive({ useHandCursor: true });
    retry.setStrokeStyle(2.5, C.cyan);
    this.add.text(CX, 432, "PLAY AGAIN", { fontSize: "16px", fontFamily: "monospace", color: "#00e5ff", fontStyle: "bold" }).setOrigin(0.5);
    retry.on("pointerdown", () => this.scene.start("Game"));
    this.tweens.add({ targets: retry, scaleX: 1.03, scaleY: 1.03, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const menu = this.add.rectangle(CX, 490, 200, 40, C.tunnelMid, 0.95).setInteractive({ useHandCursor: true });
    menu.setStrokeStyle(1, C.magenta, 0.3);
    this.add.text(CX, 490, "MENU", { fontSize: "13px", fontFamily: "monospace", color: "#ff0090" }).setOrigin(0.5);
    menu.on("pointerdown", () => this.scene.start("Menu"));

    this.input.keyboard?.once("keydown-SPACE", () => this.scene.start("Game"));
    this.input.keyboard?.once("keydown-ENTER", () => this.scene.start("Game"));

    this.add.image(CX, H / 2, "scanlines").setAlpha(0.15);
    this.add.image(CX, H / 2, "vignette").setAlpha(0.7);
  }
}

export function createHoneyRunnerGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent,
    backgroundColor: "#020014",
    physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, MenuScene, GameScene, GameOverScene],
    input: { activePointers: 3 },
    render: { pixelArt: false, antialias: true },
  });
}
