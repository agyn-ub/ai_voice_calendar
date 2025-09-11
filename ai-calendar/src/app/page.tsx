'use client';

import { useFlowCurrentUser } from '@onflow/react-sdk';
import Image from 'next/image';

export default function Home() {
  const { user, authenticate, unauthenticate } = useFlowCurrentUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse bg-green-500 blur-xl opacity-50"></div>
              <Image
                src="/next.svg"
                alt="AI Calendar Logo"
                width={120}
                height={120}
                className="relative dark:invert"
                priority
              />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            AI Calendar
          </h1>
          <p className="text-xl text-gray-300">
            Powered by Flow Blockchain
          </p>
        </header>

        <main className="max-w-2xl mx-auto">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-6 text-center">
              Wallet Connection
            </h2>

            {user?.loggedIn ? (
              <div className="space-y-6">
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <p className="text-sm text-gray-400 mb-2">Connected Wallet</p>
                  <p className="text-lg font-mono text-green-400 break-all">
                    {user.addr}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <p className="text-sm text-gray-400 mb-1">Network</p>
                    <p className="text-lg font-semibold">
                      {process.env.NEXT_PUBLIC_FLOW_NETWORK === 'mainnet' ? 'Mainnet' : 'Testnet'}
                    </p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <p className="text-sm text-gray-400 mb-1">Status</p>
                    <p className="text-lg font-semibold text-green-400">
                      Connected
                    </p>
                  </div>
                </div>

                <button
                  onClick={unauthenticate}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                >
                  Disconnect Wallet
                </button>

                <div className="mt-8 p-4 bg-blue-900/30 rounded-lg border border-blue-700/50">
                  <p className="text-sm text-blue-300">
                    🎉 Successfully connected to Flow blockchain! You can now interact with smart contracts and dApps.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center text-gray-400 py-8">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <p className="mb-2">No wallet connected</p>
                  <p className="text-sm">Connect your Flow wallet to get started</p>
                </div>

                <button
                  onClick={authenticate}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                >
                  Connect Flow Wallet
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                  <div className="text-center p-4 bg-gray-900 rounded-lg border border-gray-700">
                    <div className="text-2xl mb-2">🔐</div>
                    <p className="text-sm text-gray-400">Secure</p>
                  </div>
                  <div className="text-center p-4 bg-gray-900 rounded-lg border border-gray-700">
                    <div className="text-2xl mb-2">⚡</div>
                    <p className="text-sm text-gray-400">Fast</p>
                  </div>
                  <div className="text-center p-4 bg-gray-900 rounded-lg border border-gray-700">
                    <div className="text-2xl mb-2">🌐</div>
                    <p className="text-sm text-gray-400">Decentralized</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 text-center text-gray-500 text-sm">
            <p>Supported Wallets: Blocto • Lilico • Flow Wallet</p>
            <p className="mt-2">
              Network: {process.env.NEXT_PUBLIC_FLOW_NETWORK === 'mainnet' ? 'Flow Mainnet' : 'Flow Testnet'}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}