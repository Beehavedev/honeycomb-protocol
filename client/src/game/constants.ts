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
  bg0: 0x020010,
  bg1: 0x050020,
  bg2: 0x0a0030,

  tunnelDark: 0x06010f,
  tunnelMid: 0x120828,
  tunnelDeep: 0x030008,
  tunnelFill: 0x0e0628,
  tunnelFillLight: 0x180c40,

  hexAmber: 0xf0a000,
  hexAmberHot: 0xffc840,
  hexAmberWhite: 0xfff0c0,
  hexAmberDim: 0x604000,
  hexAmberMid: 0xc08000,

  cyan: 0x00d4f0,
  cyanBright: 0x80f0ff,
  cyanDim: 0x004050,
  cyanWhite: 0xc0f8ff,

  pink: 0xff0080,
  pinkBright: 0xff80c0,
  pinkDim: 0x500030,

  purple: 0xa030f0,
  purpleBright: 0xd080ff,
  purpleDim: 0x300860,

  beeBody: 0xf0a800,
  beeBodyLight: 0xffd060,
  beeBodyDark: 0xa06800,
  beeBodyDeep: 0x704000,
  beeHighlight: 0xffe890,
  beeStripe1: 0x201400,
  beeStripe2: 0x100a00,
  beeFuzz: 0xd09020,
  beeEyeOuter: 0x001820,
  beeEyeIris: 0x00c8e0,
  beeEyeCore: 0x80f0ff,
  beeEyeWhite: 0xe0ffff,
  beeWingBase: 0xb0e0f0,
  beeWingSheen: 0xe0f8ff,
  beeWingEdge: 0x60c0e0,
  beeWingVein: 0x90d0e8,
  beeAntenna: 0xb07800,
  beeAntennaGlow: 0x00e0ff,

  coinBody: 0xffd030,
  coinLight: 0xffec90,
  coinEdge: 0xc09000,
  coinShine: 0xfffff0,
  coinGlow: 0xffa000,

  laserCore: 0xff1040,
  laserEdge: 0xff5070,
  laserGlow: 0xff0030,
  laserWhite: 0xffc0c0,

  shieldGreen: 0x00e676,
  shieldBright: 0x80ffb0,
  magnetBlue: 0x4488ff,
  magnetBright: 0x90b8ff,
  boostOrange: 0xff6000,
  boostBright: 0xffa040,

  white: 0xffffff,
  black: 0x000000,

  hudBg: 0x060018,
  hudBorder: 0x201050,
};
