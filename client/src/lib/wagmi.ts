import { createConfig, http } from 'wagmi';
import { walletConnect, injected } from 'wagmi/connectors';
import { type Chain } from 'viem';

// Custom BSC Testnet with official RPC
const bscTestnet: Chain = {
  id: 97,
  name: 'BNB Smart Chain Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'BNB',
    symbol: 'tBNB',
  },
  rpcUrls: {
    default: { http: ['https://bsc-testnet-rpc.publicnode.com'] },
  },
  blockExplorers: {
    default: { name: 'BscScan', url: 'https://testnet.bscscan.com' },
  },
  testnet: true,
};

// Custom BSC Mainnet with official RPC
const bsc: Chain = {
  id: 56,
  name: 'BNB Smart Chain',
  nativeCurrency: {
    decimals: 18,
    name: 'BNB',
    symbol: 'BNB',
  },
  rpcUrls: {
    default: { http: ['https://bsc-rpc.publicnode.com'] },
  },
  blockExplorers: {
    default: { name: 'BscScan', url: 'https://bscscan.com' },
  },
};

// Export chains for use in other components
export { bsc, bscTestnet };

// WalletConnect project ID - get yours at https://cloud.walletconnect.com
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

// Local hardhat chain for development
const localHardhat = {
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] },
  },
} as const;

// opBNB chains
const opBNBTestnet = {
  id: 5611,
  name: 'opBNB Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'BNB',
    symbol: 'tBNB',
  },
  rpcUrls: {
    default: { http: ['https://opbnb-testnet-rpc.bnbchain.org'] },
    public: { http: ['https://opbnb-testnet-rpc.bnbchain.org'] },
  },
  blockExplorers: {
    default: { name: 'opBNBScan', url: 'https://opbnb-testnet.bscscan.com' },
  },
} as const;

const opBNBMainnet = {
  id: 204,
  name: 'opBNB Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'BNB',
    symbol: 'BNB',
  },
  rpcUrls: {
    default: { http: ['https://opbnb-mainnet-rpc.bnbchain.org'] },
    public: { http: ['https://opbnb-mainnet-rpc.bnbchain.org'] },
  },
  blockExplorers: {
    default: { name: 'opBNBScan', url: 'https://opbnb.bscscan.com' },
  },
} as const;

// Build connectors array - simplified for reliability
const connectors = walletConnectProjectId ? [
  walletConnect({
    projectId: walletConnectProjectId,
    metadata: {
      name: 'The Hatchery',
      description: 'Token launchpad on BNB Chain with bonding curve pricing',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://thehatchery.app',
      icons: ['https://thehatchery.app/icon.png'],
    },
    showQrModal: true,
  }),
  injected({
    shimDisconnect: true,
  }),
] : [
  injected({
    shimDisconnect: true,
  }),
];

export const config = createConfig({
  chains: [bsc],
  connectors,
  transports: {
    [bsc.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
