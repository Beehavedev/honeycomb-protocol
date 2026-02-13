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
export const PHASE_NAMES = ["CYAN SURGE", "NEON BLAZE", "PLASMA RUSH", "HYPER NOVA"];

export const C = {
  bgDeep: 0x01000a,
  bgMid: 0x040020,
  bgTop: 0x080038,

  tunnelDark: 0x02000c,
  tunnelMid: 0x0a0328,
  tunnelDeep: 0x010004,

  cyan: 0x00e5ff,
  cyanBright: 0x60f8ff,
  cyanDim: 0x003848,
  cyanWhite: 0xc0f8ff,
  cyanHot: 0x00d4ff,

  magenta: 0xff0080,
  magentaBright: 0xff50b8,
  magentaDim: 0x480028,
  magentaHot: 0xff2098,

  lime: 0x30ff10,
  limeBright: 0x70ff50,
  limeDim: 0x185000,

  amber: 0xf0a000,
  amberHot: 0xffc840,
  amberWhite: 0xfff0c0,
  amberDim: 0x604000,

  laserRed: 0xff2848,
  laserRedBright: 0xff6888,
  laserRedGlow: 0xff0838,
  laserRedWhite: 0xffe0e8,

  glitchPurple: 0xb050ff,
  glitchBlue: 0x5090ff,
  glitchPink: 0xff40d0,

  beeBody: 0x0c2838,
  beeBodyLight: 0x184858,
  beeStripe: 0xff9800,
  beeStripeBright: 0xffb840,
  beeEye: 0x00ffff,
  beeEyeBright: 0x80ffff,
  beeWing: 0x00e5ff,
  beeWingTip: 0xff0080,

  coinBody: 0xffd040,
  coinLight: 0xffec90,
  coinShine: 0xfffff0,
  coinGlow: 0xffb000,

  shieldGreen: 0x00e870,
  shieldBright: 0x70ffb0,
  magnetBlue: 0x4890ff,
  magnetBright: 0x90c0ff,
  boostOrange: 0xff6800,
  boostBright: 0xffa848,

  white: 0xffffff,
  black: 0x000000,

  hudBg: 0x030010,
  hudBorder: 0x1a2848,
  hudAccent: 0x00e5ff,
};
