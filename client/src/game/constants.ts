export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 700;

export const LANE_COUNT = 3;
export const LANE_WIDTH = 100;
export const LANE_POSITIONS = [-LANE_WIDTH, 0, LANE_WIDTH];

export const RUNNER_Y = 520;
export const GROUND_Y = 580;

export const INITIAL_SPEED = 4;
export const MAX_SPEED = 14;
export const SPEED_RAMP = 0.002;

export const JUMP_VELOCITY = -550;
export const GRAVITY = 1200;
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
export const PHASE_NAMES = ["CYAN SURGE", "PINK BLAZE", "LIME RUSH", "ULTRA NOVA"];

export const C = {
  bgDeep: 0x020014,
  bgMid: 0x060028,
  bgTop: 0x0a003c,

  tunnelDark: 0x03000a,
  tunnelMid: 0x0c0420,
  tunnelDeep: 0x020006,

  cyan: 0x00e5ff,
  cyanBright: 0x80f4ff,
  cyanDim: 0x004858,
  cyanWhite: 0xd0fcff,

  magenta: 0xff0090,
  magentaBright: 0xff60c0,
  magentaDim: 0x580030,

  lime: 0x39ff14,
  limeBright: 0x80ff60,
  limeDim: 0x1a5800,

  amber: 0xf0a000,
  amberHot: 0xffc840,
  amberWhite: 0xfff0c0,
  amberDim: 0x604000,

  laserRed: 0xff1040,
  laserRedBright: 0xff5070,
  laserRedGlow: 0xff0030,
  laserRedWhite: 0xffc0d0,

  glitchPurple: 0x8020ff,
  glitchBlue: 0x2060ff,

  beeBody: 0x103040,
  beeBodyLight: 0x1a5060,
  beeStripe: 0xf0a000,
  beeStripeBright: 0xffc030,
  beeEye: 0x00e5ff,
  beeEyeBright: 0x80f4ff,
  beeWing: 0x00e5ff,
  beeWingTip: 0xff0090,

  coinBody: 0xffd030,
  coinLight: 0xffec90,
  coinShine: 0xfffff0,
  coinGlow: 0xffa000,

  shieldGreen: 0x00e676,
  shieldBright: 0x80ffb0,
  magnetBlue: 0x4488ff,
  magnetBright: 0x90b8ff,
  boostOrange: 0xff6000,
  boostBright: 0xffa040,

  white: 0xffffff,
  black: 0x000000,

  hudBg: 0x040010,
  hudBorder: 0x182040,
  hudAccent: 0x00e5ff,
};
