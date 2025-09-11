'use client';

import { FlowProvider as FlowSDKProvider } from '@onflow/react-sdk';
import { ReactNode } from 'react';

interface FlowProviderProps {
  children: ReactNode;
}

export default function FlowProvider({ children }: FlowProviderProps) {
  // Configuration for Flow SDK based on the FlowConfig type
  const config = {
    accessNodeUrl: process.env.NEXT_PUBLIC_ACCESS_NODE_API || 'https://rest-testnet.onflow.org',
    flowNetwork: (process.env.NEXT_PUBLIC_FLOW_NETWORK || 'testnet') as 'testnet' | 'mainnet',
    discoveryWallet: process.env.NEXT_PUBLIC_WALLET_DISCOVERY || 'https://fcl-discovery.onflow.org/testnet/authn',
    appDetailTitle: 'AI Calendar',
    appDetailIcon: 'https://placekitten.com/g/200/200',
    appDetailDescription: 'AI Calendar powered by Flow Blockchain',
    appDetailUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    walletconnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || undefined,
  };
  
  return (
    <FlowSDKProvider config={config}>
      {children}
    </FlowSDKProvider>
  );
}