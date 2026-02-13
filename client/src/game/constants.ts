export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 854;

export const LANE_COUNT = 3;
export const LANE_WIDTH = 120;
export const LANE_POSITIONS = [-LANE_WIDTH, 0, LANE_WIDTH];

export const RUNNER_Y = 640;
export const GROUND_Y = 710;

export const INITIAL_SPEED = 4;
export const MAX_SPEED = 14;
export const SPEED_RAMP = 0.002;

export const JUMP_VELOCITY = -600;
export const GRAVITY = 1300;
export const SLIDE_DURATION = 600;

export const OBSTACLE_SPAWN_INTERVAL_MIN = 800;
export const OBSTACLE_SPAWN_INTERVAL_MAX = 2000;
export const COIN_SPAWN_INTERVAL = 1200;
export const POWERUP_SPAWN_INTERVAL = 12000;

export const MAGNET_DURATION = 8000;
export const SHIELD_DURATION = 10000;
export const BOOST_DURATION = 5000;
export const BOOST_SPEED_MULT = 1.8;

export const COIN_SCORE = 10;

export const STINGER_DASH_DURATION = 1200;
export const STINGER_DASH_COOLDOWN = 8000;
export const COMBO_DECAY_TIME = 3000;
export const COMBO_TIERS = [1, 2, 5, 10, 20];

export const PHASE_THRESHOLDS = [0, 2000, 6000, 15000];
export const PHASE_NAMES = ["AMBER SURGE", "GOLDEN BLAZE", "HONEY RUSH", "HYPER HIVE"];

export const FONT_UI = "'Inter', 'Segoe UI', 'SF Pro Display', -apple-system, sans-serif";
export const FONT_DISPLAY = "'Inter', 'Segoe UI', 'SF Pro Display', -apple-system, sans-serif";
export const FONT_MONO = "'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', monospace";

export const C = {
  bgDeep: 0x020204,
  bgMid: 0x060608,
  bgTop: 0x0a0a10,

  tunnelDark: 0x040406,
  tunnelMid: 0x080810,
  tunnelDeep: 0x020204,

  amber: 0xf0a500,
  amberBright: 0xffc040,
  amberDim: 0x806000,
  amberWhite: 0xfff4d0,
  amberHot: 0xffd050,

  gold: 0xf5b800,
  goldBright: 0xffe070,
  goldDim: 0x705000,
  goldWhite: 0xfff8e0,

  honey: 0xffaa00,
  honeyBright: 0xffc840,
  honeyDim: 0x604000,
  honeyGlow: 0xff9500,

  orange: 0xff7800,
  orangeBright: 0xffb060,
  orangeDim: 0x603000,
  orangeHot: 0xff9030,

  laserRed: 0xff3858,
  laserRedBright: 0xff80a0,
  laserRedGlow: 0xff1848,
  laserRedWhite: 0xfff0f4,

  glitchPurple: 0xc060ff,
  glitchBlue: 0x60a0ff,
  glitchPink: 0xff50e0,

  beeBody: 0x1a1208,
  beeBodyLight: 0x2a1e10,
  beeStripe: 0xffaa00,
  beeStripeBright: 0xffc850,
  beeEye: 0xffd040,
  beeEyeBright: 0xffe880,
  beeWing: 0xf0a500,
  beeWingTip: 0xff7800,

  coinBody: 0xffe050,
  coinLight: 0xfff0a0,
  coinShine: 0xfffff8,
  coinGlow: 0xffc020,

  shieldGreen: 0x00ff80,
  shieldBright: 0x80ffc0,
  magnetBlue: 0x58a0ff,
  magnetBright: 0xa0d0ff,
  boostOrange: 0xff7800,
  boostBright: 0xffb858,

  cyan: 0x00f0ff,
  cyanBright: 0x80ffff,

  white: 0xffffff,
  black: 0x000000,

  hudBg: 0x050508,
  hudBorder: 0x1a1a20,
  hudAccent: 0xf0a500,

  glass: 0x0a0a12,
  glassBorder: 0x1a1a24,
  glassHighlight: 0x2a2a30,
};
