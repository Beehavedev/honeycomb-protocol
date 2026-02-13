import Phaser from "phaser";
import {
  GAME_WIDTH, GAME_HEIGHT, LANE_POSITIONS, LANE_COUNT,
  RUNNER_Y, GROUND_Y, INITIAL_SPEED, MAX_SPEED, SPEED_RAMP,
  JUMP_VELOCITY, GRAVITY, SLIDE_DURATION,
  OBSTACLE_SPAWN_INTERVAL_MIN, OBSTACLE_SPAWN_INTERVAL_MAX,
  COIN_SPAWN_INTERVAL, POWERUP_SPAWN_INTERVAL,
  MAGNET_DURATION, SHIELD_DURATION, BOOST_DURATION, BOOST_SPEED_MULT,
  COIN_SCORE, COLORS, LANE_WIDTH,
} from "./constants";
import { getBestScore, setBestScore, addCoins, incrementRuns } from "./storage";

const CX = GAME_WIDTH / 2;

function hexPoints(cx: number, cy: number, r: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return pts;
}

function drawHexOutline(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, color: number, alpha: number, lineW = 1) {
  const pts = hexPoints(cx, cy, r);
  g.lineStyle(lineW, color, alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.strokePath();
}

class BootScene extends Phaser.Scene {
  constructor() { super({ key: "Boot" }); }

  create() {
    const g = this.make.graphics({ x: 0, y: 0 });

    this.drawBeeStanding(g);
    this.drawBeeSliding(g);
    this.drawObstacles(g);
    this.drawCoins(g);
    this.drawPowerups(g);
    this.drawBackgrounds(g);
    this.drawGroundAndParticles(g);
    this.drawHoneycombToken(g);

    g.destroy();
    this.scene.start("Menu");
  }

  private drawBeeStanding(g: Phaser.GameObjects.Graphics) {
    const w = 40, h = 56;
    g.clear();

    g.lineStyle(1, COLORS.wingGlow, 0.15);
    g.fillStyle(COLORS.beeWing, 0.12);
    g.fillEllipse(9, 10, 18, 24);
    g.strokeEllipse(9, 10, 18, 24);
    g.fillEllipse(w - 9, 10, 18, 24);
    g.strokeEllipse(w - 9, 10, 18, 24);

    g.lineStyle(1, COLORS.wingGlow, 0.3);
    g.fillStyle(COLORS.beeWing, 0.2);
    g.fillEllipse(11, 14, 14, 20);
    g.strokeEllipse(11, 14, 14, 20);
    g.fillEllipse(w - 11, 14, 14, 20);
    g.strokeEllipse(w - 11, 14, 14, 20);

    g.fillStyle(COLORS.beeBody, 1);
    g.fillEllipse(w / 2, 18, 22, 20);

    g.fillStyle(0x000000, 1);
    g.fillCircle(w / 2 - 5, 15, 3);
    g.fillCircle(w / 2 + 5, 15, 3);
    g.fillStyle(COLORS.neonBlue, 0.9);
    g.fillCircle(w / 2 - 5, 14, 1.5);
    g.fillCircle(w / 2 + 5, 14, 1.5);

    g.lineStyle(1, COLORS.runnerDark, 0.8);
    g.lineBetween(w / 2 - 4, 8, w / 2 - 6, 2);
    g.lineBetween(w / 2 + 4, 8, w / 2 + 6, 2);
    g.fillStyle(COLORS.neonBlue, 0.7);
    g.fillCircle(w / 2 - 6, 2, 2);
    g.fillCircle(w / 2 + 6, 2, 2);

    g.fillStyle(COLORS.beeBody, 1);
    g.fillEllipse(w / 2, 36, 24, 28);

    const stripeY = [29, 35, 41];
    for (const sy of stripeY) {
      g.fillStyle(COLORS.beeStripe, 0.85);
      g.fillRect(w / 2 - 11, sy, 22, 3);
    }

    g.fillStyle(COLORS.neonBlue, 0.15);
    g.fillEllipse(w / 2, 36, 26, 30);

    g.lineStyle(1.5, COLORS.runnerGlow, 0.5);
    g.strokeEllipse(w / 2, 36, 24, 28);

    g.lineStyle(1, COLORS.beeStripe, 0.6);
    g.lineBetween(w / 2 - 3, h - 8, w / 2 - 5, h - 1);
    g.lineBetween(w / 2 + 3, h - 8, w / 2 + 5, h - 1);
    g.fillStyle(COLORS.runnerDark, 1);
    g.fillCircle(w / 2 - 5, h - 1, 2);
    g.fillCircle(w / 2 + 5, h - 1, 2);

    g.fillStyle(COLORS.neonBlue, 0.06);
    g.fillCircle(w / 2, 30, 24);

    g.generateTexture("runner", w, h);
    g.clear();
  }

  private drawBeeSliding(g: Phaser.GameObjects.Graphics) {
    const w = 44, h = 28;
    g.clear();

    g.lineStyle(1, COLORS.wingGlow, 0.2);
    g.fillStyle(COLORS.beeWing, 0.15);
    g.fillEllipse(8, 4, 16, 12);
    g.fillEllipse(w - 8, 4, 16, 12);

    g.fillStyle(COLORS.beeBody, 1);
    g.fillEllipse(14, h / 2, 18, 16);

    g.fillStyle(0x000000, 1);
    g.fillCircle(10, h / 2 - 2, 2.5);
    g.fillCircle(18, h / 2 - 2, 2.5);
    g.fillStyle(COLORS.neonBlue, 0.8);
    g.fillCircle(10, h / 2 - 3, 1.2);
    g.fillCircle(18, h / 2 - 3, 1.2);

    g.fillStyle(COLORS.beeBody, 1);
    g.fillEllipse(w / 2 + 4, h / 2, 26, 18);

    const stripeX = [22, 28, 34];
    for (const sx of stripeX) {
      g.fillStyle(COLORS.beeStripe, 0.85);
      g.fillRect(sx, h / 2 - 7, 3, 14);
    }

    g.lineStyle(1.5, COLORS.runnerGlow, 0.4);
    g.strokeEllipse(w / 2 + 4, h / 2, 26, 18);

    g.fillStyle(COLORS.neonBlue, 0.05);
    g.fillCircle(w / 2, h / 2, 20);

    g.generateTexture("runner_slide", w, h);
    g.clear();
  }

  private drawObstacles(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(0x100818, 0.9);
    g.fillRoundedRect(0, 0, 70, 50, 4);
    g.lineStyle(2, COLORS.obstacleLaser, 0.9);
    g.strokeRoundedRect(1, 1, 68, 48, 4);
    g.lineStyle(1, COLORS.obstacleLaser, 0.3);
    g.strokeRoundedRect(4, 4, 62, 42, 3);
    for (let i = 0; i < 3; i++) {
      const ly = 12 + i * 14;
      g.lineStyle(1, COLORS.obstacleLaser, 0.6 - i * 0.15);
      g.lineBetween(6, ly, 64, ly);
    }
    g.fillStyle(COLORS.obstacleLaser, 0.08);
    g.fillRect(4, 4, 62, 42);
    g.fillStyle(COLORS.neonPink, 0.7);
    g.fillCircle(8, 8, 3);
    g.fillCircle(62, 8, 3);
    g.generateTexture("barrier", 70, 50);
    g.clear();

    g.fillStyle(0x100818, 0.85);
    g.fillRoundedRect(0, 0, 70, 20, 3);
    g.lineStyle(2, COLORS.neonPink, 0.8);
    g.lineBetween(4, 10, 66, 10);
    g.lineStyle(1, COLORS.neonPink, 0.4);
    g.lineBetween(4, 6, 66, 6);
    g.lineBetween(4, 14, 66, 14);
    g.fillStyle(COLORS.neonPink, 0.06);
    g.fillRect(0, 0, 70, 20);
    g.fillStyle(COLORS.neonPink, 0.8);
    g.fillCircle(4, 10, 3);
    g.fillCircle(66, 10, 3);
    g.generateTexture("low_gate", 70, 20);
    g.clear();

    g.fillStyle(0x100818, 0.9);
    g.fillRoundedRect(0, 0, 30, 80, 3);
    g.lineStyle(2, COLORS.neonPurple, 0.8);
    g.strokeRoundedRect(1, 1, 28, 78, 3);
    for (let i = 0; i < 6; i++) {
      g.fillStyle(COLORS.neonPurple, 0.12 + (i % 2) * 0.1);
      g.fillRect(4, 4 + i * 12, 22, 10);
    }
    g.lineStyle(1, COLORS.neonPurple, 0.5);
    g.lineBetween(15, 2, 15, 78);
    g.fillStyle(COLORS.neonPurple, 0.06);
    g.fillRect(2, 2, 26, 76);
    g.generateTexture("lane_blocker", 30, 80);
    g.clear();
  }

  private drawCoins(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const r = 11;
    g.fillStyle(COLORS.coin, 0.15);
    g.fillCircle(r, r, r + 2);
    g.fillStyle(COLORS.coin, 1);
    g.fillCircle(r, r, r);
    g.fillStyle(COLORS.coinGlow, 0.5);
    g.fillCircle(r, r, r - 3);
    g.lineStyle(2, COLORS.coinGlow, 0.9);
    g.strokeCircle(r, r, r);

    const hexR2 = 5;
    const pts = hexPoints(r, r, hexR2);
    g.lineStyle(1.5, COLORS.runnerDark, 0.7);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.strokePath();

    g.generateTexture("coin", r * 2 + 4, r * 2 + 4);
    g.clear();
  }

  private drawPowerups(g: Phaser.GameObjects.Graphics) {
    g.clear();
    g.fillStyle(COLORS.magnet, 0.12);
    g.fillCircle(14, 14, 16);
    g.fillStyle(0x0a1530, 0.9);
    g.fillRoundedRect(0, 0, 28, 28, 8);
    g.lineStyle(2, COLORS.magnet, 0.9);
    g.strokeRoundedRect(0, 0, 28, 28, 8);
    g.lineStyle(3, COLORS.magnet, 0.8);
    g.beginPath();
    g.arc(14, 10, 7, Math.PI, 0, false);
    g.strokePath();
    g.fillStyle(COLORS.magnet, 1);
    g.fillRect(7, 10, 3, 12);
    g.fillRect(18, 10, 3, 12);
    g.fillStyle(COLORS.obstacleGlow, 0.9);
    g.fillRect(7, 18, 3, 4);
    g.fillStyle(COLORS.neonBlue, 0.9);
    g.fillRect(18, 18, 3, 4);
    g.generateTexture("magnet", 28, 28);
    g.clear();

    g.fillStyle(COLORS.shield, 0.12);
    g.fillCircle(14, 14, 16);
    g.fillStyle(0x0a1a10, 0.9);
    g.fillRoundedRect(0, 0, 28, 28, 8);
    g.lineStyle(2, COLORS.shield, 0.9);
    g.strokeRoundedRect(0, 0, 28, 28, 8);
    g.lineStyle(2.5, COLORS.shield, 0.8);
    g.beginPath();
    g.moveTo(14, 5);
    g.lineTo(23, 10);
    g.lineTo(23, 17);
    g.lineTo(14, 24);
    g.lineTo(5, 17);
    g.lineTo(5, 10);
    g.closePath();
    g.strokePath();
    g.fillStyle(COLORS.shield, 0.25);
    g.beginPath();
    g.moveTo(14, 5);
    g.lineTo(23, 10);
    g.lineTo(23, 17);
    g.lineTo(14, 24);
    g.lineTo(5, 17);
    g.lineTo(5, 10);
    g.closePath();
    g.fillPath();
    g.generateTexture("shield_pu", 28, 28);
    g.clear();

    g.fillStyle(COLORS.boost, 0.12);
    g.fillCircle(14, 14, 16);
    g.fillStyle(0x1a0d05, 0.9);
    g.fillRoundedRect(0, 0, 28, 28, 8);
    g.lineStyle(2, COLORS.boost, 0.9);
    g.strokeRoundedRect(0, 0, 28, 28, 8);
    g.fillStyle(COLORS.boost, 1);
    g.fillTriangle(10, 22, 14, 4, 16, 14);
    g.fillStyle(COLORS.coinGlow, 1);
    g.fillTriangle(12, 14, 18, 14, 14, 24);
    g.generateTexture("boost_pu", 28, 28);
    g.clear();
  }

  private drawBackgrounds(g: Phaser.GameObjects.Graphics) {
    const bgW = GAME_WIDTH;
    const bgH = GAME_HEIGHT;
    g.clear();

    g.fillGradientStyle(0x030810, 0x030810, 0x0a0520, 0x0a0520, 1);
    g.fillRect(0, 0, bgW, bgH);

    const hexR = 32;
    const hexH = hexR * Math.sqrt(3);
    for (let row = -1; row < bgH / hexH + 1; row++) {
      for (let col = -1; col < bgW / (hexR * 1.5) + 1; col++) {
        const cx = col * hexR * 1.5;
        const cy = row * hexH + (col % 2 ? hexH / 2 : 0);
        const distToCenter = Math.abs(cx - bgW / 2) / (bgW / 2);
        const alpha = 0.06 + (1 - distToCenter) * 0.08;
        drawHexOutline(g, cx, cy, hexR - 2, COLORS.hexLine, alpha);

        if (Math.random() < 0.08) {
          g.fillStyle(COLORS.neonBlue, 0.03);
          const pts = hexPoints(cx, cy, hexR - 3);
          g.beginPath();
          g.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
          g.closePath();
          g.fillPath();
        }
      }
    }

    const vanishY = bgH * 0.3;
    for (let i = 0; i < 12; i++) {
      const x = (bgW / 12) * i;
      g.lineStyle(1, COLORS.gridLine, 0.08 + Math.abs(i - 6) * 0.01);
      g.lineBetween(x, 0, x, bgH);
    }
    for (let i = 0; i < 20; i++) {
      const y = vanishY + (bgH - vanishY) * (i / 20);
      const spread = ((y - vanishY) / (bgH - vanishY));
      g.lineStyle(1, COLORS.neonBlue, 0.03 + spread * 0.04);
      g.lineBetween(bgW * 0.5 - spread * bgW * 0.5, y, bgW * 0.5 + spread * bgW * 0.5, y);
    }

    g.generateTexture("bg_hex", bgW, bgH);
    g.clear();

    g.fillStyle(0x000000, 0);
    g.fillRect(0, 0, bgW, bgH);
    for (let i = 0; i < 80; i++) {
      const sx = Math.random() * bgW;
      const sy = Math.random() * bgH;
      const sr = 0.5 + Math.random() * 1.5;
      const colors = [COLORS.neonBlue, COLORS.neonPink, COLORS.neonPurple, COLORS.white];
      const c = colors[Math.floor(Math.random() * colors.length)];
      g.fillStyle(c, 0.15 + Math.random() * 0.4);
      g.fillCircle(sx, sy, sr);
    }
    for (let i = 0; i < 6; i++) {
      const sx = Math.random() * bgW;
      const sy = Math.random() * bgH;
      g.fillStyle(COLORS.neonBlue, 0.02);
      g.fillCircle(sx, sy, 20 + Math.random() * 30);
    }
    g.generateTexture("bg_stars", bgW, bgH);
    g.clear();
  }

  private drawGroundAndParticles(g: Phaser.GameObjects.Graphics) {
    const tileW = LANE_WIDTH * 3 + 20;
    g.clear();

    g.fillGradientStyle(0x06101e, 0x06101e, 0x030810, 0x030810, 1);
    g.fillRect(0, 0, tileW, 20);

    for (let i = 0; i < tileW; i += 8) {
      g.fillStyle(COLORS.neonBlue, 0.04 + (i % 16 === 0 ? 0.03 : 0));
      g.fillRect(i, 0, 4, 20);
    }

    g.lineStyle(2, COLORS.neonBlue, 0.5);
    g.lineBetween(0, 0, tileW, 0);
    g.lineStyle(1, COLORS.neonBlue, 0.15);
    g.lineBetween(0, 19, tileW, 19);

    for (let i = 1; i < 3; i++) {
      g.lineStyle(1, COLORS.neonBlue, 0.12);
      g.lineBetween(i * LANE_WIDTH + 10, 0, i * LANE_WIDTH + 10, 20);
    }

    g.generateTexture("ground_tile", tileW, 20);
    g.clear();

    g.fillStyle(COLORS.neonBlue, 0.8);
    g.fillCircle(5, 5, 5);
    g.fillStyle(COLORS.white, 0.4);
    g.fillCircle(5, 4, 2);
    g.generateTexture("particle", 10, 10);
    g.clear();

    g.fillStyle(COLORS.runnerGlow, 0.8);
    g.fillCircle(4, 4, 4);
    g.fillStyle(COLORS.white, 0.5);
    g.fillCircle(4, 3, 1.5);
    g.generateTexture("particle_amber", 8, 8);
    g.clear();
  }

  private drawHoneycombToken(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const s = 18;
    g.fillStyle(COLORS.coin, 0.1);
    g.fillCircle(s, s, s + 2);
    g.lineStyle(2, COLORS.runnerGlow, 0.6);
    const pts = hexPoints(s, s, s - 2);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.strokePath();
    g.fillStyle(COLORS.coin, 0.3);
    g.fillPath();
    g.lineStyle(1, COLORS.runnerGlow, 0.4);
    const inner = hexPoints(s, s, s - 7);
    g.beginPath();
    g.moveTo(inner[0].x, inner[0].y);
    for (let i = 1; i < inner.length; i++) g.lineTo(inner[i].x, inner[i].y);
    g.closePath();
    g.strokePath();
    g.generateTexture("hc_token", s * 2 + 4, s * 2 + 4);
    g.clear();
  }
}

class MenuScene extends Phaser.Scene {
  private wingTween?: Phaser.Tweens.Tween;

  constructor() { super({ key: "Menu" }); }

  create() {
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "bg_hex").setOrigin(0, 0);
    this.add.rectangle(CX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.35);

    const titleGlow = this.add.text(CX, 95, "HONEY", {
      fontSize: "52px", fontFamily: "monospace", color: "#00e5ff",
      fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0.15);

    this.add.text(CX, 95, "HONEY", {
      fontSize: "48px", fontFamily: "monospace", color: "#ffb300",
      fontStyle: "bold", stroke: "#7a4a00", strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(CX, 148, "RUNNER", {
      fontSize: "34px", fontFamily: "monospace", color: "#ffd54f",
      fontStyle: "bold", stroke: "#7a4a00", strokeThickness: 2,
    }).setOrigin(0.5);

    this.add.text(CX, 178, "CYBER HIVE EDITION", {
      fontSize: "10px", fontFamily: "monospace", color: "#00e5ff",
      letterSpacing: 4,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: titleGlow, alpha: 0.25,
      duration: 1500, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });

    const beeSprite = this.add.image(CX, 250, "runner").setScale(3);
    this.tweens.add({
      targets: beeSprite, y: 245,
      duration: 1200, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });

    const glowCircle = this.add.circle(CX, 250, 45, COLORS.neonBlue, 0.06);
    this.tweens.add({
      targets: glowCircle, scaleX: 1.3, scaleY: 1.3, alpha: 0,
      duration: 2000, repeat: -1, ease: "Sine.easeOut",
    });

    const bestScore = getBestScore();
    if (bestScore > 0) {
      this.add.text(CX, 315, `BEST: ${bestScore.toLocaleString()}`, {
        fontSize: "16px", fontFamily: "monospace", color: "#ffd54f",
        stroke: "#000", strokeThickness: 2,
      }).setOrigin(0.5);
    }

    const btnGlow = this.add.rectangle(CX, 380, 190, 54, COLORS.neonBlue, 0.08);
    this.tweens.add({
      targets: btnGlow, scaleX: 1.15, scaleY: 1.15, alpha: 0,
      duration: 1500, repeat: -1,
    });

    const playBtn = this.add.rectangle(CX, 380, 180, 50, COLORS.beeBody, 1)
      .setInteractive({ useHandCursor: true });
    playBtn.setStrokeStyle(2, COLORS.runnerGlow);
    this.add.text(CX, 380, "PLAY", {
      fontSize: "22px", fontFamily: "monospace", color: "#000", fontStyle: "bold",
    }).setOrigin(0.5);

    playBtn.on("pointerdown", () => {
      this.scene.start("Game");
    });

    this.tweens.add({
      targets: playBtn, scaleX: 1.04, scaleY: 1.04,
      duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });

    const controls = [
      "CONTROLS:",
      "",
      "Arrow Left / Right - Change lane",
      "Arrow Up / Swipe Up - Jump",
      "Arrow Down / Swipe Down - Slide",
      "",
      "Collect honey & dodge obstacles!",
    ];
    this.add.text(CX, 500, controls.join("\n"), {
      fontSize: "11px", fontFamily: "monospace", color: "#4a6a8a",
      align: "center", lineSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(CX, GAME_HEIGHT - 30, "A Honeycomb Arena Game", {
      fontSize: "10px", fontFamily: "monospace", color: "#1a3050",
    }).setOrigin(0.5);

    for (let i = 0; i < 3; i++) {
      const hx = 30 + Math.random() * (GAME_WIDTH - 60);
      const hy = 420 + Math.random() * 50;
      drawHexOutline(
        this.add.graphics(),
        hx, hy, 12 + Math.random() * 8,
        COLORS.neonBlue, 0.08,
      );
    }
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

  private bgHex!: Phaser.GameObjects.TileSprite;
  private bgStars!: Phaser.GameObjects.TileSprite;
  private groundTiles: Phaser.GameObjects.TileSprite[] = [];

  private obstacleTimer?: Phaser.Time.TimerEvent;
  private coinTimer?: Phaser.Time.TimerEvent;
  private powerupTimer?: Phaser.Time.TimerEvent;

  private swipeStart: { x: number; y: number; time: number } | null = null;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;

  private shieldSprite?: Phaser.GameObjects.Arc;
  private laneGlowLines: Phaser.GameObjects.Line[] = [];
  private scanLine?: Phaser.GameObjects.Rectangle;

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
    this.laneGlowLines = [];

    this.bgHex = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "bg_hex").setOrigin(0, 0).setScrollFactor(0);
    this.bgStars = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "bg_stars").setOrigin(0, 0).setScrollFactor(0);

    const laneArea = this.add.rectangle(CX, GROUND_Y - 40, LANE_WIDTH * 3 + 10, 200, 0x030a18, 0.5);
    laneArea.setStrokeStyle(1, COLORS.neonBlue, 0.08);

    for (let i = 0; i <= LANE_COUNT; i++) {
      const lx = CX + LANE_POSITIONS[0] - LANE_WIDTH / 2 + i * LANE_WIDTH;
      const isEdge = (i === 0 || i === LANE_COUNT);
      const line = this.add.line(0, 0, lx, GROUND_Y - 140, lx, GROUND_Y + 20, COLORS.neonBlue, isEdge ? 0.25 : 0.08).setOrigin(0, 0);
      this.laneGlowLines.push(line);
    }

    const gt = this.add.tileSprite(CX, GROUND_Y, LANE_WIDTH * 3 + 20, 20, "ground_tile");
    this.groundTiles.push(gt);

    this.scanLine = this.add.rectangle(CX, GROUND_Y - 140, LANE_WIDTH * 3 + 10, 2, COLORS.neonBlue, 0.12);
    this.tweens.add({
      targets: this.scanLine,
      y: GROUND_Y + 20,
      duration: 3000,
      repeat: -1,
      ease: "Linear",
    });

    this.obstacles = this.physics.add.group({ allowGravity: false });
    this.coins = this.physics.add.group({ allowGravity: false });
    this.powerups = this.physics.add.group({ allowGravity: false });

    this.runner = this.physics.add.sprite(CX, RUNNER_Y, "runner");
    this.runner.setCollideWorldBounds(false);
    this.runner.setGravityY(GRAVITY);
    this.runner.setSize(34, 52);

    this.particles = this.add.particles(0, 0, "particle_amber", {
      speed: { min: 20, max: 70 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 500,
      frequency: 60,
      follow: this.runner,
      followOffset: { x: 0, y: 26 },
      blendMode: "ADD",
      tint: [COLORS.runnerGlow, COLORS.neonBlue],
    });

    this.shieldSprite = this.add.circle(CX, RUNNER_Y, 32, COLORS.shield, 0.15);
    this.shieldSprite.setStrokeStyle(2, COLORS.shield, 0.6);
    this.shieldSprite.setVisible(false);

    this.physics.add.overlap(this.runner, this.coins, this.collectCoin, undefined, this);
    this.physics.add.overlap(this.runner, this.powerups, this.collectPowerup, undefined, this);
    this.physics.add.overlap(this.runner, this.obstacles, this.hitObstacle, undefined, this);

    const floorZone = this.add.zone(CX, GROUND_Y, GAME_WIDTH, 10);
    this.physics.add.existing(floorZone, true);
    this.physics.add.collider(this.runner, floorZone);

    const hudBg = this.add.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 60, 0x000000, 0.4)
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(99);

    this.scoreText = this.add.text(16, 12, "0", {
      fontSize: "22px", fontFamily: "monospace", color: "#ffd54f", fontStyle: "bold",
      stroke: "#000", strokeThickness: 3,
    }).setScrollFactor(0).setDepth(100);

    this.add.image(12, 43, "coin").setScale(0.55).setScrollFactor(0).setDepth(100);
    this.coinText = this.add.text(24, 37, "0", {
      fontSize: "13px", fontFamily: "monospace", color: "#ffecb3",
      stroke: "#000", strokeThickness: 2,
    }).setScrollFactor(0).setDepth(100);

    this.speedText = this.add.text(GAME_WIDTH - 16, 14, `${this.speed.toFixed(1)}x`, {
      fontSize: "11px", fontFamily: "monospace", color: "#00e5ff",
      stroke: "#000", strokeThickness: 2,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    this.setupInput();
    this.startSpawners();
    this.createMobileButtons();
  }

  private setupInput() {
    const cursors = this.input.keyboard?.createCursorKeys();
    if (cursors) {
      this.input.keyboard?.on("keydown-LEFT", () => this.moveLane(-1));
      this.input.keyboard?.on("keydown-RIGHT", () => this.moveLane(1));
      this.input.keyboard?.on("keydown-UP", () => this.jump());
      this.input.keyboard?.on("keydown-DOWN", () => this.slide());
      this.input.keyboard?.on("keydown-A", () => this.moveLane(-1));
      this.input.keyboard?.on("keydown-D", () => this.moveLane(1));
      this.input.keyboard?.on("keydown-W", () => this.jump());
      this.input.keyboard?.on("keydown-S", () => this.slide());
    }

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
        if (dy < 0) this.jump();
        else this.slide();
      }
    });
  }

  private createMobileButtons() {
    const btnY = GAME_HEIGHT - 50;
    const btnSize = 44;
    const btnAlpha = 0.15;
    const btnBorder = COLORS.neonBlue;

    const leftBtn = this.add.rectangle(50, btnY, btnSize, btnSize, 0x000000, btnAlpha)
      .setInteractive().setScrollFactor(0).setDepth(99);
    leftBtn.setStrokeStyle(1, btnBorder, 0.3);
    this.add.text(50, btnY, "<", { fontSize: "20px", fontFamily: "monospace", color: "#00e5ff" })
      .setOrigin(0.5).setScrollFactor(0).setDepth(100);
    leftBtn.on("pointerdown", () => this.moveLane(-1));

    const rightBtn = this.add.rectangle(GAME_WIDTH - 50, btnY, btnSize, btnSize, 0x000000, btnAlpha)
      .setInteractive().setScrollFactor(0).setDepth(99);
    rightBtn.setStrokeStyle(1, btnBorder, 0.3);
    this.add.text(GAME_WIDTH - 50, btnY, ">", { fontSize: "20px", fontFamily: "monospace", color: "#00e5ff" })
      .setOrigin(0.5).setScrollFactor(0).setDepth(100);
    rightBtn.on("pointerdown", () => this.moveLane(1));

    const jumpBtn = this.add.rectangle(CX - 40, btnY, btnSize, btnSize, 0x000000, btnAlpha)
      .setInteractive().setScrollFactor(0).setDepth(99);
    jumpBtn.setStrokeStyle(1, btnBorder, 0.3);
    this.add.text(CX - 40, btnY, "^", { fontSize: "20px", fontFamily: "monospace", color: "#00e5ff" })
      .setOrigin(0.5).setScrollFactor(0).setDepth(100);
    jumpBtn.on("pointerdown", () => this.jump());

    const slideBtn = this.add.rectangle(CX + 40, btnY, btnSize, btnSize, 0x000000, btnAlpha)
      .setInteractive().setScrollFactor(0).setDepth(99);
    slideBtn.setStrokeStyle(1, btnBorder, 0.3);
    this.add.text(CX + 40, btnY, "v", { fontSize: "20px", fontFamily: "monospace", color: "#00e5ff" })
      .setOrigin(0.5).setScrollFactor(0).setDepth(100);
    slideBtn.on("pointerdown", () => this.slide());
  }

  private moveLane(dir: number) {
    if (!this.isAlive) return;
    const newLane = Phaser.Math.Clamp(this.laneIndex + dir, 0, LANE_COUNT - 1);
    if (newLane === this.laneIndex) return;
    this.laneIndex = newLane;
    const targetX = CX + LANE_POSITIONS[this.laneIndex];
    this.tweens.add({
      targets: this.runner,
      x: targetX,
      duration: 120,
      ease: "Power2",
    });
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
    body.setSize(38, 24);
    body.setOffset(3, 4);
    this.slideTimer = this.time.delayedCall(SLIDE_DURATION, () => this.endSlide());
  }

  private endSlide() {
    if (!this.isSliding) return;
    this.isSliding = false;
    this.runner.setTexture("runner");
    const body = this.runner.body as Phaser.Physics.Arcade.Body;
    body.setSize(34, 52);
    body.setOffset(3, 2);
    if (this.slideTimer) this.slideTimer.destroy();
  }

  private startSpawners() {
    this.scheduleNextObstacle();

    this.coinTimer = this.time.addEvent({
      delay: COIN_SPAWN_INTERVAL,
      callback: this.spawnCoinPattern,
      callbackScope: this,
      loop: true,
    });

    this.powerupTimer = this.time.addEvent({
      delay: POWERUP_SPAWN_INTERVAL,
      callback: this.spawnPowerup,
      callbackScope: this,
      loop: true,
    });
  }

  private scheduleNextObstacle() {
    const speedFactor = 1 - (this.speed - INITIAL_SPEED) / (MAX_SPEED - INITIAL_SPEED) * 0.6;
    const delay = Phaser.Math.Between(
      OBSTACLE_SPAWN_INTERVAL_MIN * speedFactor,
      OBSTACLE_SPAWN_INTERVAL_MAX * speedFactor
    );
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
    let cumulative = 0;
    let type = types[0];
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (r < cumulative) { type = types[i]; break; }
    }

    const lane = Phaser.Math.Between(0, LANE_COUNT - 1);
    const x = CX + LANE_POSITIONS[lane];

    const obs = this.obstacles.create(x, -60, type) as Phaser.Physics.Arcade.Sprite;
    obs.setImmovable(true);
    (obs.body as Phaser.Physics.Arcade.Body).allowGravity = false;

    if (type === "barrier") {
      obs.setY(-50);
      obs.setData("type", "barrier");
    } else if (type === "low_gate") {
      obs.setY(-30);
      obs.setData("type", "low_gate");
    } else {
      obs.setY(-80);
      obs.setData("type", "lane_blocker");
    }

    if (this.speed > 6 && Math.random() < 0.3) {
      const lane2 = (lane + (Math.random() < 0.5 ? 1 : -1) + LANE_COUNT) % LANE_COUNT;
      if (lane2 !== lane) {
        const obs2 = this.obstacles.create(CX + LANE_POSITIONS[lane2], obs.y, type) as Phaser.Physics.Arcade.Sprite;
        obs2.setImmovable(true);
        (obs2.body as Phaser.Physics.Arcade.Body).allowGravity = false;
        obs2.setData("type", type);
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
      this.tweens.add({
        targets: coin,
        scaleX: 0.8, scaleY: 0.8,
        duration: 300, yoyo: true, repeat: -1,
        ease: "Sine.easeInOut",
      });
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

    this.tweens.add({
      targets: pu,
      y: pu.y - 5,
      duration: 500, yoyo: true, repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private collectCoin(_runner: any, coinObj: any) {
    const coin = coinObj as Phaser.Physics.Arcade.Sprite;
    coin.destroy();
    this.coinCount++;
    this.score += COIN_SCORE;

    this.tweens.add({
      targets: this.coinText,
      scaleX: 1.3, scaleY: 1.3,
      duration: 100, yoyo: true,
    });
  }

  private collectPowerup(_runner: any, puObj: any) {
    const pu = puObj as Phaser.Physics.Arcade.Sprite;
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
    this.powerupState.magnetTimer = this.time.delayedCall(MAGNET_DURATION, () => {
      this.powerupState.magnet = false;
    });
    this.updatePowerupIcons();
  }

  private activateShield() {
    this.powerupState.shield = true;
    this.shieldSprite?.setVisible(true);
    if (this.powerupState.shieldTimer) this.powerupState.shieldTimer.destroy();
    this.powerupState.shieldTimer = this.time.delayedCall(SHIELD_DURATION, () => {
      this.powerupState.shield = false;
      this.shieldSprite?.setVisible(false);
    });
    this.updatePowerupIcons();
  }

  private activateBoost() {
    this.powerupState.boost = true;
    if (this.powerupState.boostTimer) this.powerupState.boostTimer.destroy();
    this.powerupState.boostTimer = this.time.delayedCall(BOOST_DURATION, () => {
      this.powerupState.boost = false;
    });
    this.updatePowerupIcons();
  }

  private showPowerupFlash(type: string) {
    const color = type === "magnet" ? "#448aff" : type === "shield_pu" ? "#00e676" : "#ff6d00";
    const label = type === "magnet" ? "MAGNET!" : type === "shield_pu" ? "SHIELD!" : "BOOST!";
    const txt = this.add.text(CX, RUNNER_Y - 60, label, {
      fontSize: "18px", fontFamily: "monospace", color, fontStyle: "bold",
      stroke: "#000", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(101);
    this.tweens.add({
      targets: txt, y: txt.y - 40, alpha: 0, duration: 800,
      onComplete: () => txt.destroy(),
    });
  }

  private updatePowerupIcons() {
    this.powerupIcons.forEach(c => c.destroy());
    this.powerupIcons = [];
    let ix = GAME_WIDTH - 16;
    const iy = 40;
    if (this.powerupState.magnet) {
      const icon = this.add.container(ix, iy, [
        this.add.image(0, 0, "magnet").setScale(1),
      ]).setScrollFactor(0).setDepth(100);
      this.powerupIcons.push(icon);
      ix -= 32;
    }
    if (this.powerupState.shield) {
      const icon = this.add.container(ix, iy, [
        this.add.image(0, 0, "shield_pu").setScale(1),
      ]).setScrollFactor(0).setDepth(100);
      this.powerupIcons.push(icon);
      ix -= 32;
    }
    if (this.powerupState.boost) {
      const icon = this.add.container(ix, iy, [
        this.add.image(0, 0, "boost_pu").setScale(1),
      ]).setScrollFactor(0).setDepth(100);
      this.powerupIcons.push(icon);
    }
  }

  private hitObstacle(_runner: any, obsObj: any) {
    if (!this.isAlive) return;
    const obs = obsObj as Phaser.Physics.Arcade.Sprite;
    const type = obs.getData("type") as string;

    if (type === "low_gate" && this.isSliding) return;

    const body = this.runner.body as Phaser.Physics.Arcade.Body;
    if (type === "barrier" && !body.blocked.down && !body.touching.down && body.velocity.y < 0) {
      return;
    }

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
      this.scene.start("GameOver", {
        score: this.score,
        coins: this.coinCount,
        distance: Math.floor(this.distance),
        bestScore: getBestScore(),
        isNewBest,
        speed: this.speed,
      });
    });
  }

  update(_time: number, delta: number) {
    if (!this.isAlive) return;

    const effectiveSpeed = this.powerupState.boost ? this.speed * BOOST_SPEED_MULT : this.speed;

    this.speed = Math.min(this.speed + SPEED_RAMP * (delta / 16), MAX_SPEED);
    this.distance += effectiveSpeed * (delta / 16);
    this.score = Math.floor(this.distance) + this.coinCount * COIN_SCORE;

    this.bgHex.tilePositionY -= effectiveSpeed * 0.3;
    this.bgStars.tilePositionY -= effectiveSpeed * 0.15;

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
        if (dist < 150 && dist > 5) {
          const pullForce = 8;
          coin.x += (dx / dist) * pullForce;
          coin.y += (dy / dist) * pullForce;
        }
      }
    });

    this.powerups.getChildren().forEach((obj) => {
      const pu = obj as Phaser.Physics.Arcade.Sprite;
      pu.y += effectiveSpeed * (delta / 16) * 2;
      if (pu.y > GAME_HEIGHT + 50) pu.destroy();
    });

    if (this.shieldSprite) {
      this.shieldSprite.setPosition(this.runner.x, this.runner.y);
    }

    this.scoreText.setText(this.score.toLocaleString());
    this.coinText.setText(` ${this.coinCount}`);
    this.speedText.setText(`${effectiveSpeed.toFixed(1)}x`);
  }
}

class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: "GameOver" }); }

  create(data: { score: number; coins: number; distance: number; bestScore: number; isNewBest: boolean; speed: number }) {
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "bg_hex").setOrigin(0, 0);
    this.add.rectangle(CX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6);

    this.add.text(CX, 65, "GAME OVER", {
      fontSize: "36px", fontFamily: "monospace", color: "#ff1744",
      fontStyle: "bold", stroke: "#500", strokeThickness: 4,
    }).setOrigin(0.5);

    if (data.isNewBest) {
      const newBest = this.add.text(CX, 108, "NEW BEST!", {
        fontSize: "20px", fontFamily: "monospace", color: "#ffd54f",
        fontStyle: "bold", stroke: "#7a4a00", strokeThickness: 3,
      }).setOrigin(0.5);
      this.tweens.add({ targets: newBest, scaleX: 1.1, scaleY: 1.1, duration: 500, yoyo: true, repeat: -1 });
    }

    const beeSprite = this.add.image(CX, 158, "runner").setScale(2);
    beeSprite.setTint(0xff4444);
    this.tweens.add({ targets: beeSprite, alpha: 0.5, duration: 800, yoyo: true, repeat: -1 });

    const statsY = 200;
    const stats = [
      { label: "SCORE", value: data.score.toLocaleString(), color: "#ffd54f" },
      { label: "HONEY", value: data.coins.toString(), color: "#ffecb3" },
      { label: "DISTANCE", value: `${data.distance.toLocaleString()}m`, color: "#00e5ff" },
      { label: "TOP SPEED", value: `${data.speed.toFixed(1)}x`, color: "#ff6d00" },
      { label: "BEST SCORE", value: data.bestScore.toLocaleString(), color: "#ffb300" },
    ];

    stats.forEach((s, i) => {
      const y = statsY + i * 54;
      this.add.rectangle(CX, y + 10, 280, 46, 0x050a18, 0.85).setStrokeStyle(1, COLORS.neonBlue, 0.12);
      this.add.text(CX - 125, y, s.label, {
        fontSize: "10px", fontFamily: "monospace", color: "#4a6a8a",
      });
      this.add.text(CX + 125, y + 16, s.value, {
        fontSize: "20px", fontFamily: "monospace", color: s.color, fontStyle: "bold",
      }).setOrigin(1, 0.5);
    });

    const btnGlow = this.add.rectangle(CX, 490, 210, 54, COLORS.neonBlue, 0.06);
    this.tweens.add({ targets: btnGlow, scaleX: 1.15, scaleY: 1.15, alpha: 0, duration: 1500, repeat: -1 });

    const retryBtn = this.add.rectangle(CX, 490, 200, 50, COLORS.beeBody, 1).setInteractive({ useHandCursor: true });
    retryBtn.setStrokeStyle(2, COLORS.runnerGlow);
    this.add.text(CX, 490, "PLAY AGAIN", {
      fontSize: "18px", fontFamily: "monospace", color: "#000", fontStyle: "bold",
    }).setOrigin(0.5);
    retryBtn.on("pointerdown", () => this.scene.start("Game"));
    this.tweens.add({ targets: retryBtn, scaleX: 1.04, scaleY: 1.04, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const menuBtn = this.add.rectangle(CX, 555, 200, 40, 0x0a1530, 1).setInteractive({ useHandCursor: true });
    menuBtn.setStrokeStyle(1, COLORS.neonBlue, 0.3);
    this.add.text(CX, 555, "MENU", {
      fontSize: "14px", fontFamily: "monospace", color: "#00e5ff",
    }).setOrigin(0.5);
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
    backgroundColor: "#03060f",
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, MenuScene, GameScene, GameOverScene],
    input: {
      activePointers: 3,
    },
    render: {
      pixelArt: false,
      antialias: true,
    },
  };

  return new Phaser.Game(config);
}
