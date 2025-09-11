'use client';

import { useFlowCurrentUser } from '@onflow/react-sdk';
import Image from 'next/image';
import ChatInterface from '@/components/ChatInterface';

export default function Home() {
  const { user, authenticate, unauthenticate } = useFlowCurrentUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        {user?.loggedIn ? (
          // Authenticated view with chat interface
          <div className="h-[calc(100vh-4rem)]">
            {/* Header */}
            <header className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Image
                    src="/next.svg"
                    alt="AI Calendar Logo"
                    width={40}
                    height={40}
                    className="dark:invert"
                    priority
                  />
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                    AI Calendar
                  </h1>
                </div>
                <div className="flex items-center space-x-4 bg-gray-900 rounded-lg px-4 py-2 border border-gray-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-400">
                    {user.addr.slice(0, 6)}...{user.addr.slice(-4)}
                  </span>
                  <button
                    onClick={unauthenticate}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </header>

            {/* Chat Interface */}
            <ChatInterface className="h-[calc(100%-5rem)]" />
          </div>
        ) : (
          // Unauthenticated view - login screen
          <div>
            <header className="text-center mb-12 pt-16">
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

                <div className="mt-8 text-center text-gray-500 text-sm">
                  <p>Supported Wallets: Blocto • Lilico • Flow Wallet</p>
                  <p className="mt-2">
                    Network: {process.env.NEXT_PUBLIC_FLOW_NETWORK === 'mainnet' ? 'Flow Mainnet' : 'Flow Testnet'}
                  </p>
                </div>
              </div>
            </main>
          </div>
        )}
      </div>
    </div>
  );
}