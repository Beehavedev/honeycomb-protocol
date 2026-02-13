export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 700;

export const LANE_COUNT = 3;
export const LANE_WIDTH = 100;
export const LANE_POSITIONS = [-LANE_WIDTH, 0, LANE_WIDTH];

export const RUNNER_Y = 490;
export const GROUND_Y = 560;

export const INITIAL_SPEED = 4;
export const MAX_SPEED = 12;
export const SPEED_RAMP = 0.002;

export const JUMP_VELOCITY = -550;
export const GRAVITY = 1200;
export const SLIDE_DURATION = 600;

export const OBSTACLE_SPAWN_INTERVAL_MIN = 800;
export const OBSTACLE_SPAWN_INTERVAL_MAX = 2000;
export const COIN_SPAWN_INTERVAL = 1500;
export const POWERUP_SPAWN_INTERVAL = 12000;

export const MAGNET_DURATION = 8000;
export const SHIELD_DURATION = 10000;
export const BOOST_DURATION = 5000;
export const BOOST_SPEED_MULT = 1.8;

export const COIN_SCORE = 10;

export const C = {
  tunnelDark: 0x06010f,
  tunnelMid: 0x120828,
  tunnelLight: 0x2a1248,
  tunnelWall: 0x180c32,
  tunnelDeep: 0x0a0318,

  hexRingAmber: 0xf5a000,
  hexRingAmberBright: 0xffcc40,
  hexRingAmberDim: 0x7a5000,
  hexRingAmberHot: 0xffe070,

  neonCyan: 0x00e5ff,
  neonCyanBright: 0x80f0ff,
  neonCyanDim: 0x004455,

  neonPink: 0xff0080,
  neonPinkDim: 0x660033,
  neonPinkBright: 0xff60b0,

  neonPurple: 0xb040ff,
  neonPurpleDim: 0x4a1a80,
  neonPurpleBright: 0xd080ff,

  beeGold: 0xffb300,
  beeGoldLight: 0xffd54f,
  beeGoldDark: 0xb37a00,
  beeGoldMetal: 0xdaa520,
  beeStripe: 0x1a1200,
  beeStripeDark: 0x0e0a00,
  beeWing: 0xccefff,
  beeWingGlow: 0x80d8ff,
  beeWingShine: 0xe0f8ff,
  beeEye: 0x00e5ff,
  beeEyeGlow: 0x40f0ff,

  coinGold: 0xffd740,
  coinGoldLight: 0xffecb3,
  coinAmber: 0xffab00,
  coinShine: 0xfff8e1,

  laserRed: 0xff1744,
  laserRedGlow: 0xff5252,
  laserRedBright: 0xff8a80,

  shieldGreen: 0x00e676,
  shieldGreenBright: 0x69f0ae,
  magnetBlue: 0x448aff,
  magnetBlueBright: 0x82b1ff,
  boostOrange: 0xff6d00,
  boostOrangeBright: 0xffab40,

  white: 0xffffff,
  black: 0x000000,

  hudBg: 0x0a0420,
  hudBorder: 0x2a1850,
};
