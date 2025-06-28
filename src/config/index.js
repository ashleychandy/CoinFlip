/**
 * Application configuration
 * Centralizes environment variables and other config
 */

// Network configuration
export const NETWORK_CONFIG = {
  mainnet: {
    rpcUrl:
      import.meta.env.VITE_XDC_MAINNET_RPC || 'https://erpc.xinfin.network',
    chainId: 50,
    name: 'XDC Mainnet',
    contracts: {
      // Use environment variables for contract addresses
      token: import.meta.env.VITE_TOKEN_ADDRESS || '',
      CoinFlip: import.meta.env.VITE_CoinFlip_ADDRESS || '',
    },
    explorer: 'https://xdcscan.com/',
  },
  apothem: {
    rpcUrl:
      import.meta.env.VITE_XDC_APOTHEM_RPC || 'https://erpc.apothem.network',
    chainId: 51,
    name: 'XDC Apothem Testnet',
    contracts: {
      // Use environment variables for contract addresses
      token: import.meta.env.VITE_APOTHEM_TOKEN_ADDRESS || '',
      CoinFlip: import.meta.env.VITE_APOTHEM_CoinFlip_ADDRESS || '',
    },
    explorer: 'https://testnet.xdcscan.com/',
  },
};

// Supported networks
export const SUPPORTED_CHAIN_IDS = Object.values(NETWORK_CONFIG).map(
  network => network.chainId
);

// Default network
export const DEFAULT_NETWORK = 'mainnet';
