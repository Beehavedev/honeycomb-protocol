export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 700;

export const LANE_COUNT = 3;
export const LANE_WIDTH = 100;
export const LANE_POSITIONS = [-LANE_WIDTH, 0, LANE_WIDTH];

export const RUNNER_Y = 520;
export const GROUND_Y = 580;

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

export const COLORS = {
  bg: 0x03060f,
  bgGrad1: 0x050a18,
  bgGrad2: 0x0a0520,
  lane: 0x00e5ff,
  laneGlow: 0x00ffff,
  laneDim: 0x006680,
  runner: 0xffb300,
  runnerGlow: 0xffd54f,
  runnerDark: 0xcc8800,
  obstacle: 0xff1744,
  obstacleGlow: 0xff5252,
  obstacleLaser: 0xff0040,
  coin: 0xffd740,
  coinGlow: 0xffecb3,
  hex: 0x0d1b3e,
  hexLine: 0x00bcd4,
  hexLineDim: 0x004d5e,
  magnet: 0x448aff,
  shield: 0x00e676,
  boost: 0xff6d00,
  white: 0xffffff,
  darkBg: 0x020408,
  neonPink: 0xff0080,
  neonBlue: 0x00e5ff,
  neonPurple: 0xb040ff,
  gridLine: 0x0a3060,
  wingGlow: 0xffe082,
  beeBody: 0xffb300,
  beeStripe: 0x1a1a1a,
  beeWing: 0xffffff,
};
