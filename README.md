# GAMA Flip

A blockchain-based coin flip game running on the XDC network.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The production build will create a `dist` directory with optimized files ready for deployment. This includes minified JavaScript bundles, compressed assets, and an index.html file.

## Features

- Decentralized coin flip game on XDC blockchain
- Real-time game statistics and history
- Responsive design with Tailwind CSS
- Interactive animations with Framer Motion

## Environment Variables

Create a `.env` file in the root directory with these variables:

```
# XDC Mainnet
VITE_TOKEN_ADDRESS=<mainnet-token-contract-address>
VITE_Flip_ADDRESS=<mainnet-flip-contract-address>
VITE_XDC_MAINNET_RPC=https://erpc.xinfin.network

# XDC Testnet (Apothem)
VITE_APOTHEM_TOKEN_ADDRESS=<testnet-token-contract-address>
VITE_APOTHEM_Flip_ADDRESS=<testnet-flip-contract-address>
VITE_XDC_APOTHEM_RPC=https://erpc.apothem.network
```

## Development

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Analyze bundle
npm run analyze
```
