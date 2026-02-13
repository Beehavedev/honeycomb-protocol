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

class BootScene extends Phaser.Scene {
  constructor() { super({ key: "Boot" }); }

  create() {
    const g = this.make.graphics({ x: 0, y: 0 });

    g.clear();
    g.fillStyle(COLORS.runner, 1);
    g.fillRoundedRect(0, 0, 36, 52, 8);
    g.fillStyle(COLORS.runnerGlow, 1);
    g.fillRoundedRect(6, 4, 24, 12, 4);
    g.fillStyle(0x000000, 0.3);
    g.fillRect(10, 20, 16, 6);
    g.fillStyle(COLORS.runnerGlow, 0.6);
    g.fillRoundedRect(4, 30, 28, 18, 4);
    g.lineStyle(2, COLORS.runnerGlow, 0.8);
    g.strokeRoundedRect(0, 0, 36, 52, 8);
    g.generateTexture("runner", 36, 52);
    g.clear();

    g.fillStyle(COLORS.runner, 1);
    g.fillRoundedRect(0, 0, 36, 28, 6);
    g.fillStyle(COLORS.runnerGlow, 0.6);
    g.fillRoundedRect(4, 4, 28, 10, 3);
    g.lineStyle(2, COLORS.runnerGlow, 0.8);
    g.strokeRoundedRect(0, 0, 36, 28, 6);
    g.generateTexture("runner_slide", 36, 28);
    g.clear();

    g.fillStyle(COLORS.obstacle, 1);
    g.fillRoundedRect(0, 0, 70, 50, 6);
    g.lineStyle(2, COLORS.obstacleGlow, 0.8);
    g.strokeRoundedRect(0, 0, 70, 50, 6);
    g.fillStyle(COLORS.obstacleGlow, 0.3);
    g.fillRect(8, 8, 54, 4);
    g.fillRect(8, 38, 54, 4);
    g.generateTexture("barrier", 70, 50);
    g.clear();

    g.fillStyle(COLORS.obstacle, 0.9);
    g.fillRoundedRect(0, 0, 70, 20, 4);
    g.lineStyle(2, COLORS.obstacleGlow, 0.7);
    g.strokeRoundedRect(0, 0, 70, 20, 4);
    g.generateTexture("low_gate", 70, 20);
    g.clear();

    g.fillStyle(COLORS.obstacle, 1);
    g.fillRoundedRect(0, 0, 30, 80, 4);
    g.lineStyle(2, COLORS.obstacleGlow, 0.8);
    g.strokeRoundedRect(0, 0, 30, 80, 4);
    g.fillStyle(COLORS.obstacleGlow, 0.3);
    g.fillRect(6, 6, 18, 68);
    g.generateTexture("lane_blocker", 30, 80);
    g.clear();

    g.fillStyle(COLORS.coin, 1);
    g.fillCircle(10, 10, 10);
    g.fillStyle(0x000000, 0.2);
    g.fillCircle(10, 10, 5);
    g.lineStyle(2, COLORS.coinGlow, 0.9);
    g.strokeCircle(10, 10, 10);
    g.generateTexture("coin", 20, 20);
    g.clear();

    g.fillStyle(COLORS.magnet, 1);
    g.fillRoundedRect(0, 0, 24, 24, 6);
    g.fillStyle(0xffffff, 0.4);
    g.fillRect(6, 6, 12, 4);
    g.fillRect(6, 14, 12, 4);
    g.lineStyle(2, 0x60a5fa, 0.9);
    g.strokeRoundedRect(0, 0, 24, 24, 6);
    g.generateTexture("magnet", 24, 24);
    g.clear();

    g.fillStyle(COLORS.shield, 1);
    g.fillRoundedRect(0, 0, 24, 24, 6);
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(12, 12, 6);
    g.lineStyle(2, 0x4ade80, 0.9);
    g.strokeRoundedRect(0, 0, 24, 24, 6);
    g.generateTexture("shield_pu", 24, 24);
    g.clear();

    g.fillStyle(COLORS.boost, 1);
    g.fillRoundedRect(0, 0, 24, 24, 6);
    g.fillStyle(0xffffff, 0.5);
    g.fillTriangle(8, 18, 12, 4, 16, 18);
    g.lineStyle(2, 0xfb923c, 0.9);
    g.strokeRoundedRect(0, 0, 24, 24, 6);
    g.generateTexture("boost_pu", 24, 24);
    g.clear();

    const bgW = GAME_WIDTH;
    const bgH = GAME_HEIGHT;
    g.fillGradientStyle(COLORS.bgGrad1, COLORS.bgGrad1, COLORS.bgGrad2, COLORS.bgGrad2, 1);
    g.fillRect(0, 0, bgW, bgH);
    const hexR = 30;
    const hexH = hexR * Math.sqrt(3);
    for (let row = -1; row < bgH / hexH + 1; row++) {
      for (let col = -1; col < bgW / (hexR * 1.5) + 1; col++) {
        const cx = col * hexR * 1.5;
        const cy = row * hexH + (col % 2 ? hexH / 2 : 0);
        const pts = hexPoints(cx, cy, hexR - 2);
        g.lineStyle(1, COLORS.hexLine, 0.15);
        g.beginPath();
        g.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
        g.closePath();
        g.strokePath();
      }
    }
    g.generateTexture("bg_hex", bgW, bgH);
    g.clear();

    g.fillStyle(COLORS.darkBg, 0.7);
    g.fillRect(0, 0, bgW, bgH);
    for (let i = 0; i < 60; i++) {
      const sx = Math.random() * bgW;
      const sy = Math.random() * bgH;
      const sr = 1 + Math.random() * 2;
      g.fillStyle(COLORS.laneGlow, 0.1 + Math.random() * 0.3);
      g.fillCircle(sx, sy, sr);
    }
    g.generateTexture("bg_stars", bgW, bgH);
    g.clear();

    g.fillStyle(0x1a1a2e, 1);
    g.fillRect(0, 0, LANE_WIDTH * 3 + 20, 20);
    g.lineStyle(1, COLORS.lane, 0.3);
    g.strokeRect(0, 0, LANE_WIDTH * 3 + 20, 20);
    for (let i = 1; i < 3; i++) {
      g.lineStyle(1, COLORS.lane, 0.2);
      g.lineBetween(i * LANE_WIDTH + 10, 0, i * LANE_WIDTH + 10, 20);
    }
    g.generateTexture("ground_tile", LANE_WIDTH * 3 + 20, 20);
    g.clear();

    g.fillStyle(COLORS.lane, 0.6);
    g.fillCircle(5, 5, 5);
    g.generateTexture("particle", 10, 10);
    g.clear();

    g.destroy();

    this.scene.start("Menu");
  }
}

class MenuScene extends Phaser.Scene {
  constructor() { super({ key: "Menu" }); }

  create() {
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "bg_hex").setOrigin(0, 0);
    this.add.rectangle(CX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.4);

    this.add.text(CX, 120, "HONEY", {
      fontSize: "48px", fontFamily: "monospace", color: "#f59e0b",
      fontStyle: "bold", stroke: "#92400e", strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(CX, 170, "RUNNER", {
      fontSize: "36px", fontFamily: "monospace", color: "#fbbf24",
      fontStyle: "bold", stroke: "#92400e", strokeThickness: 2,
    }).setOrigin(0.5);

    this.add.image(CX, 240, "runner").setScale(2.5);

    const bestScore = getBestScore();
    if (bestScore > 0) {
      this.add.text(CX, 310, `BEST: ${bestScore.toLocaleString()}`, {
        fontSize: "16px", fontFamily: "monospace", color: "#fbbf24",
      }).setOrigin(0.5);
    }

    const playBtn = this.add.rectangle(CX, 380, 180, 50, COLORS.runner, 1).setInteractive({ useHandCursor: true });
    playBtn.setStrokeStyle(2, COLORS.runnerGlow);
    this.add.text(CX, 380, "PLAY", {
      fontSize: "22px", fontFamily: "monospace", color: "#000", fontStyle: "bold",
    }).setOrigin(0.5);

    playBtn.on("pointerdown", () => {
      this.scene.start("Game");
    });

    this.tweens.add({ targets: playBtn, scaleX: 1.05, scaleY: 1.05, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const controls = [
      "CONTROLS:",
      "",
      "Arrow Left/Right - Change lane",
      "Arrow Up / Swipe Up - Jump",
      "Arrow Down / Swipe Down - Slide",
      "",
      "Collect coins & dodge obstacles!",
    ];
    this.add.text(CX, 500, controls.join("\n"), {
      fontSize: "11px", fontFamily: "monospace", color: "#94a3b8",
      align: "center", lineSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(CX, GAME_HEIGHT - 30, "A Honeycomb Arena Game", {
      fontSize: "10px", fontFamily: "monospace", color: "#64748b",
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

    this.bgHex = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "bg_hex").setOrigin(0, 0).setScrollFactor(0);
    this.bgStars = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, "bg_stars").setOrigin(0, 0).setScrollFactor(0);

    const laneArea = this.add.rectangle(CX, GROUND_Y - 40, LANE_WIDTH * 3 + 10, 200, 0x0a0a2e, 0.5);
    laneArea.setStrokeStyle(1, COLORS.lane, 0.15);

    for (let i = 0; i <= LANE_COUNT; i++) {
      const lx = CX + LANE_POSITIONS[0] - LANE_WIDTH / 2 + i * LANE_WIDTH;
      const lineAlpha = (i === 0 || i === LANE_COUNT) ? 0.4 : 0.15;
      this.add.line(0, 0, lx, GROUND_Y - 140, lx, GROUND_Y + 20, COLORS.lane, lineAlpha).setOrigin(0, 0);
    }

    const gt = this.add.tileSprite(CX, GROUND_Y, LANE_WIDTH * 3 + 20, 20, "ground_tile");
    this.groundTiles.push(gt);

    this.obstacles = this.physics.add.group({ allowGravity: false });
    this.coins = this.physics.add.group({ allowGravity: false });
    this.powerups = this.physics.add.group({ allowGravity: false });

    this.runner = this.physics.add.sprite(CX, RUNNER_Y, "runner");
    this.runner.setCollideWorldBounds(false);
    this.runner.setGravityY(GRAVITY);
    this.runner.setSize(30, 48);

    this.particles = this.add.particles(0, 0, "particle", {
      speed: { min: 20, max: 60 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 400,
      frequency: 80,
      follow: this.runner,
      followOffset: { x: 0, y: 24 },
      blendMode: "ADD",
      tint: COLORS.laneGlow,
    });

    this.shieldSprite = this.add.circle(CX, RUNNER_Y, 30, COLORS.shield, 0.2);
    this.shieldSprite.setStrokeStyle(2, COLORS.shield, 0.6);
    this.shieldSprite.setVisible(false);

    this.physics.add.overlap(this.runner, this.coins, this.collectCoin, undefined, this);
    this.physics.add.overlap(this.runner, this.powerups, this.collectPowerup, undefined, this);
    this.physics.add.overlap(this.runner, this.obstacles, this.hitObstacle, undefined, this);

    const floorZone = this.add.zone(CX, GROUND_Y, GAME_WIDTH, 10);
    this.physics.add.existing(floorZone, true);
    this.physics.add.collider(this.runner, floorZone);

    this.scoreText = this.add.text(16, 16, "0", {
      fontSize: "20px", fontFamily: "monospace", color: "#fbbf24", fontStyle: "bold",
      stroke: "#000", strokeThickness: 3,
    }).setScrollFactor(0).setDepth(100);

    this.coinText = this.add.text(16, 42, "0", {
      fontSize: "14px", fontFamily: "monospace", color: "#fde68a",
      stroke: "#000", strokeThickness: 2,
    }).setScrollFactor(0).setDepth(100);

    this.speedText = this.add.text(GAME_WIDTH - 16, 16, `${this.speed.toFixed(1)}x`, {
      fontSize: "12px", fontFamily: "monospace", color: "#94a3b8",
      stroke: "#000", strokeThickness: 2,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    const coinIcon = this.add.image(14, 48, "coin").setScale(0.7).setScrollFactor(0).setDepth(100);
    coinIcon.setPosition(10, 49);

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
    const btnAlpha = 0.25;

    const leftBtn = this.add.rectangle(50, btnY, btnSize, btnSize, COLORS.lane, btnAlpha)
      .setInteractive().setScrollFactor(0).setDepth(99);
    this.add.text(50, btnY, "<", { fontSize: "20px", fontFamily: "monospace", color: "#fbbf24" })
      .setOrigin(0.5).setScrollFactor(0).setDepth(100);
    leftBtn.on("pointerdown", () => this.moveLane(-1));

    const rightBtn = this.add.rectangle(GAME_WIDTH - 50, btnY, btnSize, btnSize, COLORS.lane, btnAlpha)
      .setInteractive().setScrollFactor(0).setDepth(99);
    this.add.text(GAME_WIDTH - 50, btnY, ">", { fontSize: "20px", fontFamily: "monospace", color: "#fbbf24" })
      .setOrigin(0.5).setScrollFactor(0).setDepth(100);
    rightBtn.on("pointerdown", () => this.moveLane(1));

    const jumpBtn = this.add.rectangle(CX - 40, btnY, btnSize, btnSize, COLORS.lane, btnAlpha)
      .setInteractive().setScrollFactor(0).setDepth(99);
    this.add.text(CX - 40, btnY, "^", { fontSize: "20px", fontFamily: "monospace", color: "#fbbf24" })
      .setOrigin(0.5).setScrollFactor(0).setDepth(100);
    jumpBtn.on("pointerdown", () => this.jump());

    const slideBtn = this.add.rectangle(CX + 40, btnY, btnSize, btnSize, COLORS.lane, btnAlpha)
      .setInteractive().setScrollFactor(0).setDepth(99);
    this.add.text(CX + 40, btnY, "v", { fontSize: "20px", fontFamily: "monospace", color: "#fbbf24" })
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
    body.setSize(30, 24);
    body.setOffset(3, 4);
    this.slideTimer = this.time.delayedCall(SLIDE_DURATION, () => this.endSlide());
  }

  private endSlide() {
    if (!this.isSliding) return;
    this.isSliding = false;
    this.runner.setTexture("runner");
    const body = this.runner.body as Phaser.Physics.Arcade.Body;
    body.setSize(30, 48);
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
    const color = type === "magnet" ? "#3b82f6" : type === "shield_pu" ? "#22c55e" : "#f97316";
    const label = type === "magnet" ? "MAGNET!" : type === "shield_pu" ? "SHIELD!" : "BOOST!";
    const txt = this.add.text(CX, RUNNER_Y - 60, label, {
      fontSize: "18px", fontFamily: "monospace", color, fontStyle: "bold",
      stroke: "#000", strokeThickness: 3,
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
        this.add.image(0, 0, "magnet").setScale(1.2),
      ]).setScrollFactor(0).setDepth(100);
      this.powerupIcons.push(icon);
      ix -= 30;
    }
    if (this.powerupState.shield) {
      const icon = this.add.container(ix, iy, [
        this.add.image(0, 0, "shield_pu").setScale(1.2),
      ]).setScrollFactor(0).setDepth(100);
      this.powerupIcons.push(icon);
      ix -= 30;
    }
    if (this.powerupState.boost) {
      const icon = this.add.container(ix, iy, [
        this.add.image(0, 0, "boost_pu").setScale(1.2),
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

    this.add.text(CX, 80, "GAME OVER", {
      fontSize: "36px", fontFamily: "monospace", color: "#ef4444",
      fontStyle: "bold", stroke: "#7f1d1d", strokeThickness: 4,
    }).setOrigin(0.5);

    if (data.isNewBest) {
      const newBest = this.add.text(CX, 125, "NEW BEST!", {
        fontSize: "20px", fontFamily: "monospace", color: "#fbbf24",
        fontStyle: "bold", stroke: "#92400e", strokeThickness: 3,
      }).setOrigin(0.5);
      this.tweens.add({ targets: newBest, scaleX: 1.1, scaleY: 1.1, duration: 500, yoyo: true, repeat: -1 });
    }

    const statsY = 180;
    const stats = [
      { label: "SCORE", value: data.score.toLocaleString(), color: "#fbbf24" },
      { label: "COINS", value: data.coins.toString(), color: "#fde68a" },
      { label: "DISTANCE", value: `${data.distance.toLocaleString()}m`, color: "#94a3b8" },
      { label: "TOP SPEED", value: `${data.speed.toFixed(1)}x`, color: "#f97316" },
      { label: "BEST SCORE", value: data.bestScore.toLocaleString(), color: "#f59e0b" },
    ];

    stats.forEach((s, i) => {
      const y = statsY + i * 60;
      this.add.rectangle(CX, y + 10, 280, 50, 0x1a1a2e, 0.8).setStrokeStyle(1, COLORS.lane, 0.2);
      this.add.text(CX - 120, y, s.label, {
        fontSize: "11px", fontFamily: "monospace", color: "#64748b",
      });
      this.add.text(CX + 120, y + 18, s.value, {
        fontSize: "22px", fontFamily: "monospace", color: s.color, fontStyle: "bold",
      }).setOrigin(1, 0.5);
    });

    const retryBtn = this.add.rectangle(CX, 520, 200, 50, COLORS.runner, 1).setInteractive({ useHandCursor: true });
    retryBtn.setStrokeStyle(2, COLORS.runnerGlow);
    this.add.text(CX, 520, "PLAY AGAIN", {
      fontSize: "18px", fontFamily: "monospace", color: "#000", fontStyle: "bold",
    }).setOrigin(0.5);
    retryBtn.on("pointerdown", () => this.scene.start("Game"));
    this.tweens.add({ targets: retryBtn, scaleX: 1.05, scaleY: 1.05, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const menuBtn = this.add.rectangle(CX, 585, 200, 40, 0x334155, 1).setInteractive({ useHandCursor: true });
    menuBtn.setStrokeStyle(1, 0x64748b);
    this.add.text(CX, 585, "MENU", {
      fontSize: "14px", fontFamily: "monospace", color: "#e2e8f0",
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
    backgroundColor: "#0a0a1a",
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
