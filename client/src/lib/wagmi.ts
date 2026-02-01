import { createConfig, http } from 'wagmi';
import { bsc, bscTestnet } from 'wagmi/chains';
import { injected, metaMask, coinbaseWallet, walletConnect } from 'wagmi/connectors';

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

// Build connectors array - only include WalletConnect if project ID is set
const connectors = [
  metaMask({
    dappMetadata: {
      name: 'Honeycomb',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://honeycomb.app',
    },
  }),
  coinbaseWallet({
    appName: 'Honeycomb',
    appLogoUrl: 'https://honeycomb.app/icon.png',
  }),
  injected({
    shimDisconnect: true,
  }),
  ...(walletConnectProjectId ? [
    walletConnect({
      projectId: walletConnectProjectId,
      metadata: {
        name: 'Honeycomb',
        description: 'Decentralized social platform for BNB Chain',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://honeycomb.app',
        icons: ['https://honeycomb.app/icon.png'],
      },
      showQrModal: true,
    }),
  ] : []),
];

export const config = createConfig({
  chains: [bscTestnet, bsc, opBNBTestnet, opBNBMainnet, localHardhat],
  connectors,
  transports: {
    [bsc.id]: http(),
    [bscTestnet.id]: http(),
    [opBNBTestnet.id]: http(),
    [opBNBMainnet.id]: http(),
    [localHardhat.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
