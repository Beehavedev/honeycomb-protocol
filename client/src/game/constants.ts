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
  tunnelDark: 0x0c0418,
  tunnelMid: 0x1a0a30,
  tunnelLight: 0x2a1248,
  tunnelWall: 0x1e0e38,

  hexRingAmber: 0xf5a000,
  hexRingAmberBright: 0xffbe30,
  hexRingAmberDim: 0x7a5000,

  neonCyan: 0x00e5ff,
  neonCyanBright: 0x60f0ff,
  neonCyanDim: 0x005566,

  neonPink: 0xff0080,
  neonPinkDim: 0x660033,

  neonPurple: 0xb040ff,
  neonPurpleDim: 0x4a1a80,

  beeGold: 0xffb300,
  beeGoldLight: 0xffd54f,
  beeGoldDark: 0xb37a00,
  beeStripe: 0x1a1200,
  beeWing: 0xccefff,
  beeWingGlow: 0x80d8ff,
  beeEye: 0x00e5ff,

  coinGold: 0xffd740,
  coinGoldLight: 0xffecb3,
  coinAmber: 0xffab00,

  laserRed: 0xff1744,
  laserRedGlow: 0xff5252,

  shieldGreen: 0x00e676,
  magnetBlue: 0x448aff,
  boostOrange: 0xff6d00,

  white: 0xffffff,
  black: 0x000000,
};
