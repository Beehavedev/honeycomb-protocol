// Contract addresses by chain ID
// Update these after deployment

export interface ContractAddresses {
  agentRegistry: `0x${string}`;
  bountyEscrow: `0x${string}`;
  postBond: `0x${string}`;
  reputation: `0x${string}`;
  feeVault: `0x${string}`;
  tokenFactory: `0x${string}`;
  bondingCurveMarket: `0x${string}`;
  migration: `0x${string}`;
  router: `0x${string}`;
  predictDuel: `0x${string}`;
}

export interface DexConfig {
  router: `0x${string}`;
  wbnb: `0x${string}`;
  lpLockAddress: `0x${string}`;
}

// Placeholder address for undeployed contracts
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  // Local Hardhat
  31337: {
    agentRegistry: ZERO_ADDRESS,
    bountyEscrow: ZERO_ADDRESS,
    postBond: ZERO_ADDRESS,
    reputation: ZERO_ADDRESS,
    feeVault: ZERO_ADDRESS,
    tokenFactory: ZERO_ADDRESS,
    bondingCurveMarket: ZERO_ADDRESS,
    migration: ZERO_ADDRESS,
    router: ZERO_ADDRESS,
    predictDuel: ZERO_ADDRESS,
  },
  // BSC Testnet - Deployed February 1, 2026 (v2 with router & no cooldown)
  97: {
    agentRegistry: "0x246e121A4df577046BaEdf87d5F68968bc24c52E",
    bountyEscrow: "0x4598C15E7CD17bc5660747810e0566666e00aB08",
    postBond: "0x8FC43B88650758a9bcf740Be9426076aA4607c40",
    reputation: "0xD421eeC4A3be2E825561E923eaa3BEfEf33ddf9C",
    feeVault: "0xafd910c08fC7CC810E3a6a788D3527AE3808262C",
    tokenFactory: "0xc48C7F4d8981a972646C843F6f3Ae77924F9fAD6",
    bondingCurveMarket: "0x8a425aBc8f023f64d875EC6CCcfd27cd7F571Bde",
    migration: "0x96e983999c0Ab80437560C281Eb35f6dFD8301ff",
    router: "0x0464386A91fCdd536eaDDF2fE8f621438355a5D6",
    predictDuel: ZERO_ADDRESS, // TODO: Deploy and update
  },
  // BSC Mainnet - Deployed February 1, 2026
  56: {
    agentRegistry: "0xbff21cBa7299E8A9C08dcc0B7CAD97D06767F651",
    bountyEscrow: "0xdA382b1D15134E0205dBD31992AC7593A227D283",
    postBond: "0xBBe5cC52575bC4db46a5129F60EC34ECED7CE7BB",
    reputation: "0x009701911479048de1CF792d15e287cE470505C2",
    feeVault: "0x5077Df490A68d4bA33208c9308739B17da6CcBb7",
    tokenFactory: "0x61fcCc3c52F537E9E5434aA472130b8C03500e10",
    bondingCurveMarket: "0x960518eC278b5a78bD1B5fC1b2E22abC5DB1A167",
    migration: "0xa95a5d8237A1932b315c50eFB92e3086EB8eAf01",
    router: "0x246e121A4df577046BaEdf87d5F68968bc24c52E",
    predictDuel: ZERO_ADDRESS, // TODO: Deploy and update
  },
  // opBNB Testnet
  5611: {
    agentRegistry: ZERO_ADDRESS,
    bountyEscrow: ZERO_ADDRESS,
    postBond: ZERO_ADDRESS,
    reputation: ZERO_ADDRESS,
    feeVault: ZERO_ADDRESS,
    tokenFactory: ZERO_ADDRESS,
    bondingCurveMarket: ZERO_ADDRESS,
    migration: ZERO_ADDRESS,
    router: ZERO_ADDRESS,
    predictDuel: ZERO_ADDRESS,
  },
  // opBNB Mainnet
  204: {
    agentRegistry: ZERO_ADDRESS,
    bountyEscrow: ZERO_ADDRESS,
    postBond: ZERO_ADDRESS,
    reputation: ZERO_ADDRESS,
    feeVault: ZERO_ADDRESS,
    tokenFactory: ZERO_ADDRESS,
    bondingCurveMarket: ZERO_ADDRESS,
    migration: ZERO_ADDRESS,
    router: ZERO_ADDRESS,
    predictDuel: ZERO_ADDRESS,
  },
};

// PancakeSwap V2 addresses by chain ID
export const DEX_CONFIG: Record<number, DexConfig> = {
  // BSC Mainnet
  56: {
    router: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    wbnb: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    lpLockAddress: ZERO_ADDRESS, // Update after LP lock contract deployment
  },
  // BSC Testnet
  97: {
    router: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
    wbnb: "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd",
    lpLockAddress: ZERO_ADDRESS,
  },
  // Local Hardhat (no DEX)
  31337: {
    router: ZERO_ADDRESS,
    wbnb: ZERO_ADDRESS,
    lpLockAddress: ZERO_ADDRESS,
  },
  // opBNB Testnet - PancakeSwap not officially supported
  5611: {
    router: ZERO_ADDRESS,
    wbnb: ZERO_ADDRESS,
    lpLockAddress: ZERO_ADDRESS,
  },
  // opBNB Mainnet - PancakeSwap not officially supported
  204: {
    router: ZERO_ADDRESS,
    wbnb: ZERO_ADDRESS,
    lpLockAddress: ZERO_ADDRESS,
  },
};

export function getContractAddresses(chainId: number): ContractAddresses | null {
  return CONTRACT_ADDRESSES[chainId] || null;
}

export function getDexConfig(chainId: number): DexConfig | null {
  return DEX_CONFIG[chainId] || null;
}
