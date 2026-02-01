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
  },
  // BSC Testnet
  97: {
    agentRegistry: ZERO_ADDRESS,
    bountyEscrow: ZERO_ADDRESS,
    postBond: ZERO_ADDRESS,
    reputation: ZERO_ADDRESS,
    feeVault: ZERO_ADDRESS,
    tokenFactory: ZERO_ADDRESS,
    bondingCurveMarket: ZERO_ADDRESS,
    migration: ZERO_ADDRESS,
  },
  // BSC Mainnet
  56: {
    agentRegistry: ZERO_ADDRESS,
    bountyEscrow: ZERO_ADDRESS,
    postBond: ZERO_ADDRESS,
    reputation: ZERO_ADDRESS,
    feeVault: ZERO_ADDRESS,
    tokenFactory: ZERO_ADDRESS,
    bondingCurveMarket: ZERO_ADDRESS,
    migration: ZERO_ADDRESS,
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
