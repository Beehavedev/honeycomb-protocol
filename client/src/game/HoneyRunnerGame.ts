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

const W = GAME_WIDTH, H = GAME_HEIGHT;
const CX = W / 2;
const PI = Math.PI;

function hv(cx: number, cy: number, r: number, rot = -PI / 6) {
  const p: number[][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (PI / 3) * i + rot;
    p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return p;
}
function sH(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, col: number, a: number, lw = 1) {
  const p = hv(cx, cy, r);
  g.lineStyle(lw, col, a);
  g.beginPath(); g.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < 6; i++) g.lineTo(p[i][0], p[i][1]);
  g.closePath(); g.strokePath();
}
function fH(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, col: number, a: number) {
  const p = hv(cx, cy, r);
  g.fillStyle(col, a);
  g.beginPath(); g.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < 6; i++) g.lineTo(p[i][0], p[i][1]);
  g.closePath(); g.fillPath();
}

class BootScene extends Phaser.Scene {
  constructor() { super({ key: "Boot" }); }
  create() {
    const g = this.make.graphics({ x: 0, y: 0 });
    this.bg(g);
    this.nebula(g);
    this.stars(g);
    this.scan(g);
    this.vig(g);
    this.bee(g);
    this.beeSlide(g);
    this.shadow(g);
    this.wingL(g);
    this.wingR(g);
    this.obs(g);
    this.coin(g);
    this.pups(g);
    this.ground(g);
    this.parts(g);
    this.hexFrame(g);
    this.godRays(g);
    g.destroy();
    this.scene.start("Menu");
  }

  private bg(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillGradientStyle(C.bg0, C.bg0, C.bg1, C.bg1, 1);
    g.fillRect(0, 0, W, H);

    const vx = W / 2, vy = H * 0.13;

    for (let i = 0; i < 5; i++) {
      const r = 60 + i * 50;
      g.fillStyle(C.hexAmberDim, 0.008 - i * 0.001);
      g.fillCircle(vx, vy, r);
    }

    const rings = 14;
    for (let i = rings; i >= 0; i--) {
      const t = i / rings;
      const r = 16 + t * (W * 0.92);
      const cy = vy + t * (H * 0.6);
      const sq = 0.7 + t * 0.3;
      const rr = r * sq;

      fH(g, vx, cy, rr, C.tunnelFill, 0.04 + t * 0.08);
      fH(g, vx, cy, rr * 0.92, C.tunnelDeep, 0.03 + t * 0.04);

      if (i % 2 === 0) {
        fH(g, vx, cy, rr, C.tunnelFillLight, 0.015);
      }

      const ea = 0.12 + t * 0.55;
      const ew = 1.5 + t * 2;
      sH(g, vx, cy, rr, C.hexAmber, ea, ew);
      sH(g, vx, cy, rr + 1, C.hexAmberHot, ea * 0.2, ew + 2);
      sH(g, vx, cy, rr + 3, C.hexAmber, ea * 0.08, ew + 6);
      sH(g, vx, cy, rr + 6, C.hexAmberDim, ea * 0.03, ew + 12);

      if (t > 0.4) {
        sH(g, vx, cy, rr - 3, C.hexAmberHot, (t - 0.4) * 0.08, 1);
      }

      if (t > 0.6) {
        const pts = hv(vx, cy, rr);
        for (let j = 0; j < 6; j++) {
          g.fillStyle(C.hexAmberHot, 0.15 + t * 0.15);
          g.fillCircle(pts[j][0], pts[j][1], 2 + t * 2);
          g.fillStyle(C.hexAmberWhite, 0.06);
          g.fillCircle(pts[j][0], pts[j][1], 4 + t * 3);
        }
      }
    }

    for (let i = 0; i < 6; i++) {
      const angle = (PI / 3) * i - PI / 6;
      const ex = vx + Math.cos(angle) * W * 1.5;
      const ey = vy + Math.sin(angle) * H * 1.5;
      g.lineStyle(1.5, C.hexAmber, 0.04);
      g.lineBetween(vx, vy, ex, ey);
      g.lineStyle(4, C.hexAmberDim, 0.015);
      g.lineBetween(vx, vy, ex, ey);
    }

    const hr = 18;
    const hh = hr * Math.sqrt(3);
    for (let row = -1; row < H / hh + 1; row++) {
      for (let col = -1; col < W / (hr * 1.5) + 1; col++) {
        const hx = col * hr * 1.5;
        const hy = row * hh + (col % 2 ? hh / 2 : 0);
        const d = Math.sqrt((hx - vx) ** 2 + (hy - vy) ** 2) / (W * 0.8);
        if (d > 1.2) continue;
        const a = Math.max(0.005, 0.06 - d * 0.05);
        sH(g, hx, hy, hr - 3, C.cyan, a * 0.3);
        if (Math.random() < 0.025) {
          fH(g, hx, hy, hr - 4, C.cyan, 0.008 + Math.random() * 0.015);
        }
      }
    }

    g.generateTexture("bg_tunnel", W, H);
    g.clear();
  }

  private godRays(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const vx = W / 2, vy = H * 0.13;
    for (let i = 0; i < 12; i++) {
      const angle = (PI * 2 / 12) * i + PI / 12;
      const spread = 0.04 + Math.random() * 0.03;
      const len = 200 + Math.random() * 250;
      const x1 = vx + Math.cos(angle - spread) * len;
      const y1 = vy + Math.sin(angle - spread) * len;
      const x2 = vx + Math.cos(angle + spread) * len;
      const y2 = vy + Math.sin(angle + spread) * len;
      g.fillStyle(C.hexAmber, 0.008 + Math.random() * 0.008);
      g.beginPath();
      g.moveTo(vx, vy);
      g.lineTo(x1, y1);
      g.lineTo(x2, y2);
      g.closePath();
      g.fillPath();
    }
    g.generateTexture("god_rays", W, H);
    g.clear();
  }

  private nebula(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const cols = [C.purpleDim, C.tunnelFill, C.pinkDim, C.cyanDim, C.bg2];
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const r = 20 + Math.random() * 70;
      g.fillStyle(cols[Math.floor(Math.random() * cols.length)], 0.01 + Math.random() * 0.02);
      g.fillCircle(x, y, r);
      g.fillStyle(cols[Math.floor(Math.random() * cols.length)], 0.005);
      g.fillCircle(x + Phaser.Math.Between(-20, 20), y + Phaser.Math.Between(-20, 20), r * 1.4);
    }
    g.generateTexture("nebula", W, H);
    g.clear();
  }

  private stars(g: Phaser.GameObjects.Graphics) {
    g.clear();
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      const s = 0.15 + Math.random() * 1;
      const b = Math.random();
      if (b > 0.93) {
        g.fillStyle(C.hexAmberHot, 0.5 + Math.random() * 0.4);
        g.fillCircle(x, y, s + 0.5);
        g.fillStyle(C.hexAmberWhite, 0.12);
        g.fillCircle(x, y, s + 2.5);
      } else if (b > 0.82) {
        g.fillStyle(C.cyanBright, 0.3 + Math.random() * 0.35);
        g.fillCircle(x, y, s);
        g.fillStyle(C.cyanWhite, 0.06);
        g.fillCircle(x, y, s + 1.5);
      } else {
        const sc = [C.white, C.cyanBright, C.purpleBright, C.hexAmberHot];
        g.fillStyle(sc[Math.floor(Math.random() * sc.length)], 0.08 + Math.random() * 0.2);
        g.fillCircle(x, y, s * 0.6);
      }
    }
    g.generateTexture("stars", W, H);
    g.clear();
  }

  private scan(g: Phaser.GameObjects.Graphics) {
    g.clear();
    for (let y = 0; y < H; y += 2) {
      g.fillStyle(0x000000, y % 4 === 0 ? 0.06 : 0.03);
      g.fillRect(0, y, W, 1);
    }
    g.generateTexture("scanlines", W, H);
    g.clear();
  }

  private vig(g: Phaser.GameObjects.Graphics) {
    g.clear();
    for (let i = 0; i < 30; i++) {
      const t = i / 30;
      g.fillStyle(0x000000, (1 - t) * (1 - t) * 0.06);
      g.fillEllipse(W / 2, H / 2, W * (0.4 + t * 0.6), H * (0.4 + t * 0.6));
    }
    g.fillStyle(0x000000, 0.45);
    g.fillRect(0, 0, W, 12);
    g.fillRect(0, H - 12, W, 12);
    g.fillStyle(0x000000, 0.3);
    g.fillRect(0, 0, 6, H);
    g.fillRect(W - 6, 0, 6, H);
    g.generateTexture("vignette", W, H);
    g.clear();
  }

  private bee(g: Phaser.GameObjects.Graphics) {
    const bw = 56, bh = 66;
    g.clear();

    g.fillStyle(C.beeBody, 1);
    g.fillEllipse(bw / 2, 18, 24, 22);
    for (let i = 0; i < 15; i++) {
      const fx = bw / 2 + Phaser.Math.Between(-9, 9);
      const fy = 18 + Phaser.Math.Between(-8, 8);
      g.fillStyle(C.beeFuzz, 0.04 + Math.random() * 0.04);
      g.fillCircle(fx, fy, 1 + Math.random() * 2);
    }
    g.fillStyle(C.beeHighlight, 0.2);
    g.fillEllipse(bw / 2 - 4, 13, 12, 10);
    g.fillStyle(C.beeBodyDark, 0.2);
    g.fillEllipse(bw / 2 + 4, 22, 14, 10);

    g.fillStyle(C.beeEyeOuter, 1);
    g.fillEllipse(bw / 2 - 7, 14, 10, 11);
    g.fillEllipse(bw / 2 + 7, 14, 10, 11);
    g.fillStyle(C.beeEyeIris, 0.85);
    g.fillEllipse(bw / 2 - 7, 13.5, 8, 9);
    g.fillEllipse(bw / 2 + 7, 13.5, 8, 9);
    for (let e = 0; e < 2; e++) {
      const ex = bw / 2 + (e === 0 ? -7 : 7);
      for (let fi = 0; fi < 5; fi++) {
        const fa = (PI * 2 / 5) * fi;
        const fx = ex + Math.cos(fa) * 2.5;
        const fy = 13.5 + Math.sin(fa) * 3;
        sH(g, fx, fy, 1.5, C.beeEyeOuter, 0.15, 0.3);
      }
    }
    g.fillStyle(C.beeEyeCore, 0.7);
    g.fillCircle(bw / 2 - 7, 12.5, 2.5);
    g.fillCircle(bw / 2 + 7, 12.5, 2.5);
    g.fillStyle(C.beeEyeWhite, 0.9);
    g.fillCircle(bw / 2 - 6, 11, 1.2);
    g.fillCircle(bw / 2 + 8, 11, 1.2);
    g.fillStyle(C.white, 0.5);
    g.fillCircle(bw / 2 - 8, 13, 0.6);
    g.fillCircle(bw / 2 + 6, 13, 0.6);

    g.lineStyle(1.8, C.beeAntenna, 0.85);
    g.beginPath(); g.moveTo(bw / 2 - 5, 7);
    g.lineTo(bw / 2 - 7, 3); g.lineTo(bw / 2 - 10, -1);
    g.strokePath();
    g.beginPath(); g.moveTo(bw / 2 + 5, 7);
    g.lineTo(bw / 2 + 7, 3); g.lineTo(bw / 2 + 10, -1);
    g.strokePath();

    const ax = [bw / 2 - 10, bw / 2 + 10];
    for (const x of ax) {
      g.fillStyle(C.beeAntennaGlow, 1);
      g.fillCircle(x, -1, 2.5);
      g.fillStyle(C.cyanBright, 0.45);
      g.fillCircle(x, -1, 4);
      g.fillStyle(C.cyan, 0.12);
      g.fillCircle(x, -1, 7);
      g.fillStyle(C.cyanWhite, 0.7);
      g.fillCircle(x, -1.5, 1);
    }

    g.fillStyle(C.beeBody, 1);
    g.fillEllipse(bw / 2, 42, 30, 34);
    g.fillStyle(C.beeBodyDark, 0.2);
    g.fillEllipse(bw / 2 + 5, 46, 16, 22);
    g.fillStyle(C.beeHighlight, 0.15);
    g.fillEllipse(bw / 2 - 6, 35, 14, 18);
    for (let i = 0; i < 20; i++) {
      const fx = bw / 2 + Phaser.Math.Between(-13, 13);
      const fy = 42 + Phaser.Math.Between(-14, 14);
      const d = Math.sqrt((fx - bw / 2) ** 2 + (fy - 42) ** 2);
      if (d > 16) continue;
      g.fillStyle(C.beeFuzz, 0.02 + Math.random() * 0.03);
      g.fillCircle(fx, fy, 1 + Math.random() * 1.5);
    }

    const sy = [30, 37, 44, 51];
    for (let si = 0; si < sy.length; si++) {
      const sw = 12 + (si < 2 ? si * 2 : (3 - si) * 2);
      g.fillStyle(C.beeStripe1, 0.85);
      g.fillEllipse(bw / 2, sy[si], sw * 2, 3.5);
      g.fillStyle(C.beeStripe2, 0.4);
      g.fillEllipse(bw / 2, sy[si] + 0.5, sw * 2 - 2, 1.5);
      g.fillStyle(C.beeHighlight, 0.04);
      g.fillEllipse(bw / 2 - 3, sy[si] - 0.5, sw, 1.5);
    }

    g.lineStyle(1, C.hexAmberMid, 0.2);
    g.strokeEllipse(bw / 2, 42, 30, 34);

    g.fillStyle(C.beeBodyDeep, 1);
    g.fillTriangle(bw / 2, bh - 2, bw / 2 - 4, bh - 12, bw / 2 + 4, bh - 12);
    g.fillStyle(C.hexAmberHot, 0.35);
    g.fillTriangle(bw / 2, bh - 4, bw / 2 - 1.5, bh - 10, bw / 2 + 1.5, bh - 10);
    g.fillStyle(C.white, 0.15);
    g.fillTriangle(bw / 2, bh - 6, bw / 2 - 0.5, bh - 9, bw / 2 + 0.5, bh - 9);

    g.fillStyle(C.hexAmber, 0.025);
    g.fillCircle(bw / 2, 38, 34);

    g.generateTexture("runner", bw, bh);
    g.clear();
  }

  private beeSlide(g: Phaser.GameObjects.Graphics) {
    const sw = 58, sh = 30;
    g.clear();

    g.fillStyle(C.beeBody, 1);
    g.fillEllipse(14, sh / 2, 20, 18);
    g.fillStyle(C.beeHighlight, 0.15);
    g.fillEllipse(12, sh / 2 - 2, 10, 9);

    g.fillStyle(C.beeEyeOuter, 1);
    g.fillEllipse(9, sh / 2 - 2, 7, 8);
    g.fillEllipse(17, sh / 2 - 2, 7, 8);
    g.fillStyle(C.beeEyeIris, 0.85);
    g.fillEllipse(9, sh / 2 - 2.5, 5.5, 6.5);
    g.fillEllipse(17, sh / 2 - 2.5, 5.5, 6.5);
    g.fillStyle(C.beeEyeCore, 0.6);
    g.fillCircle(9, sh / 2 - 3, 1.5);
    g.fillCircle(17, sh / 2 - 3, 1.5);
    g.fillStyle(C.beeEyeWhite, 0.8);
    g.fillCircle(9, sh / 2 - 4, 0.8);
    g.fillCircle(17, sh / 2 - 4, 0.8);

    g.fillStyle(C.beeBody, 1);
    g.fillEllipse(sw / 2 + 3, sh / 2, 34, 22);
    g.fillStyle(C.beeHighlight, 0.12);
    g.fillEllipse(sw / 2, sh / 2 - 4, 16, 10);
    g.fillStyle(C.beeBodyDark, 0.15);
    g.fillEllipse(sw / 2 + 6, sh / 2 + 3, 16, 10);

    const sx = [24, 31, 38, 44];
    for (const x of sx) {
      g.fillStyle(C.beeStripe1, 0.8);
      g.fillRect(x, sh / 2 - 9, 3.5, 18);
    }
    g.lineStyle(1, C.hexAmberMid, 0.15);
    g.strokeEllipse(sw / 2 + 3, sh / 2, 34, 22);

    g.fillStyle(C.beeWingBase, 0.12);
    g.fillEllipse(18, 3, 22, 8);
    g.fillEllipse(34, 2, 16, 6);

    g.generateTexture("runner_slide", sw, sh);
    g.clear();
  }

  private shadow(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(C.black, 0.12);
    g.fillEllipse(24, 8, 44, 14);
    g.fillStyle(C.black, 0.06);
    g.fillEllipse(24, 8, 52, 18);
    g.fillStyle(C.hexAmber, 0.01);
    g.fillEllipse(24, 8, 56, 20);
    g.generateTexture("bee_shadow", 48, 16);
    g.clear();
  }

  private wingL(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const ww = 30, wh = 36;
    g.fillStyle(C.beeWingBase, 0.28);
    g.fillEllipse(ww / 2, wh / 2, ww - 2, wh - 2);
    g.fillStyle(C.beeWingSheen, 0.1);
    g.fillEllipse(ww / 2 - 4, wh / 2 - 5, ww * 0.45, wh * 0.5);
    g.fillStyle(C.white, 0.04);
    g.fillEllipse(ww / 2 - 5, wh / 2 - 6, ww * 0.3, wh * 0.35);

    g.lineStyle(0.5, C.beeWingVein, 0.2);
    g.lineBetween(5, 5, ww / 2, wh - 5);
    g.lineBetween(3, wh / 2 - 2, ww - 3, wh / 2 - 5);
    g.lineBetween(4, wh / 2 + 5, ww - 5, wh / 2 + 2);
    g.lineBetween(ww / 2 - 3, 4, ww / 2 + 2, wh - 6);

    g.lineStyle(1.2, C.beeWingEdge, 0.35);
    g.strokeEllipse(ww / 2, wh / 2, ww - 2, wh - 2);
    g.lineStyle(4, C.beeWingEdge, 0.04);
    g.strokeEllipse(ww / 2, wh / 2, ww + 4, wh + 4);
    g.generateTexture("wing_l", ww, wh);
    g.clear();
  }

  private wingR(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const ww = 30, wh = 36;
    g.fillStyle(C.beeWingBase, 0.28);
    g.fillEllipse(ww / 2, wh / 2, ww - 2, wh - 2);
    g.fillStyle(C.beeWingSheen, 0.1);
    g.fillEllipse(ww / 2 + 4, wh / 2 - 5, ww * 0.45, wh * 0.5);
    g.fillStyle(C.white, 0.04);
    g.fillEllipse(ww / 2 + 5, wh / 2 - 6, ww * 0.3, wh * 0.35);

    g.lineStyle(0.5, C.beeWingVein, 0.2);
    g.lineBetween(ww - 5, 5, ww / 2, wh - 5);
    g.lineBetween(ww - 3, wh / 2 - 2, 3, wh / 2 - 5);
    g.lineBetween(ww - 4, wh / 2 + 5, 5, wh / 2 + 2);
    g.lineBetween(ww / 2 + 3, 4, ww / 2 - 2, wh - 6);

    g.lineStyle(1.2, C.beeWingEdge, 0.35);
    g.strokeEllipse(ww / 2, wh / 2, ww - 2, wh - 2);
    g.lineStyle(4, C.beeWingEdge, 0.04);
    g.strokeEllipse(ww / 2, wh / 2, ww + 4, wh + 4);
    g.generateTexture("wing_r", ww, wh);
    g.clear();
  }

  private obs(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const bw = 78, bh = 54;

    g.fillStyle(C.laserGlow, 0.03);
    g.fillRoundedRect(-4, -4, bw + 8, bh + 8, 8);
    g.fillStyle(C.tunnelDeep, 0.92);
    g.fillRoundedRect(0, 0, bw, bh, 5);

    for (let ly = 0; ly < bh; ly += 2) {
      g.fillStyle(C.laserCore, 0.01 + (ly % 4 === 0 ? 0.01 : 0));
      g.fillRect(3, ly, bw - 6, 1);
    }

    for (let i = 0; i < 5; i++) {
      const ly = 7 + i * 10;
      g.lineStyle(2.5, C.laserCore, 0.6 - i * 0.06);
      g.lineBetween(6, ly, bw - 6, ly);
      g.lineStyle(6, C.laserEdge, 0.05);
      g.lineBetween(6, ly, bw - 6, ly);
      g.lineStyle(14, C.laserGlow, 0.012);
      g.lineBetween(6, ly, bw - 6, ly);
    }

    g.lineStyle(2, C.laserCore, 0.8);
    g.strokeRoundedRect(1, 1, bw - 2, bh - 2, 5);
    g.lineStyle(5, C.laserEdge, 0.1);
    g.strokeRoundedRect(0, 0, bw, bh, 6);
    g.lineStyle(12, C.laserGlow, 0.02);
    g.strokeRoundedRect(-2, -2, bw + 4, bh + 4, 8);

    const cn = [[7, 7], [bw - 7, 7], [7, bh - 7], [bw - 7, bh - 7]];
    for (const [cx, cy] of cn) {
      g.fillStyle(C.laserWhite, 0.85);
      g.fillCircle(cx, cy, 3.5);
      g.fillStyle(C.white, 0.6);
      g.fillCircle(cx, cy - 0.5, 1.5);
      g.fillStyle(C.laserEdge, 0.15);
      g.fillCircle(cx, cy, 7);
      g.fillStyle(C.laserGlow, 0.04);
      g.fillCircle(cx, cy, 12);
    }
    g.generateTexture("barrier", bw, bh);
    g.clear();

    g.fillStyle(C.tunnelDeep, 0.88);
    g.fillRoundedRect(0, 0, bw, 20, 3);
    g.fillStyle(C.pink, 0.02);
    g.fillRoundedRect(2, 2, bw - 4, 16, 2);
    g.lineStyle(3.5, C.pink, 0.8);
    g.lineBetween(0, 10, bw, 10);
    g.lineStyle(8, C.pinkBright, 0.06);
    g.lineBetween(0, 10, bw, 10);
    g.lineStyle(20, C.pink, 0.012);
    g.lineBetween(0, 10, bw, 10);
    g.lineStyle(1, C.pink, 0.3);
    g.lineBetween(0, 3, bw, 3);
    g.lineBetween(0, 17, bw, 17);
    for (const cx of [4, bw - 4]) {
      g.fillStyle(C.pinkBright, 1);
      g.fillCircle(cx, 10, 4.5);
      g.fillStyle(C.white, 0.6);
      g.fillCircle(cx, 9, 2);
      g.fillStyle(C.pink, 0.1);
      g.fillCircle(cx, 10, 9);
    }
    g.generateTexture("low_gate", bw, 20);
    g.clear();

    g.fillStyle(C.tunnelDeep, 0.92);
    g.fillRoundedRect(0, 0, 32, 84, 5);
    g.fillStyle(C.purple, 0.02);
    g.fillRoundedRect(2, 2, 28, 80, 4);
    g.lineStyle(2, C.purple, 0.75);
    g.strokeRoundedRect(1, 1, 30, 82, 5);
    g.lineStyle(5, C.purpleDim, 0.1);
    g.strokeRoundedRect(0, 0, 32, 84, 6);
    for (let i = 0; i < 7; i++) {
      g.fillStyle(C.purple, 0.03 + (i % 2) * 0.04);
      g.fillRect(4, 4 + i * 11, 24, 9);
    }
    g.lineStyle(1, C.purple, 0.4);
    g.lineBetween(16, 3, 16, 81);
    for (const cy of [8, 76]) {
      g.fillStyle(C.purpleBright, 0.8);
      g.fillCircle(16, cy, 4);
      g.fillStyle(C.white, 0.45);
      g.fillCircle(16, cy - 1, 1.8);
      g.fillStyle(C.purple, 0.08);
      g.fillCircle(16, cy, 8);
    }
    g.generateTexture("lane_blocker", 32, 84);
    g.clear();
  }

  private coin(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const s = 15, pad = 6, cs = s + pad;

    g.fillStyle(C.coinGlow, 0.04);
    g.fillCircle(cs, cs, s + 6);
    g.fillStyle(C.coinGlow, 0.02);
    g.fillCircle(cs, cs, s + 10);

    fH(g, cs, cs, s, C.coinBody, 1);
    fH(g, cs, cs, s - 1, C.coinLight, 0.2);
    fH(g, cs, cs, s - 3, C.coinBody, 0.25);

    g.fillStyle(C.coinShine, 0.12);
    g.fillEllipse(cs - 4, cs - 4, 7, 12);

    sH(g, cs, cs, s, C.coinShine, 0.55, 2);
    sH(g, cs, cs, s + 2, C.coinGlow, 0.1, 3);
    sH(g, cs, cs, s + 4, C.coinGlow, 0.03, 6);

    fH(g, cs, cs, 6, C.coinGlow, 0.45);
    sH(g, cs, cs, 6, C.coinShine, 0.35, 1);

    g.fillStyle(C.coinShine, 0.2);
    g.fillCircle(cs - 2, cs - 2, 2);

    g.generateTexture("coin", cs * 2, cs * 2);
    g.clear();
  }

  private pups(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const s = 18;

    const drawBase = (col: number, colB: number) => {
      g.fillStyle(col, 0.03);
      g.fillCircle(s, s, s + 4);
      g.fillStyle(C.tunnelDeep, 0.93);
      g.fillRoundedRect(0, 0, s * 2, s * 2, 10);
      g.fillStyle(col, 0.02);
      g.fillRoundedRect(2, 2, s * 2 - 4, s * 2 - 4, 8);
      g.lineStyle(2, col, 0.8);
      g.strokeRoundedRect(0, 0, s * 2, s * 2, 10);
      g.lineStyle(5, colB, 0.06);
      g.strokeRoundedRect(-1, -1, s * 2 + 2, s * 2 + 2, 11);
    };

    drawBase(C.magnetBlue, C.magnetBright);
    g.lineStyle(3.5, C.magnetBlue, 0.75);
    g.beginPath(); g.arc(s, s - 2, 7, PI, 0, false); g.strokePath();
    g.fillStyle(C.magnetBlue, 1);
    g.fillRect(s - 7, s - 2, 4, 14);
    g.fillRect(s + 3, s - 2, 4, 14);
    g.fillStyle(C.laserEdge, 0.9);
    g.fillRect(s - 7, s + 8, 4, 4);
    g.fillStyle(C.cyan, 0.9);
    g.fillRect(s + 3, s + 8, 4, 4);
    g.fillStyle(C.white, 0.2);
    g.fillRect(s - 6, s - 1, 2, 4);
    g.generateTexture("magnet", s * 2, s * 2);
    g.clear();

    drawBase(C.shieldGreen, C.shieldBright);
    g.lineStyle(2.5, C.shieldGreen, 0.75);
    g.beginPath();
    g.moveTo(s, 4); g.lineTo(s + 9, 9); g.lineTo(s + 9, 20);
    g.lineTo(s, 28); g.lineTo(s - 9, 20); g.lineTo(s - 9, 9);
    g.closePath(); g.strokePath();
    g.fillStyle(C.shieldGreen, 0.15);
    g.beginPath();
    g.moveTo(s, 4); g.lineTo(s + 9, 9); g.lineTo(s + 9, 20);
    g.lineTo(s, 28); g.lineTo(s - 9, 20); g.lineTo(s - 9, 9);
    g.closePath(); g.fillPath();
    g.fillStyle(C.shieldBright, 0.1);
    g.fillEllipse(s - 2, 12, 6, 8);
    g.generateTexture("shield_pu", s * 2, s * 2);
    g.clear();

    drawBase(C.boostOrange, C.boostBright);
    g.fillStyle(C.boostOrange, 1);
    g.fillTriangle(s - 5, s + 8, s + 1, s - 10, s + 3, s + 2);
    g.fillStyle(C.boostBright, 1);
    g.fillTriangle(s - 3, s + 2, s + 5, s + 2, s + 1, s + 10);
    g.fillStyle(C.white, 0.25);
    g.fillTriangle(s - 2, s + 4, s, s - 5, s + 1, s + 1);
    g.generateTexture("boost_pu", s * 2, s * 2);
    g.clear();
  }

  private ground(g: Phaser.GameObjects.Graphics) {
    const tW = LANE_WIDTH * 3 + 20;
    g.clear();
    g.fillGradientStyle(C.tunnelMid, C.tunnelMid, C.tunnelDeep, C.tunnelDeep, 0.7);
    g.fillRect(0, 0, tW, 28);

    for (let i = 0; i < tW; i += 4) {
      g.fillStyle(C.cyan, (i % 8 === 0) ? 0.025 : 0.01);
      g.fillRect(i, 0, 1.5, 28);
    }

    g.lineStyle(3, C.hexAmber, 0.5);
    g.lineBetween(0, 0, tW, 0);
    g.lineStyle(8, C.hexAmberHot, 0.05);
    g.lineBetween(0, 0, tW, 0);
    g.lineStyle(18, C.hexAmber, 0.012);
    g.lineBetween(0, 0, tW, 0);

    g.lineStyle(1, C.cyanDim, 0.1);
    g.lineBetween(0, 27, tW, 27);

    for (let i = 1; i < 3; i++) {
      const lx = i * LANE_WIDTH + 10;
      g.lineStyle(1, C.hexAmber, 0.1);
      g.lineBetween(lx, 0, lx, 28);
    }

    g.generateTexture("ground_tile", tW, 28);
    g.clear();
  }

  private parts(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(C.hexAmberHot, 0.8);
    g.fillCircle(6, 6, 5);
    g.fillStyle(C.hexAmberWhite, 0.3);
    g.fillCircle(5, 5, 2.5);
    g.fillStyle(C.white, 0.2);
    g.fillCircle(4.5, 4.5, 1);
    g.generateTexture("particle_amber", 12, 12);
    g.clear();

    g.fillStyle(C.cyan, 0.7);
    g.fillCircle(5, 5, 4);
    g.fillStyle(C.cyanBright, 0.3);
    g.fillCircle(4, 4, 2);
    g.generateTexture("particle_cyan", 10, 10);
    g.clear();

    g.fillStyle(C.white, 0.45);
    g.fillRect(0, 0, 2, 16);
    g.fillStyle(C.cyan, 0.2);
    g.fillRect(0, 0, 2, 16);
    g.fillStyle(C.white, 0.35);
    g.fillRect(0, 0, 2, 4);
    g.generateTexture("speed_line", 2, 16);
    g.clear();

    g.fillStyle(C.hexAmberHot, 0.6);
    g.fillRect(0, 0, 3, 3);
    g.fillStyle(C.white, 0.3);
    g.fillRect(0, 0, 1, 1);
    g.generateTexture("spark", 3, 3);
    g.clear();
  }

  private hexFrame(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const cx = W / 2, cy = H * 0.4;
    const sizes = [100, 125, 155, 190, 230];
    for (let i = 0; i < sizes.length; i++) {
      const a = [0.3, 0.18, 0.1, 0.05, 0.02][i];
      const lw = [2.5, 2, 1.5, 1, 0.5][i];
      sH(g, cx, cy, sizes[i], C.hexAmber, a, lw);
      if (i < 3) {
        sH(g, cx, cy, sizes[i] + 2, C.hexAmberHot, a * 0.25, lw + 3);
        sH(g, cx, cy, sizes[i] + 5, C.hexAmber, a * 0.06, lw + 8);
      }
      if (i < 2) {
        const pts = hv(cx, cy, sizes[i]);
        for (const p of pts) {
          g.fillStyle(C.hexAmberHot, 0.2 - i * 0.06);
          g.fillCircle(p[0], p[1], 3 - i);
          g.fillStyle(C.hexAmber, 0.06);
          g.fillCircle(p[0], p[1], 6 - i * 2);
        }
      }
    }
    g.generateTexture("hex_frame", W, H);
    g.clear();
  }
}

class MenuScene extends Phaser.Scene {
  constructor() { super({ key: "Menu" }); }
  create() {
    this.add.tileSprite(0, 0, W, H, "bg_tunnel").setOrigin(0, 0);
    this.add.image(CX, H / 2, "nebula").setAlpha(0.6);
    const stars = this.add.image(CX, H / 2, "stars").setAlpha(0.7);
    this.tweens.add({ targets: stars, alpha: 0.4, duration: 3500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const rays = this.add.image(CX, H / 2, "god_rays").setAlpha(0.6);
    this.tweens.add({ targets: rays, alpha: 0.3, angle: 3, duration: 6000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    this.add.rectangle(CX, H / 2, W, H, 0x000000, 0.15);
    this.add.image(CX, H * 0.4, "hex_frame").setAlpha(0.85);

    const titleGlow = this.add.text(CX, 70, "HONEY", {
      fontSize: "60px", fontFamily: "monospace", color: "#f0a000", fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0.06);
    this.tweens.add({ targets: titleGlow, alpha: 0.12, scaleX: 1.03, scaleY: 1.03, duration: 2800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    this.add.text(CX, 70, "HONEY", {
      fontSize: "56px", fontFamily: "monospace", color: "#ffc030",
      fontStyle: "bold", stroke: "#503000", strokeThickness: 7,
    }).setOrigin(0.5);

    this.add.text(CX, 126, "RUNNER", {
      fontSize: "38px", fontFamily: "monospace", color: "#ffd860",
      fontStyle: "bold", stroke: "#503000", strokeThickness: 5,
    }).setOrigin(0.5);

    const sub = this.add.text(CX, 158, "C Y B E R   H I V E", {
      fontSize: "10px", fontFamily: "monospace", color: "#00d4f0",
      letterSpacing: 5,
    }).setOrigin(0.5);
    this.tweens.add({ targets: sub, alpha: 0.35, duration: 2200, yoyo: true, repeat: -1 });

    for (let i = 0; i < 3; i++) {
      const pulse = this.add.circle(CX, 250, 35 + i * 18, C.hexAmber, 0.015 - i * 0.003);
      this.tweens.add({ targets: pulse, scaleX: 1.4 + i * 0.2, scaleY: 1.4 + i * 0.2, alpha: 0, duration: 2200 + i * 300, repeat: -1, delay: i * 300 });
    }

    const shadow = this.add.image(CX, 302, "bee_shadow").setScale(4.2).setAlpha(0.3);
    const body = this.add.image(CX, 250, "runner").setScale(3.8);
    const wL = this.add.image(CX - 22, 224, "wing_l").setScale(3.5).setAlpha(0.65);
    const wR = this.add.image(CX + 22, 224, "wing_r").setScale(3.5).setAlpha(0.65);

    this.tweens.add({ targets: body, y: 244, duration: 1700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: shadow, scaleX: 3.8, alpha: 0.2, duration: 1700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: wL, scaleY: 1.2, scaleX: 3.8, alpha: 0.3, duration: 45, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: wR, scaleY: 1.2, scaleX: 3.8, alpha: 0.3, duration: 45, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: [wL, wR], y: 218, duration: 1700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const best = getBestScore();
    if (best > 0) {
      this.add.text(CX, 330, `BEST: ${best.toLocaleString()}`, {
        fontSize: "18px", fontFamily: "monospace", color: "#ffd860",
        fontStyle: "bold", stroke: "#000", strokeThickness: 4,
      }).setOrigin(0.5);
    }

    const bg = this.add.rectangle(CX, 386, 200, 58, C.hexAmber, 0.03);
    this.tweens.add({ targets: bg, scaleX: 1.3, scaleY: 1.4, alpha: 0, duration: 2200, repeat: -1 });

    const btn = this.add.rectangle(CX, 386, 188, 54, C.beeBody, 1).setInteractive({ useHandCursor: true });
    btn.setStrokeStyle(3, C.hexAmberHot);
    this.add.text(CX, 386, "PLAY", {
      fontSize: "26px", fontFamily: "monospace", color: "#1a0800", fontStyle: "bold",
    }).setOrigin(0.5);
    btn.on("pointerdown", () => this.scene.start("Game"));
    this.tweens.add({ targets: btn, scaleX: 1.03, scaleY: 1.03, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const ctrl = [
      "CONTROLS:",
      "",
      "Arrow Left / Right \u2013 Change Lane",
      "Arrow Up / Swipe Up \u2013 Jump",
      "Arrow Down / Swipe Down \u2013 Slide",
      "",
      "Collect honey & dodge lasers!",
    ];
    this.add.text(CX, 498, ctrl.join("\n"), {
      fontSize: "9px", fontFamily: "monospace", color: "#2a4060",
      align: "center", lineSpacing: 5,
    }).setOrigin(0.5);

    this.add.text(CX, H - 28, "A Honeycomb Arena Game", {
      fontSize: "8px", fontFamily: "monospace", color: "#141e30",
    }).setOrigin(0.5);

    this.add.image(CX, H / 2, "scanlines").setAlpha(0.25);
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

  private scoreTxt!: Phaser.GameObjects.Text;
  private coinTxt!: Phaser.GameObjects.Text;
  private spdTxt!: Phaser.GameObjects.Text;
  private puIcons: Phaser.GameObjects.Container[] = [];

  private bgTunnel!: Phaser.GameObjects.TileSprite;
  private bgNeb!: Phaser.GameObjects.TileSprite;
  private bgStars!: Phaser.GameObjects.Image;
  private bgRays!: Phaser.GameObjects.Image;
  private gTiles: Phaser.GameObjects.TileSprite[] = [];

  private obsTimer?: Phaser.Time.TimerEvent;
  private coinTimer?: Phaser.Time.TimerEvent;
  private puTimer?: Phaser.Time.TimerEvent;

  private swipe: { x: number; y: number; t: number } | null = null;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private shieldVis?: Phaser.GameObjects.Arc;
  private fc = 0;

  constructor() { super({ key: "Game" }); }

  create() {
    this.lane = 1; this.sliding = false; this.speed = INITIAL_SPEED;
    this.dist = 0; this.score = 0; this.coins = 0; this.alive = true;
    this.pu = { magnet: false, shield: false, boost: false };
    this.puIcons = []; this.gTiles = []; this.fc = 0;

    this.bgTunnel = this.add.tileSprite(0, 0, W, H, "bg_tunnel").setOrigin(0, 0).setScrollFactor(0);
    this.bgNeb = this.add.tileSprite(0, 0, W, H, "nebula").setOrigin(0, 0).setScrollFactor(0).setAlpha(0.35);
    this.bgStars = this.add.image(CX, H / 2, "stars").setAlpha(0.4);
    this.bgRays = this.add.image(CX, H / 2, "god_rays").setAlpha(0.3);

    this.add.rectangle(CX, GROUND_Y - 50, LANE_WIDTH * 3 + 14, 230, C.tunnelDeep, 0.25);

    for (let i = 0; i <= LANE_COUNT; i++) {
      const lx = CX + LANE_POSITIONS[0] - LANE_WIDTH / 2 + i * LANE_WIDTH;
      const edge = (i === 0 || i === LANE_COUNT);
      this.add.line(0, 0, lx, GROUND_Y - 165, lx, GROUND_Y + 28, C.hexAmber, edge ? 0.16 : 0.05).setOrigin(0, 0);
      if (edge) this.add.line(0, 0, lx, GROUND_Y - 165, lx, GROUND_Y + 28, C.hexAmber, 0.025).setOrigin(0, 0).setLineWidth(5);
    }

    this.gTiles.push(this.add.tileSprite(CX, GROUND_Y, LANE_WIDTH * 3 + 20, 28, "ground_tile"));

    this.obsGroup = this.physics.add.group({ allowGravity: false });
    this.coinGroup = this.physics.add.group({ allowGravity: false });
    this.puGroup = this.physics.add.group({ allowGravity: false });

    this.beeShadow = this.add.image(CX, GROUND_Y - 6, "bee_shadow").setScale(1.8).setAlpha(0.25).setDepth(4);

    this.runner = this.physics.add.sprite(CX, RUNNER_Y, "runner");
    this.runner.setCollideWorldBounds(false);
    this.runner.setGravityY(GRAVITY);
    this.runner.setSize(40, 52);
    this.runner.setDepth(10);

    this.wingL = this.add.image(CX - 20, RUNNER_Y - 14, "wing_l").setScale(1.35).setAlpha(0.6).setDepth(9);
    this.wingR = this.add.image(CX + 20, RUNNER_Y - 14, "wing_r").setScale(1.35).setAlpha(0.6).setDepth(11);
    this.tweens.add({ targets: this.wingL, scaleY: 0.35, alpha: 0.2, duration: 40, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: this.wingR, scaleY: 0.35, alpha: 0.2, duration: 40, yoyo: true, repeat: -1 });

    this.particles = this.add.particles(0, 0, "particle_amber", {
      speed: { min: 20, max: 65 }, scale: { start: 0.5, end: 0 },
      alpha: { start: 0.6, end: 0 }, lifespan: 600, frequency: 40,
      follow: this.runner, followOffset: { x: 0, y: 28 },
      blendMode: "ADD", tint: [C.hexAmberHot, C.hexAmberWhite, C.cyan],
    }).setDepth(8);

    this.shieldVis = this.add.circle(CX, RUNNER_Y, 38, C.shieldGreen, 0.08);
    this.shieldVis.setStrokeStyle(2, C.shieldBright, 0.4);
    this.shieldVis.setVisible(false).setDepth(12);

    this.physics.add.overlap(this.runner, this.obsGroup, this.hitObs, undefined, this);
    this.physics.add.overlap(this.runner, this.coinGroup, this.getCoin, undefined, this);
    this.physics.add.overlap(this.runner, this.puGroup, this.getPU, undefined, this);

    this.schedObs();
    this.coinTimer = this.time.addEvent({ delay: COIN_SPAWN_INTERVAL, callback: this.spawnCoin, callbackScope: this, loop: true });
    this.puTimer = this.time.addEvent({ delay: POWERUP_SPAWN_INTERVAL, callback: this.spawnPU, callbackScope: this, loop: true });

    this.setupInput();
    this.makeHUD();

    this.add.image(CX, H / 2, "scanlines").setAlpha(0.12).setDepth(99).setScrollFactor(0);
    this.add.image(CX, H / 2, "vignette").setAlpha(0.55).setDepth(100).setScrollFactor(0);
  }

  private makeHUD() {
    const bg = this.add.rectangle(CX, 18, W - 14, 32, C.hudBg, 0.8).setDepth(90).setScrollFactor(0);
    bg.setStrokeStyle(1, C.hudBorder, 0.25);
    this.scoreTxt = this.add.text(CX, 18, "0", {
      fontSize: "18px", fontFamily: "monospace", color: "#ffc030", fontStyle: "bold", stroke: "#000", strokeThickness: 3,
    }).setOrigin(0.5).setDepth(91).setScrollFactor(0);
    this.coinTxt = this.add.text(68, 18, " 0", {
      fontSize: "13px", fontFamily: "monospace", color: "#ffd040", stroke: "#000", strokeThickness: 2,
    }).setOrigin(0, 0.5).setDepth(91).setScrollFactor(0);
    this.add.image(54, 18, "coin").setScale(0.55).setDepth(91).setScrollFactor(0);
    this.spdTxt = this.add.text(W - 14, 18, `${INITIAL_SPEED.toFixed(1)}x`, {
      fontSize: "11px", fontFamily: "monospace", color: "#00d4f0", stroke: "#000", strokeThickness: 2,
    }).setOrigin(1, 0.5).setDepth(91).setScrollFactor(0);
  }

  private setupInput() {
    const c = this.input.keyboard?.createCursorKeys();
    if (c) {
      c.left?.on("down", () => this.mvL());
      c.right?.on("down", () => this.mvR());
      c.up?.on("down", () => this.jump());
      c.down?.on("down", () => this.slide());
    }
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
      else { dy < 0 ? this.jump() : this.slide(); }
    });
  }

  private mvL() { if (this.alive && this.lane > 0) { this.lane--; this.tweens.add({ targets: this.runner, x: CX + LANE_POSITIONS[this.lane], duration: 120, ease: "Power2" }); } }
  private mvR() { if (this.alive && this.lane < LANE_COUNT - 1) { this.lane++; this.tweens.add({ targets: this.runner, x: CX + LANE_POSITIONS[this.lane], duration: 120, ease: "Power2" }); } }
  private jump() {
    if (!this.alive) return;
    const b = this.runner.body as Phaser.Physics.Arcade.Body;
    if (b.y + b.height >= GROUND_Y - 2) b.setVelocityY(JUMP_VELOCITY);
  }
  private slide() {
    if (!this.alive || this.sliding) return;
    this.sliding = true;
    this.runner.setTexture("runner_slide");
    this.runner.setSize(50, 24);
    this.runner.y = GROUND_Y - 16;
    this.slideTimer = this.time.delayedCall(SLIDE_DURATION, () => {
      if (!this.alive) return;
      this.sliding = false;
      this.runner.setTexture("runner");
      this.runner.setSize(40, 52);
    });
  }

  private schedObs() {
    const d = Phaser.Math.Between(OBSTACLE_SPAWN_INTERVAL_MIN, OBSTACLE_SPAWN_INTERVAL_MAX);
    this.obsTimer = this.time.delayedCall(d, () => { this.spawnObs(); if (this.alive) this.schedObs(); });
  }
  private spawnObs() {
    const l = Phaser.Math.Between(0, LANE_COUNT - 1);
    const t = Phaser.Math.Between(0, 2);
    const tx = ["barrier", "low_gate", "lane_blocker"];
    const o = this.obsGroup.create(CX + LANE_POSITIONS[l], -60, tx[t]) as Phaser.Physics.Arcade.Sprite;
    o.setImmovable(true).setDepth(6);
    if (t === 1) { o.y = -20; o.setSize(78, 16); }
    else if (t === 2) o.setSize(28, 78);
    else o.setSize(72, 48);
  }
  private spawnCoin() {
    const l = Phaser.Math.Between(0, LANE_COUNT - 1);
    const c = this.coinGroup.create(CX + LANE_POSITIONS[l], -30, "coin") as Phaser.Physics.Arcade.Sprite;
    c.setDepth(5).setSize(24, 24);
    this.tweens.add({ targets: c, scaleX: 0.65, duration: 350, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }
  private spawnPU() {
    const l = Phaser.Math.Between(0, LANE_COUNT - 1);
    const ts = ["magnet", "shield_pu", "boost_pu"];
    const p = this.puGroup.create(CX + LANE_POSITIONS[l], -30, ts[Phaser.Math.Between(0, 2)]) as Phaser.Physics.Arcade.Sprite;
    p.setDepth(5).setSize(30, 30);
    this.tweens.add({ targets: p, angle: 360, duration: 3000, repeat: -1 });
    this.tweens.add({ targets: p, scaleX: 1.12, scaleY: 1.12, duration: 500, yoyo: true, repeat: -1 });
  }

  private hitObs(_r: any, o: any) {
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

    this.cameras.main.shake(300, 0.015);
    this.cameras.main.flash(250, 255, 15, 15);

    for (let i = 0; i < 16; i++) {
      const s = this.add.image(this.runner.x, this.runner.y, "spark").setScale(3).setAlpha(0.9).setDepth(20).setTint(C.laserWhite);
      this.tweens.add({ targets: s, x: s.x + Phaser.Math.Between(-90, 90), y: s.y + Phaser.Math.Between(-90, 90), alpha: 0, scale: 0, duration: 500, onComplete: () => s.destroy() });
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

    this.time.delayedCall(800, () => {
      this.gTiles = [];
      this.scene.start("GameOver", { score: fs, coins: this.coins, distance: Math.floor(this.dist), bestScore: nb ? fs : bs, isNewBest: nb, speed: this.speed });
    });
  }

  private getCoin(_r: any, c: any) {
    c.destroy();
    this.coins++;
    this.score += COIN_SCORE;
    const p = this.add.text(this.runner.x + 15, this.runner.y - 22, `+${COIN_SCORE}`, {
      fontSize: "14px", fontFamily: "monospace", color: "#ffd040", fontStyle: "bold", stroke: "#000", strokeThickness: 3,
    }).setDepth(30);
    this.tweens.add({ targets: p, y: p.y - 40, alpha: 0, duration: 500, onComplete: () => p.destroy() });
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
    const bg = this.add.rectangle(0, 0, 28, 28, col, 0.12).setStrokeStyle(1, col, 0.45);
    const lb = this.add.text(0, 0, type[0].toUpperCase(), { fontSize: "12px", fontFamily: "monospace", color: `#${col.toString(16).padStart(6, "0")}`, fontStyle: "bold" }).setOrigin(0.5);
    const ct = this.add.container(20 + this.puIcons.length * 32, 50, [bg, lb]).setDepth(91);
    (ct as any).__t = type;
    this.puIcons.push(ct);
  }

  private rmPUIcon(type: string) {
    this.puIcons = this.puIcons.filter((c) => { if ((c as any).__t === type) { c.destroy(); return false; } return true; });
  }

  update(_t: number, delta: number) {
    if (!this.alive) return;
    this.fc++;

    this.speed = Math.min(MAX_SPEED, this.speed + SPEED_RAMP * (delta / 16));
    const es = this.pu.boost ? this.speed * BOOST_SPEED_MULT : this.speed;
    this.dist += es * (delta / 16) * 0.15;
    this.score += Math.floor(es * (delta / 16) * 0.1);

    this.bgTunnel.tilePositionY -= es * 0.3;
    this.bgNeb.tilePositionY -= es * 0.15;
    this.bgNeb.tilePositionX += 0.06;

    this.gTiles.forEach((gt) => { gt.tilePositionY -= es * 0.5; });

    this.wingL.x = this.runner.x - 20;
    this.wingR.x = this.runner.x + 20;
    this.wingL.y = this.runner.y - 16;
    this.wingR.y = this.runner.y - 16;

    this.beeShadow.x = this.runner.x;
    const sd = Math.max(0, GROUND_Y - this.runner.y);
    this.beeShadow.setScale(Math.max(0.4, 1.8 - sd * 0.01)).setAlpha(Math.max(0.06, 0.25 - sd * 0.002));

    if (this.shieldVis) { this.shieldVis.x = this.runner.x; this.shieldVis.y = this.runner.y; }

    const body = this.runner.body as Phaser.Physics.Arcade.Body;
    if (!this.sliding && body.y + body.height > GROUND_Y) {
      body.y = GROUND_Y - body.height;
      body.setVelocityY(0);
    }

    if (es > 6.5 && this.fc % 2 === 0) {
      const sl = this.add.image(Phaser.Math.Between(15, W - 15), -10, "speed_line")
        .setAlpha(0.12 + (es - 6.5) * 0.05).setScale(1, 1 + es * 0.18).setDepth(2);
      this.tweens.add({ targets: sl, y: H + 20, alpha: 0, duration: 250 + Phaser.Math.Between(0, 150), onComplete: () => sl.destroy() });
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
  }
}

class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: "GameOver" }); }
  create(data: { score: number; coins: number; distance: number; bestScore: number; isNewBest: boolean; speed: number }) {
    this.add.tileSprite(0, 0, W, H, "bg_tunnel").setOrigin(0, 0);
    this.add.image(CX, H / 2, "nebula").setAlpha(0.35);
    this.add.rectangle(CX, H / 2, W, H, 0x000000, 0.45);

    const tg = this.add.text(CX, 48, "GAME OVER", {
      fontSize: "42px", fontFamily: "monospace", color: "#ff1040", fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0.08);
    this.tweens.add({ targets: tg, alpha: 0.15, duration: 2000, yoyo: true, repeat: -1 });

    this.add.text(CX, 48, "GAME OVER", {
      fontSize: "40px", fontFamily: "monospace", color: "#ff1040",
      fontStyle: "bold", stroke: "#300008", strokeThickness: 6,
    }).setOrigin(0.5);

    if (data.isNewBest) {
      const nb = this.add.text(CX, 88, "NEW BEST!", {
        fontSize: "22px", fontFamily: "monospace", color: "#ffd860",
        fontStyle: "bold", stroke: "#503000", strokeThickness: 4,
      }).setOrigin(0.5);
      this.tweens.add({ targets: nb, scaleX: 1.06, scaleY: 1.06, duration: 650, yoyo: true, repeat: -1 });
    }

    const bg = this.add.circle(CX, 136, 28, C.hexAmber, 0.03);
    this.tweens.add({ targets: bg, scaleX: 1.6, scaleY: 1.6, alpha: 0, duration: 2200, repeat: -1 });
    const bee = this.add.image(CX, 136, "runner").setScale(2.6);
    this.tweens.add({ targets: bee, y: 130, duration: 1600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const sy = 178;
    const stats = [
      { l: "SCORE", v: data.score.toLocaleString(), c: "#ffc030" },
      { l: "HONEY", v: data.coins.toString(), c: "#ffd860" },
      { l: "DISTANCE", v: `${data.distance.toLocaleString()}m`, c: "#00d4f0" },
      { l: "TOP SPEED", v: `${data.speed.toFixed(1)}x`, c: "#ff6000" },
      { l: "BEST", v: data.bestScore.toLocaleString(), c: "#f0a000" },
    ];
    stats.forEach((s, i) => {
      const y = sy + i * 46;
      this.add.rectangle(CX, y + 8, 296, 38, C.hudBg, 0.85).setStrokeStyle(1, C.hudBorder, 0.2);
      this.add.text(CX - 134, y, s.l, { fontSize: "10px", fontFamily: "monospace", color: "#2a4060" });
      const val = this.add.text(CX + 134, y + 13, s.v, {
        fontSize: "20px", fontFamily: "monospace", color: s.c, fontStyle: "bold", stroke: "#000", strokeThickness: 3,
      }).setOrigin(1, 0.5).setAlpha(0).setScale(0.8);
      this.tweens.add({ targets: val, alpha: 1, scaleX: 1, scaleY: 1, duration: 350, delay: 200 + i * 120, ease: "Back.easeOut" });
    });

    const btnG = this.add.rectangle(CX, 452, 210, 56, C.hexAmber, 0.03);
    this.tweens.add({ targets: btnG, scaleX: 1.25, scaleY: 1.25, alpha: 0, duration: 1800, repeat: -1 });
    const retry = this.add.rectangle(CX, 452, 204, 52, C.beeBody, 1).setInteractive({ useHandCursor: true });
    retry.setStrokeStyle(3, C.hexAmberHot);
    this.add.text(CX, 452, "PLAY AGAIN", { fontSize: "18px", fontFamily: "monospace", color: "#1a0800", fontStyle: "bold" }).setOrigin(0.5);
    retry.on("pointerdown", () => this.scene.start("Game"));
    this.tweens.add({ targets: retry, scaleX: 1.03, scaleY: 1.03, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const menu = this.add.rectangle(CX, 516, 204, 42, C.tunnelMid, 1).setInteractive({ useHandCursor: true });
    menu.setStrokeStyle(1, C.hexAmber, 0.18);
    this.add.text(CX, 516, "MENU", { fontSize: "14px", fontFamily: "monospace", color: "#f0a000" }).setOrigin(0.5);
    menu.on("pointerdown", () => this.scene.start("Menu"));

    this.input.keyboard?.once("keydown-SPACE", () => this.scene.start("Game"));
    this.input.keyboard?.once("keydown-ENTER", () => this.scene.start("Game"));

    this.add.image(CX, H / 2, "scanlines").setAlpha(0.18);
    this.add.image(CX, H / 2, "vignette").setAlpha(0.75);
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
