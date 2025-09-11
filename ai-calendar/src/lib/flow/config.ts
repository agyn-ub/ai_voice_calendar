// Flow configuration for testnet
// The @onflow/react-sdk handles FCL configuration internally
// We'll pass these values through environment variables

export const flowConfig = {
  network: process.env.NEXT_PUBLIC_FLOW_NETWORK || 'testnet',
  accessNodeApi: process.env.NEXT_PUBLIC_ACCESS_NODE_API || 'https://rest-testnet.onflow.org',
  walletDiscovery: process.env.NEXT_PUBLIC_WALLET_DISCOVERY || 'https://fcl-discovery.onflow.org/testnet/authn',
  appIdentifier: process.env.NEXT_PUBLIC_APP_IDENTIFIER || 'ai-calendar-app',
};

// Contract addresses for testnet
export const contractAddresses = {
  FungibleToken: '0x9a0766d93b6608b7',
  FlowToken: '0x7e60df042a9c0868',
  FUSD: '0xe223d8a629e49c68',
};

export default flowConfig;