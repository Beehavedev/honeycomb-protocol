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
  bg: 0x0a0a1a,
  bgGrad1: 0x0d0d2b,
  bgGrad2: 0x1a0a2e,
  lane: 0xf59e0b,
  laneGlow: 0xfbbf24,
  runner: 0xf59e0b,
  runnerGlow: 0xfcd34d,
  obstacle: 0xef4444,
  obstacleGlow: 0xff6b6b,
  coin: 0xfbbf24,
  coinGlow: 0xfde68a,
  hex: 0x1e1b4b,
  hexLine: 0x4c1d95,
  magnet: 0x3b82f6,
  shield: 0x22c55e,
  boost: 0xf97316,
  white: 0xffffff,
  darkBg: 0x050510,
};
