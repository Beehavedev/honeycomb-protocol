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

function hexVerts(cx: number, cy: number, r: number, rotation = -PI / 6): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (PI / 3) * i + rotation;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

function strokeHex(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, color: number, alpha: number, lw = 1) {
  const pts = hexVerts(cx, cy, r);
  g.lineStyle(lw, color, alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < 6; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.strokePath();
}

function fillHex(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, color: number, alpha: number) {
  const pts = hexVerts(cx, cy, r);
  g.fillStyle(color, alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < 6; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fillPath();
}

class BootScene extends Phaser.Scene {
  constructor() { super({ key: "Boot" }); }

  create() {
    const g = this.make.graphics({ x: 0, y: 0 });
    this.genTunnelBg(g);
    this.genTunnelFg(g);
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
    g.destroy();
    this.scene.start("Menu");
  }

  private genTunnelBg(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    g.fillGradientStyle(0x08021a, 0x08021a, 0x140830, 0x140830, 1);
    g.fillRect(0, 0, W, H);

    const vanishX = W / 2, vanishY = H * 0.18;
    const ringCount = 8;
    for (let i = ringCount; i >= 0; i--) {
      const t = i / ringCount;
      const r = 30 + t * (W * 0.75);
      const cy = vanishY + t * (H * 0.55);
      const squeeze = 0.8 + t * 0.2;

      fillHex(g, vanishX, cy, r * squeeze, C.tunnelWall, 0.15 + t * 0.15);

      const ringAlpha = 0.2 + t * 0.4;
      strokeHex(g, vanishX, cy, r * squeeze, C.hexRingAmber, ringAlpha, 1.5 + t);
      if (t > 0.3) {
        strokeHex(g, vanishX, cy, r * squeeze + 3, C.hexRingAmber, ringAlpha * 0.25, 3);
      }
    }

    const hexR = 22;
    const hexH = hexR * Math.sqrt(3);
    for (let row = -1; row < H / hexH + 1; row++) {
      for (let col = -1; col < W / (hexR * 1.5) + 1; col++) {
        const hx = col * hexR * 1.5;
        const hy = row * hexH + (col % 2 ? hexH / 2 : 0);
        const distToVanish = Math.sqrt((hx - vanishX) ** 2 + (hy - vanishY) ** 2) / (W * 0.7);
        const a = Math.max(0.02, 0.1 - distToVanish * 0.08);
        strokeHex(g, hx, hy, hexR - 2, C.neonCyan, a * 0.5);

        if (Math.random() < 0.04) {
          fillHex(g, hx, hy, hexR - 3, C.neonCyan, 0.02 + Math.random() * 0.03);
        }
      }
    }

    for (let i = 0; i < 6; i++) {
      const angle = (PI / 3) * i - PI / 6;
      const ex = vanishX + Math.cos(angle) * W * 1.2;
      const ey = vanishY + Math.sin(angle) * H * 1.2;
      g.lineStyle(1, C.hexRingAmberDim, 0.08);
      g.lineBetween(vanishX, vanishY, ex, ey);
    }

    g.generateTexture("bg_tunnel", W, H);
    g.clear();
  }

  private genTunnelFg(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    for (let i = 0; i < 100; i++) {
      const sx = Math.random() * W;
      const sy = Math.random() * H;
      const sr = 0.3 + Math.random() * 1.5;
      const colors = [C.neonCyan, C.neonPink, C.neonPurple, C.white, C.hexRingAmberBright];
      g.fillStyle(colors[Math.floor(Math.random() * colors.length)], 0.1 + Math.random() * 0.5);
      g.fillCircle(sx, sy, sr);
    }

    for (let i = 0; i < 8; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      g.fillStyle(C.neonPurple, 0.015 + Math.random() * 0.015);
      g.fillCircle(x, y, 25 + Math.random() * 40);
    }

    g.generateTexture("bg_particles", W, H);
    g.clear();
  }

  private genBee(g: Phaser.GameObjects.Graphics) {
    const w = 44, h = 52;
    g.clear();

    g.fillStyle(C.beeGold, 1);
    g.fillEllipse(w / 2, 15, 20, 18);

    g.fillStyle(C.beeGoldDark, 0.4);
    g.fillEllipse(w / 2, 17, 16, 12);

    g.fillStyle(C.black, 1);
    g.fillCircle(w / 2 - 5, 12, 3.5);
    g.fillCircle(w / 2 + 5, 12, 3.5);

    g.fillStyle(C.beeEye, 1);
    g.fillCircle(w / 2 - 5, 11, 2);
    g.fillCircle(w / 2 + 5, 11, 2);
    g.fillStyle(C.white, 0.8);
    g.fillCircle(w / 2 - 4, 10, 0.8);
    g.fillCircle(w / 2 + 6, 10, 0.8);

    g.lineStyle(1.5, C.beeGoldDark, 0.9);
    g.beginPath();
    g.moveTo(w / 2 - 4, 6);
    g.lineTo(w / 2 - 7, 1);
    g.strokePath();
    g.beginPath();
    g.moveTo(w / 2 + 4, 6);
    g.lineTo(w / 2 + 7, 1);
    g.strokePath();
    g.fillStyle(C.neonCyan, 0.9);
    g.fillCircle(w / 2 - 7, 1, 2);
    g.fillCircle(w / 2 + 7, 1, 2);

    g.fillStyle(C.beeGold, 1);
    g.fillEllipse(w / 2, 34, 26, 28);

    g.fillStyle(C.beeGoldLight, 0.3);
    g.fillEllipse(w / 2 - 4, 30, 10, 14);

    const stripes = [27, 33, 39];
    for (const sy of stripes) {
      g.fillStyle(C.beeStripe, 0.9);
      g.fillRect(w / 2 - 12, sy, 24, 3);
    }

    g.lineStyle(1.5, C.hexRingAmber, 0.4);
    g.strokeEllipse(w / 2, 34, 26, 28);

    g.fillStyle(C.beeGoldDark, 1);
    g.fillTriangle(w / 2, h - 4, w / 2 - 3, h - 10, w / 2 + 3, h - 10);

    g.fillStyle(C.hexRingAmber, 0.06);
    g.fillCircle(w / 2, 30, 28);

    g.generateTexture("runner", w, h);
    g.clear();
  }

  private genBeeSlide(g: Phaser.GameObjects.Graphics) {
    const w = 50, h = 26;
    g.clear();

    g.fillStyle(C.beeGold, 1);
    g.fillEllipse(12, h / 2, 16, 14);

    g.fillStyle(C.black, 1);
    g.fillCircle(8, h / 2 - 2, 2.5);
    g.fillCircle(14, h / 2 - 2, 2.5);
    g.fillStyle(C.beeEye, 1);
    g.fillCircle(8, h / 2 - 3, 1.3);
    g.fillCircle(14, h / 2 - 3, 1.3);

    g.fillStyle(C.beeGold, 1);
    g.fillEllipse(w / 2 + 3, h / 2, 30, 18);

    g.fillStyle(C.beeGoldLight, 0.25);
    g.fillEllipse(w / 2, h / 2 - 3, 16, 8);

    const sx = [22, 29, 36];
    for (const x of sx) {
      g.fillStyle(C.beeStripe, 0.9);
      g.fillRect(x, h / 2 - 7, 3, 14);
    }

    g.lineStyle(1.5, C.hexRingAmber, 0.35);
    g.strokeEllipse(w / 2 + 3, h / 2, 30, 18);

    g.fillStyle(C.beeWing, 0.2);
    g.fillEllipse(16, 3, 18, 8);
    g.fillEllipse(30, 2, 14, 6);

    g.generateTexture("runner_slide", w, h);
    g.clear();
  }

  private genBeeShadow(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(C.black, 0.25);
    g.fillEllipse(20, 6, 36, 10);
    g.fillStyle(C.black, 0.1);
    g.fillEllipse(20, 6, 44, 14);
    g.generateTexture("bee_shadow", 40, 12);
    g.clear();
  }

  private genWingL(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(C.beeWing, 0.35);
    g.fillEllipse(12, 14, 22, 26);
    g.lineStyle(1, C.beeWingGlow, 0.5);
    g.strokeEllipse(12, 14, 22, 26);
    g.fillStyle(C.beeWingGlow, 0.15);
    g.fillEllipse(10, 12, 14, 18);
    g.lineStyle(0.5, C.white, 0.2);
    g.lineBetween(6, 5, 14, 20);
    g.lineBetween(4, 14, 18, 10);
    g.generateTexture("wing_l", 24, 28);
    g.clear();
  }

  private genWingR(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(C.beeWing, 0.35);
    g.fillEllipse(12, 14, 22, 26);
    g.lineStyle(1, C.beeWingGlow, 0.5);
    g.strokeEllipse(12, 14, 22, 26);
    g.fillStyle(C.beeWingGlow, 0.15);
    g.fillEllipse(14, 12, 14, 18);
    g.lineStyle(0.5, C.white, 0.2);
    g.lineBetween(18, 5, 10, 20);
    g.lineBetween(20, 14, 6, 10);
    g.generateTexture("wing_r", 24, 28);
    g.clear();
  }

  private genObstacles(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(C.tunnelDark, 0.85);
    g.fillRoundedRect(0, 0, 74, 50, 3);
    for (let i = 0; i < 5; i++) {
      const ly = 6 + i * 10;
      g.lineStyle(1.5, C.laserRed, 0.7 - i * 0.1);
      g.lineBetween(4, ly, 70, ly);
      g.lineStyle(3, C.laserRed, 0.08);
      g.lineBetween(4, ly, 70, ly);
    }
    g.lineStyle(2, C.laserRed, 0.9);
    g.strokeRoundedRect(1, 1, 72, 48, 3);
    g.lineStyle(4, C.laserRedGlow, 0.12);
    g.strokeRoundedRect(0, 0, 74, 50, 4);
    g.fillStyle(C.laserRedGlow, 0.9);
    g.fillCircle(5, 5, 3); g.fillCircle(69, 5, 3);
    g.fillCircle(5, 45, 3); g.fillCircle(69, 45, 3);
    g.fillStyle(C.laserRed, 0.04);
    g.fillRect(2, 2, 70, 46);
    g.generateTexture("barrier", 74, 50);
    g.clear();

    g.fillStyle(C.tunnelDark, 0.8);
    g.fillRoundedRect(0, 0, 74, 16, 2);
    g.lineStyle(3, C.neonPink, 0.9);
    g.lineBetween(0, 8, 74, 8);
    g.lineStyle(8, C.neonPink, 0.08);
    g.lineBetween(0, 8, 74, 8);
    g.lineStyle(1, C.neonPink, 0.4);
    g.lineBetween(0, 3, 74, 3);
    g.lineBetween(0, 13, 74, 13);
    g.fillStyle(C.neonPink, 1);
    g.fillCircle(3, 8, 4); g.fillCircle(71, 8, 4);
    g.fillStyle(C.white, 0.7);
    g.fillCircle(3, 7, 1.5); g.fillCircle(71, 7, 1.5);
    g.generateTexture("low_gate", 74, 16);
    g.clear();

    g.fillStyle(C.tunnelDark, 0.85);
    g.fillRoundedRect(0, 0, 28, 80, 3);
    g.lineStyle(2, C.neonPurple, 0.85);
    g.strokeRoundedRect(1, 1, 26, 78, 3);
    g.lineStyle(4, C.neonPurpleDim, 0.15);
    g.strokeRoundedRect(0, 0, 28, 80, 4);
    for (let i = 0; i < 7; i++) {
      g.fillStyle(C.neonPurple, 0.06 + (i % 2) * 0.06);
      g.fillRect(3, 3 + i * 11, 22, 9);
    }
    g.lineStyle(1, C.neonPurple, 0.5);
    g.lineBetween(14, 2, 14, 78);
    g.fillStyle(C.neonPurple, 0.8);
    g.fillCircle(14, 6, 3); g.fillCircle(14, 74, 3);
    g.generateTexture("lane_blocker", 28, 80);
    g.clear();
  }

  private genCoin(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const s = 13;

    g.fillStyle(C.coinAmber, 0.1);
    g.fillCircle(s, s, s + 3);

    fillHex(g, s, s, s, C.coinGold, 1);
    fillHex(g, s, s, s - 2, C.coinGoldLight, 0.35);
    strokeHex(g, s, s, s, C.coinGoldLight, 0.9, 2);
    strokeHex(g, s, s, s + 2, C.coinAmber, 0.15, 3);

    fillHex(g, s, s, 5, C.coinAmber, 0.5);
    strokeHex(g, s, s, 5, C.coinGold, 0.6, 1);

    g.generateTexture("coin", s * 2 + 6, s * 2 + 6);
    g.clear();
  }

  private genPowerups(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const s = 16;
    g.fillStyle(C.magnetBlue, 0.08);
    g.fillCircle(s, s, s + 2);
    g.fillStyle(C.tunnelDark, 0.92);
    g.fillRoundedRect(0, 0, s * 2, s * 2, 10);
    g.lineStyle(2, C.magnetBlue, 0.9);
    g.strokeRoundedRect(0, 0, s * 2, s * 2, 10);
    g.lineStyle(3.5, C.magnetBlue, 0.8);
    g.beginPath(); g.arc(s, s - 2, 7, PI, 0, false); g.strokePath();
    g.fillStyle(C.magnetBlue, 1);
    g.fillRect(s - 7, s - 2, 4, 13);
    g.fillRect(s + 3, s - 2, 4, 13);
    g.fillStyle(C.laserRedGlow, 0.9);
    g.fillRect(s - 7, s + 7, 4, 4);
    g.fillStyle(C.neonCyan, 0.9);
    g.fillRect(s + 3, s + 7, 4, 4);
    g.generateTexture("magnet", s * 2, s * 2);
    g.clear();

    g.fillStyle(C.shieldGreen, 0.08);
    g.fillCircle(s, s, s + 2);
    g.fillStyle(C.tunnelDark, 0.92);
    g.fillRoundedRect(0, 0, s * 2, s * 2, 10);
    g.lineStyle(2, C.shieldGreen, 0.9);
    g.strokeRoundedRect(0, 0, s * 2, s * 2, 10);
    g.lineStyle(2.5, C.shieldGreen, 0.85);
    g.beginPath();
    g.moveTo(s, 4); g.lineTo(s + 9, 9); g.lineTo(s + 9, 18); g.lineTo(s, 26);
    g.lineTo(s - 9, 18); g.lineTo(s - 9, 9); g.closePath(); g.strokePath();
    g.fillStyle(C.shieldGreen, 0.2);
    g.beginPath();
    g.moveTo(s, 4); g.lineTo(s + 9, 9); g.lineTo(s + 9, 18); g.lineTo(s, 26);
    g.lineTo(s - 9, 18); g.lineTo(s - 9, 9); g.closePath(); g.fillPath();
    g.generateTexture("shield_pu", s * 2, s * 2);
    g.clear();

    g.fillStyle(C.boostOrange, 0.08);
    g.fillCircle(s, s, s + 2);
    g.fillStyle(C.tunnelDark, 0.92);
    g.fillRoundedRect(0, 0, s * 2, s * 2, 10);
    g.lineStyle(2, C.boostOrange, 0.9);
    g.strokeRoundedRect(0, 0, s * 2, s * 2, 10);
    g.fillStyle(C.boostOrange, 1);
    g.fillTriangle(s - 5, s + 8, s + 1, s - 10, s + 3, s + 2);
    g.fillStyle(C.coinGoldLight, 1);
    g.fillTriangle(s - 3, s + 2, s + 5, s + 2, s + 1, s + 10);
    g.generateTexture("boost_pu", s * 2, s * 2);
    g.clear();
  }

  private genGround(g: Phaser.GameObjects.Graphics) {
    const tW = LANE_WIDTH * 3 + 20;
    g.clear();

    g.fillGradientStyle(C.tunnelMid, C.tunnelMid, C.tunnelDark, C.tunnelDark, 0.6);
    g.fillRect(0, 0, tW, 24);

    for (let i = 0; i < tW; i += 6) {
      g.fillStyle(C.neonCyan, 0.02 + (i % 12 === 0 ? 0.02 : 0));
      g.fillRect(i, 0, 3, 24);
    }

    g.lineStyle(2.5, C.hexRingAmber, 0.6);
    g.lineBetween(0, 0, tW, 0);
    g.lineStyle(6, C.hexRingAmber, 0.08);
    g.lineBetween(0, 0, tW, 0);

    g.lineStyle(1, C.neonCyanDim, 0.15);
    g.lineBetween(0, 23, tW, 23);

    for (let i = 1; i < 3; i++) {
      const lx = i * LANE_WIDTH + 10;
      g.lineStyle(1, C.hexRingAmber, 0.15);
      g.lineBetween(lx, 0, lx, 24);
    }

    g.generateTexture("ground_tile", tW, 24);
    g.clear();
  }

  private genParticles(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(C.hexRingAmberBright, 0.9);
    g.fillCircle(5, 5, 5);
    g.fillStyle(C.white, 0.5);
    g.fillCircle(4, 4, 2);
    g.generateTexture("particle_amber", 10, 10);
    g.clear();

    g.fillStyle(C.neonCyan, 0.8);
    g.fillCircle(4, 4, 4);
    g.fillStyle(C.white, 0.4);
    g.fillCircle(3, 3, 1.5);
    g.generateTexture("particle_cyan", 8, 8);
    g.clear();

    g.fillStyle(C.white, 0.6);
    g.fillRect(0, 0, 2, 12);
    g.fillStyle(C.neonCyan, 0.3);
    g.fillRect(0, 0, 2, 12);
    g.generateTexture("speed_line", 2, 12);
    g.clear();
  }
}

class MenuScene extends Phaser.Scene {
  constructor() { super({ key: "Menu" }); }

  create() {
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "bg_tunnel").setOrigin(0, 0);
    this.add.image(CX, GAME_HEIGHT / 2, "bg_particles").setOrigin(0.5).setAlpha(0.6);
    this.add.rectangle(CX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.25);

    const glowTitle = this.add.text(CX, 88, "HONEY", {
      fontSize: "52px", fontFamily: "monospace", color: "#f5a000",
      fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0.12);
    this.tweens.add({ targets: glowTitle, alpha: 0.2, duration: 2000, yoyo: true, repeat: -1 });

    this.add.text(CX, 88, "HONEY", {
      fontSize: "48px", fontFamily: "monospace", color: "#ffb300",
      fontStyle: "bold", stroke: "#7a4a00", strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(CX, 138, "RUNNER", {
      fontSize: "34px", fontFamily: "monospace", color: "#ffd54f",
      fontStyle: "bold", stroke: "#7a4a00", strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(CX, 166, "CYBER HIVE", {
      fontSize: "11px", fontFamily: "monospace", color: "#00e5ff",
      letterSpacing: 6,
    }).setOrigin(0.5);

    const beeGlow = this.add.circle(CX, 245, 40, C.hexRingAmber, 0.05);
    this.tweens.add({ targets: beeGlow, scaleX: 1.4, scaleY: 1.4, alpha: 0, duration: 2000, repeat: -1 });

    const shadow = this.add.image(CX, 288, "bee_shadow").setScale(3.5).setAlpha(0.4);
    const beeBody = this.add.image(CX, 245, "runner").setScale(3.2);
    const wingL = this.add.image(CX - 18, 225, "wing_l").setScale(3).setAlpha(0.7);
    const wingR = this.add.image(CX + 18, 225, "wing_r").setScale(3).setAlpha(0.7);

    this.tweens.add({ targets: beeBody, y: 240, duration: 1500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: shadow, scaleX: 3.2, scaleY: 3.2, alpha: 0.3, duration: 1500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.tweens.add({ targets: wingL, scaleY: 2, scaleX: 3.2, alpha: 0.4, duration: 80, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: wingR, scaleY: 2, scaleX: 3.2, alpha: 0.4, duration: 80, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: [wingL, wingR], y: 220, duration: 1500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const bestScore = getBestScore();
    if (bestScore > 0) {
      this.add.text(CX, 320, `BEST: ${bestScore.toLocaleString()}`, {
        fontSize: "16px", fontFamily: "monospace", color: "#ffd54f",
        stroke: "#000", strokeThickness: 3,
      }).setOrigin(0.5);
    }

    const btnPulse = this.add.rectangle(CX, 380, 194, 54, C.hexRingAmber, 0.06);
    this.tweens.add({ targets: btnPulse, scaleX: 1.2, scaleY: 1.2, alpha: 0, duration: 1800, repeat: -1 });

    const playBtn = this.add.rectangle(CX, 380, 180, 50, C.beeGold, 1).setInteractive({ useHandCursor: true });
    playBtn.setStrokeStyle(2, C.hexRingAmberBright);
    this.add.text(CX, 380, "PLAY", {
      fontSize: "22px", fontFamily: "monospace", color: "#1a0a00", fontStyle: "bold",
    }).setOrigin(0.5);
    playBtn.on("pointerdown", () => this.scene.start("Game"));
    this.tweens.add({ targets: playBtn, scaleX: 1.04, scaleY: 1.04, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const controls = [
      "CONTROLS:",
      "",
      "Arrow Left / Right - Change lane",
      "Arrow Up / Swipe Up - Jump",
      "Arrow Down / Swipe Down - Slide",
      "",
      "Collect honey & dodge lasers!",
    ];
    this.add.text(CX, 498, controls.join("\n"), {
      fontSize: "10px", fontFamily: "monospace", color: "#4a6a8a",
      align: "center", lineSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(CX, GAME_HEIGHT - 28, "A Honeycomb Arena Game", {
      fontSize: "9px", fontFamily: "monospace", color: "#1a2a40",
    }).setOrigin(0.5);
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
  private bgParticles!: Phaser.GameObjects.TileSprite;
  private groundTiles: Phaser.GameObjects.TileSprite[] = [];

  private obstacleTimer?: Phaser.Time.TimerEvent;
  private coinTimer?: Phaser.Time.TimerEvent;
  private powerupTimer?: Phaser.Time.TimerEvent;

  private swipeStart: { x: number; y: number; time: number } | null = null;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;

  private shieldSprite?: Phaser.GameObjects.Arc;
  private speedLines: Phaser.GameObjects.Image[] = [];
  private frameCount = 0;

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
    this.bgParticles = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "bg_particles").setOrigin(0, 0).setScrollFactor(0).setAlpha(0.5);

    const laneArea = this.add.rectangle(CX, GROUND_Y - 50, LANE_WIDTH * 3 + 14, 220, C.tunnelDark, 0.35);

    for (let i = 0; i <= LANE_COUNT; i++) {
      const lx = CX + LANE_POSITIONS[0] - LANE_WIDTH / 2 + i * LANE_WIDTH;
      const isEdge = (i === 0 || i === LANE_COUNT);
      this.add.line(0, 0, lx, GROUND_Y - 160, lx, GROUND_Y + 24, C.hexRingAmber, isEdge ? 0.2 : 0.07).setOrigin(0, 0);
      if (isEdge) {
        this.add.line(0, 0, lx, GROUND_Y - 160, lx, GROUND_Y + 24, C.hexRingAmber, 0.04).setOrigin(0, 0).setLineWidth(3);
      }
    }

    const gt = this.add.tileSprite(CX, GROUND_Y, LANE_WIDTH * 3 + 20, 24, "ground_tile");
    this.groundTiles.push(gt);

    this.obstacles = this.physics.add.group({ allowGravity: false });
    this.coins = this.physics.add.group({ allowGravity: false });
    this.powerups = this.physics.add.group({ allowGravity: false });

    this.beeShadow = this.add.image(CX, GROUND_Y - 6, "bee_shadow").setScale(1.8).setAlpha(0.35).setDepth(4);

    this.runner = this.physics.add.sprite(CX, RUNNER_Y, "runner");
    this.runner.setCollideWorldBounds(false);
    this.runner.setGravityY(GRAVITY);
    this.runner.setSize(36, 46);
    this.runner.setDepth(10);

    this.wingL = this.add.image(CX - 16, RUNNER_Y - 12, "wing_l").setScale(1.2).setAlpha(0.65).setDepth(9);
    this.wingR = this.add.image(CX + 16, RUNNER_Y - 12, "wing_r").setScale(1.2).setAlpha(0.65).setDepth(11);

    this.tweens.add({ targets: this.wingL, scaleY: 0.5, alpha: 0.3, duration: 50, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: this.wingR, scaleY: 0.5, alpha: 0.3, duration: 50, yoyo: true, repeat: -1 });

    this.particles = this.add.particles(0, 0, "particle_amber", {
      speed: { min: 30, max: 80 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 500,
      frequency: 50,
      follow: this.runner,
      followOffset: { x: 0, y: 24 },
      blendMode: "ADD",
      tint: [C.hexRingAmberBright, C.neonCyan],
    }).setDepth(8);

    this.shieldSprite = this.add.circle(CX, RUNNER_Y, 34, C.shieldGreen, 0.12);
    this.shieldSprite.setStrokeStyle(2, C.shieldGreen, 0.6);
    this.shieldSprite.setVisible(false);
    this.shieldSprite.setDepth(12);

    this.physics.add.overlap(this.runner, this.coins, this.collectCoin, undefined, this);
    this.physics.add.overlap(this.runner, this.powerups, this.collectPowerup, undefined, this);
    this.physics.add.overlap(this.runner, this.obstacles, this.hitObstacle, undefined, this);

    const floorZone = this.add.zone(CX, GROUND_Y, GAME_WIDTH, 10);
    this.physics.add.existing(floorZone, true);
    this.physics.add.collider(this.runner, floorZone);

    this.add.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 58, 0x000000, 0.5).setOrigin(0.5, 0).setScrollFactor(0).setDepth(99);

    this.scoreText = this.add.text(16, 10, "0", {
      fontSize: "22px", fontFamily: "monospace", color: "#ffb300", fontStyle: "bold",
      stroke: "#000", strokeThickness: 4,
    }).setScrollFactor(0).setDepth(100);

    this.add.image(14, 40, "coin").setScale(0.4).setScrollFactor(0).setDepth(100);
    this.coinText = this.add.text(26, 34, "0", {
      fontSize: "13px", fontFamily: "monospace", color: "#ffd54f",
      stroke: "#000", strokeThickness: 3,
    }).setScrollFactor(0).setDepth(100);

    this.speedText = this.add.text(GAME_WIDTH - 16, 12, `${this.speed.toFixed(1)}x`, {
      fontSize: "11px", fontFamily: "monospace", color: "#00e5ff",
      stroke: "#000", strokeThickness: 3,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    this.setupInput();
    this.startSpawners();
    this.createMobileButtons();
  }

  private setupInput() {
    this.input.keyboard?.on("keydown-LEFT", () => this.moveLane(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.moveLane(1));
    this.input.keyboard?.on("keydown-UP", () => this.jump());
    this.input.keyboard?.on("keydown-DOWN", () => this.slide());
    this.input.keyboard?.on("keydown-A", () => this.moveLane(-1));
    this.input.keyboard?.on("keydown-D", () => this.moveLane(1));
    this.input.keyboard?.on("keydown-W", () => this.jump());
    this.input.keyboard?.on("keydown-S", () => this.slide());

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.swipeStart = { x: pointer.x, y: pointer.y, time: Date.now() };
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (!this.swipeStart) return;
      const dx = pointer.x - this.swipeStart.x;
      const dy = pointer.y - this.swipeStart.y;
      const dt = Date.now() - this.swipeStart.time;
      this.swipeStart = null;
      if (dt > 500) return;
      const minSwipe = 40;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > minSwipe) {
        this.moveLane(dx > 0 ? 1 : -1);
      } else if (Math.abs(dy) > minSwipe) {
        if (dy < 0) this.jump(); else this.slide();
      }
    });
  }

  private createMobileButtons() {
    const btnY = GAME_HEIGHT - 48;
    const btnSize = 44;

    const makeBtn = (x: number, label: string, action: () => void) => {
      const bg = this.add.rectangle(x, btnY, btnSize, btnSize, 0x000000, 0.2)
        .setInteractive().setScrollFactor(0).setDepth(99);
      bg.setStrokeStyle(1, C.hexRingAmber, 0.2);
      this.add.text(x, btnY, label, { fontSize: "20px", fontFamily: "monospace", color: "#f5a000" })
        .setOrigin(0.5).setScrollFactor(0).setDepth(100);
      bg.on("pointerdown", action);
    };

    makeBtn(50, "<", () => this.moveLane(-1));
    makeBtn(GAME_WIDTH - 50, ">", () => this.moveLane(1));
    makeBtn(CX - 40, "^", () => this.jump());
    makeBtn(CX + 40, "v", () => this.slide());
  }

  private moveLane(dir: number) {
    if (!this.isAlive) return;
    const newLane = Phaser.Math.Clamp(this.laneIndex + dir, 0, LANE_COUNT - 1);
    if (newLane === this.laneIndex) return;
    this.laneIndex = newLane;
    const targetX = CX + LANE_POSITIONS[this.laneIndex];
    this.tweens.add({ targets: this.runner, x: targetX, duration: 120, ease: "Power2" });
  }

  private jump() {
    if (!this.isAlive) return;
    const body = this.runner.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down || body.touching.down) {
      if (this.isSliding) this.endSlide();
      body.setVelocityY(JUMP_VELOCITY);
    }
  }

  private slide() {
    if (!this.isAlive || this.isSliding) return;
    const body = this.runner.body as Phaser.Physics.Arcade.Body;
    if (!body.blocked.down && !body.touching.down) return;
    this.isSliding = true;
    this.runner.setTexture("runner_slide");
    body.setSize(42, 22);
    body.setOffset(4, 4);
    this.slideTimer = this.time.delayedCall(SLIDE_DURATION, () => this.endSlide());
  }

  private endSlide() {
    if (!this.isSliding) return;
    this.isSliding = false;
    this.runner.setTexture("runner");
    const body = this.runner.body as Phaser.Physics.Arcade.Body;
    body.setSize(36, 46);
    body.setOffset(4, 3);
    if (this.slideTimer) this.slideTimer.destroy();
  }

  private startSpawners() {
    this.scheduleNextObstacle();
    this.coinTimer = this.time.addEvent({ delay: COIN_SPAWN_INTERVAL, callback: this.spawnCoinPattern, callbackScope: this, loop: true });
    this.powerupTimer = this.time.addEvent({ delay: POWERUP_SPAWN_INTERVAL, callback: this.spawnPowerup, callbackScope: this, loop: true });
  }

  private scheduleNextObstacle() {
    const speedFactor = 1 - (this.speed - INITIAL_SPEED) / (MAX_SPEED - INITIAL_SPEED) * 0.6;
    const delay = Phaser.Math.Between(OBSTACLE_SPAWN_INTERVAL_MIN * speedFactor, OBSTACLE_SPAWN_INTERVAL_MAX * speedFactor);
    this.obstacleTimer = this.time.delayedCall(delay, () => {
      this.spawnObstacle();
      if (this.isAlive) this.scheduleNextObstacle();
    });
  }

  private spawnObstacle() {
    if (!this.isAlive) return;
    const types = ["barrier", "low_gate", "lane_blocker"];
    const weights = [0.4, 0.3, 0.3];
    const r = Math.random();
    let cum = 0, type = types[0];
    for (let i = 0; i < weights.length; i++) { cum += weights[i]; if (r < cum) { type = types[i]; break; } }

    const lane = Phaser.Math.Between(0, LANE_COUNT - 1);
    const x = CX + LANE_POSITIONS[lane];
    const obs = this.obstacles.create(x, -60, type) as Phaser.Physics.Arcade.Sprite;
    obs.setImmovable(true);
    (obs.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    obs.setData("type", type);
    obs.setDepth(6);

    if (type === "barrier") obs.setY(-50);
    else if (type === "low_gate") obs.setY(-20);
    else obs.setY(-80);

    if (this.speed > 6 && Math.random() < 0.3) {
      const lane2 = (lane + (Math.random() < 0.5 ? 1 : -1) + LANE_COUNT) % LANE_COUNT;
      if (lane2 !== lane) {
        const obs2 = this.obstacles.create(CX + LANE_POSITIONS[lane2], obs.y, type) as Phaser.Physics.Arcade.Sprite;
        obs2.setImmovable(true);
        (obs2.body as Phaser.Physics.Arcade.Body).allowGravity = false;
        obs2.setData("type", type);
        obs2.setDepth(6);
      }
    }
  }

  private spawnCoinPattern() {
    if (!this.isAlive) return;
    const lane = Phaser.Math.Between(0, LANE_COUNT - 1);
    const x = CX + LANE_POSITIONS[lane];
    const count = Phaser.Math.Between(3, 6);
    for (let i = 0; i < count; i++) {
      const coin = this.coins.create(x, -40 - i * 40, "coin") as Phaser.Physics.Arcade.Sprite;
      coin.setImmovable(true);
      (coin.body as Phaser.Physics.Arcade.Body).allowGravity = false;
      coin.setDepth(7);
      this.tweens.add({ targets: coin, angle: 360, duration: 2000, repeat: -1, ease: "Linear" });
    }
  }

  private spawnPowerup() {
    if (!this.isAlive) return;
    const lane = Phaser.Math.Between(0, LANE_COUNT - 1);
    const x = CX + LANE_POSITIONS[lane];
    const types = ["magnet", "shield_pu", "boost_pu"];
    const type = types[Phaser.Math.Between(0, types.length - 1)];
    const pu = this.powerups.create(x, -50, type) as Phaser.Physics.Arcade.Sprite;
    pu.setImmovable(true);
    (pu.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    pu.setData("puType", type);
    pu.setDepth(7);
    this.tweens.add({ targets: pu, y: pu.y - 6, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  private collectCoin(_r: any, co: any) {
    const coin = co as Phaser.Physics.Arcade.Sprite;
    coin.destroy();
    this.coinCount++;
    this.score += COIN_SCORE;
    this.tweens.add({ targets: this.coinText, scaleX: 1.3, scaleY: 1.3, duration: 100, yoyo: true });
  }

  private collectPowerup(_r: any, po: any) {
    const pu = po as Phaser.Physics.Arcade.Sprite;
    const type = pu.getData("puType") as string;
    pu.destroy();
    if (type === "magnet") this.activateMagnet();
    else if (type === "shield_pu") this.activateShield();
    else if (type === "boost_pu") this.activateBoost();
    this.showPowerupFlash(type);
  }

  private activateMagnet() {
    this.powerupState.magnet = true;
    if (this.powerupState.magnetTimer) this.powerupState.magnetTimer.destroy();
    this.powerupState.magnetTimer = this.time.delayedCall(MAGNET_DURATION, () => { this.powerupState.magnet = false; });
    this.updatePowerupIcons();
  }
  private activateShield() {
    this.powerupState.shield = true;
    this.shieldSprite?.setVisible(true);
    if (this.powerupState.shieldTimer) this.powerupState.shieldTimer.destroy();
    this.powerupState.shieldTimer = this.time.delayedCall(SHIELD_DURATION, () => { this.powerupState.shield = false; this.shieldSprite?.setVisible(false); });
    this.updatePowerupIcons();
  }
  private activateBoost() {
    this.powerupState.boost = true;
    if (this.powerupState.boostTimer) this.powerupState.boostTimer.destroy();
    this.powerupState.boostTimer = this.time.delayedCall(BOOST_DURATION, () => { this.powerupState.boost = false; });
    this.updatePowerupIcons();
  }

  private showPowerupFlash(type: string) {
    const color = type === "magnet" ? "#448aff" : type === "shield_pu" ? "#00e676" : "#ff6d00";
    const label = type === "magnet" ? "MAGNET!" : type === "shield_pu" ? "SHIELD!" : "BOOST!";
    const txt = this.add.text(CX, RUNNER_Y - 60, label, {
      fontSize: "18px", fontFamily: "monospace", color, fontStyle: "bold",
      stroke: "#000", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(101);
    this.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 800, onComplete: () => txt.destroy() });
  }

  private updatePowerupIcons() {
    this.powerupIcons.forEach(c => c.destroy());
    this.powerupIcons = [];
    let ix = GAME_WIDTH - 20;
    const iy = 42;
    const addIcon = (key: string) => {
      const icon = this.add.container(ix, iy, [this.add.image(0, 0, key)]).setScrollFactor(0).setDepth(100);
      this.powerupIcons.push(icon);
      ix -= 36;
    };
    if (this.powerupState.magnet) addIcon("magnet");
    if (this.powerupState.shield) addIcon("shield_pu");
    if (this.powerupState.boost) addIcon("boost_pu");
  }

  private hitObstacle(_r: any, oo: any) {
    if (!this.isAlive) return;
    const obs = oo as Phaser.Physics.Arcade.Sprite;
    const type = obs.getData("type") as string;
    if (type === "low_gate" && this.isSliding) return;
    const body = this.runner.body as Phaser.Physics.Arcade.Body;
    if (type === "barrier" && !body.blocked.down && !body.touching.down && body.velocity.y < 0) return;
    if (this.powerupState.shield) {
      this.powerupState.shield = false;
      this.shieldSprite?.setVisible(false);
      if (this.powerupState.shieldTimer) this.powerupState.shieldTimer.destroy();
      obs.destroy();
      this.updatePowerupIcons();
      this.cameras.main.shake(100, 0.01);
      return;
    }
    this.die();
  }

  private die() {
    this.isAlive = false;
    this.runner.setTint(0xff0000);
    this.particles.stop();
    this.cameras.main.shake(300, 0.02);
    this.cameras.main.flash(200, 255, 0, 0, false, undefined, this);
    if (this.obstacleTimer) this.obstacleTimer.destroy();
    if (this.coinTimer) this.coinTimer.destroy();
    if (this.powerupTimer) this.powerupTimer.destroy();
    const isNewBest = setBestScore(this.score);
    addCoins(this.coinCount);
    incrementRuns();
    this.time.delayedCall(800, () => {
      this.scene.start("GameOver", { score: this.score, coins: this.coinCount, distance: Math.floor(this.distance), bestScore: getBestScore(), isNewBest, speed: this.speed });
    });
  }

  update(_time: number, delta: number) {
    if (!this.isAlive) return;
    this.frameCount++;

    const effectiveSpeed = this.powerupState.boost ? this.speed * BOOST_SPEED_MULT : this.speed;
    this.speed = Math.min(this.speed + SPEED_RAMP * (delta / 16), MAX_SPEED);
    this.distance += effectiveSpeed * (delta / 16);
    this.score = Math.floor(this.distance) + this.coinCount * COIN_SCORE;

    this.bgTunnel.tilePositionY -= effectiveSpeed * 0.4;
    this.bgParticles.tilePositionY -= effectiveSpeed * 0.2;

    const beeHover = Math.sin(this.frameCount * 0.08) * 3;
    const beeBaseY = this.runner.y;

    if (!this.isSliding) {
      this.wingL.setPosition(this.runner.x - 18, beeBaseY - 14 + beeHover * 0.3);
      this.wingR.setPosition(this.runner.x + 18, beeBaseY - 14 + beeHover * 0.3);
      this.wingL.setVisible(true);
      this.wingR.setVisible(true);
    } else {
      this.wingL.setPosition(this.runner.x - 10, beeBaseY - 6);
      this.wingR.setPosition(this.runner.x + 10, beeBaseY - 6);
      this.wingL.setScale(0.8, 0.4);
      this.wingR.setScale(0.8, 0.4);
    }

    const shadowDist = Math.max(0, GROUND_Y - beeBaseY);
    const shadowScale = Math.max(0.6, 1.8 - shadowDist * 0.008);
    const shadowAlpha = Math.max(0.1, 0.35 - shadowDist * 0.002);
    this.beeShadow.setPosition(this.runner.x, GROUND_Y - 4);
    this.beeShadow.setScale(shadowScale);
    this.beeShadow.setAlpha(shadowAlpha);

    if (this.shieldSprite) this.shieldSprite.setPosition(this.runner.x, beeBaseY);

    if (this.frameCount % 3 === 0 && effectiveSpeed > 6) {
      const sl = this.add.image(
        CX + (Math.random() - 0.5) * LANE_WIDTH * 3,
        -10,
        "speed_line"
      ).setAlpha(0.15 + (effectiveSpeed / MAX_SPEED) * 0.2).setDepth(2);
      this.speedLines.push(sl);
    }
    for (let i = this.speedLines.length - 1; i >= 0; i--) {
      this.speedLines[i].y += effectiveSpeed * (delta / 16) * 4;
      if (this.speedLines[i].y > GAME_HEIGHT + 20) {
        this.speedLines[i].destroy();
        this.speedLines.splice(i, 1);
      }
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
    this.add.rectangle(CX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55);

    this.add.text(CX, 55, "GAME OVER", {
      fontSize: "36px", fontFamily: "monospace", color: "#ff1744",
      fontStyle: "bold", stroke: "#400", strokeThickness: 5,
    }).setOrigin(0.5);

    if (data.isNewBest) {
      const nb = this.add.text(CX, 96, "NEW BEST!", {
        fontSize: "20px", fontFamily: "monospace", color: "#ffd54f",
        fontStyle: "bold", stroke: "#7a4a00", strokeThickness: 3,
      }).setOrigin(0.5);
      this.tweens.add({ targets: nb, scaleX: 1.1, scaleY: 1.1, duration: 500, yoyo: true, repeat: -1 });
    }

    const bee = this.add.image(CX, 140, "runner").setScale(2.2);
    this.tweens.add({ targets: bee, alpha: 0.4, duration: 1000, yoyo: true, repeat: -1 });

    const statsY = 185;
    const stats = [
      { label: "SCORE", value: data.score.toLocaleString(), color: "#ffb300" },
      { label: "HONEY", value: data.coins.toString(), color: "#ffd54f" },
      { label: "DISTANCE", value: `${data.distance.toLocaleString()}m`, color: "#00e5ff" },
      { label: "TOP SPEED", value: `${data.speed.toFixed(1)}x`, color: "#ff6d00" },
      { label: "BEST", value: data.bestScore.toLocaleString(), color: "#f5a000" },
    ];

    stats.forEach((s, i) => {
      const y = statsY + i * 50;
      this.add.rectangle(CX, y + 8, 280, 42, C.tunnelDark, 0.85).setStrokeStyle(1, C.hexRingAmber, 0.1);
      this.add.text(CX - 125, y - 2, s.label, { fontSize: "10px", fontFamily: "monospace", color: "#4a6a8a" });
      this.add.text(CX + 125, y + 12, s.value, { fontSize: "20px", fontFamily: "monospace", color: s.color, fontStyle: "bold" }).setOrigin(1, 0.5);
    });

    const glow = this.add.rectangle(CX, 460, 210, 54, C.hexRingAmber, 0.05);
    this.tweens.add({ targets: glow, scaleX: 1.2, scaleY: 1.2, alpha: 0, duration: 1600, repeat: -1 });

    const retryBtn = this.add.rectangle(CX, 460, 200, 50, C.beeGold, 1).setInteractive({ useHandCursor: true });
    retryBtn.setStrokeStyle(2, C.hexRingAmberBright);
    this.add.text(CX, 460, "PLAY AGAIN", { fontSize: "18px", fontFamily: "monospace", color: "#1a0a00", fontStyle: "bold" }).setOrigin(0.5);
    retryBtn.on("pointerdown", () => this.scene.start("Game"));
    this.tweens.add({ targets: retryBtn, scaleX: 1.04, scaleY: 1.04, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const menuBtn = this.add.rectangle(CX, 525, 200, 40, C.tunnelMid, 1).setInteractive({ useHandCursor: true });
    menuBtn.setStrokeStyle(1, C.hexRingAmber, 0.25);
    this.add.text(CX, 525, "MENU", { fontSize: "14px", fontFamily: "monospace", color: "#f5a000" }).setOrigin(0.5);
    menuBtn.on("pointerdown", () => this.scene.start("Menu"));

    this.input.keyboard?.once("keydown-SPACE", () => this.scene.start("Game"));
    this.input.keyboard?.once("keydown-ENTER", () => this.scene.start("Game"));
  }
}

export function createHoneyRunnerGame(parent: HTMLElement): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: "#08021a",
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
