'use client';

import { useFlowCurrentUser } from '@onflow/react-sdk';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import GoogleCalendarConnect from '@/components/GoogleCalendarConnect';
import CalendarAssistant from '@/components/CalendarAssistant';

export default function Home() {
  const { user, authenticate, unauthenticate } = useFlowCurrentUser();
  const [calendarUpdateTrigger, setCalendarUpdateTrigger] = useState(0);
  const [showWalletDetails, setShowWalletDetails] = useState(false);

  const handleCalendarUpdate = () => {
    setCalendarUpdateTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Compact Header */}
      <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <Image
                src="/next.svg"
                alt="AI Calendar Logo"
                width={32}
                height={32}
                className="dark:invert"
                priority
              />
              <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                AI Calendar
              </h1>
            </div>

            {/* Wallet Status */}
            <div className="flex items-center gap-3">
              {user?.loggedIn ? (
                <>
                  <button
                    onClick={() => setShowWalletDetails(!showWalletDetails)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors"
                  >
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm font-mono text-gray-300">
                      {user.addr?.slice(0, 6)}...{user.addr?.slice(-4)}
                    </span>
                    <svg 
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        showWalletDetails ? 'rotate-180' : ''
                      }`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={unauthenticate}
                    className="px-3 py-1.5 text-sm bg-red-600/20 text-red-400 rounded-lg border border-red-600/30 hover:bg-red-600/30 transition-colors"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={authenticate}
                  className="px-4 py-1.5 text-sm bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">

        <main className="max-w-4xl mx-auto">
          {/* Collapsible Wallet Details */}
          {showWalletDetails && user?.loggedIn && (
            <div className="mb-6 bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700 animate-in slide-in-from-top-2">
              <div className="space-y-4">
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <p className="text-xs text-gray-400 mb-1">Full Wallet Address</p>
                  <p className="text-sm font-mono text-green-400 break-all">
                    {user.addr}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                    <p className="text-xs text-gray-400 mb-1">Network</p>
                    <p className="text-sm font-semibold">
                      {process.env.NEXT_PUBLIC_FLOW_NETWORK === 'mainnet' ? 'Mainnet' : 'Testnet'}
                    </p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                    <p className="text-xs text-gray-400 mb-1">Status</p>
                    <p className="text-sm font-semibold text-green-400">
                      Connected
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Main Content Area */}
          {user?.loggedIn ? (
            <div className="space-y-6">
              {/* Calendar Assistant - Primary Focus */}
              <div className="min-h-[600px]">
                <CalendarAssistant 
                  walletAddress={user.addr!} 
                  onCalendarUpdate={handleCalendarUpdate}
                />
              </div>
              
              {/* Google Calendar Integration - Secondary */}
              <div>
                <GoogleCalendarConnect walletAddress={user.addr!} key={calendarUpdateTrigger} />
              </div>
            </div>
          ) : (
            /* Wallet Connection Prompt - Centered */
            <div className="flex items-center justify-center min-h-[500px]">
              <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700 max-w-md w-full">
                <div className="text-center space-y-6">
                  <svg
                    className="w-16 h-16 mx-auto text-gray-600"
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
                  <div>
                    <p className="text-lg font-semibold mb-2">Connect Your Wallet</p>
                    <p className="text-sm text-gray-400">Connect your Flow wallet to start using AI Calendar</p>
                  </div>
                  <button
                    onClick={authenticate}
                    className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
                  >
                    Connect Flow Wallet
                  </button>
                  <div className="grid grid-cols-3 gap-3 pt-4">
                    <div className="text-center">
                      <div className="text-xl mb-1">🔐</div>
                      <p className="text-xs text-gray-400">Secure</p>
                    </div>
                    <div className="text-center">
                      <div className="text-xl mb-1">⚡</div>
                      <p className="text-xs text-gray-400">Fast</p>
                    </div>
                    <div className="text-center">
                      <div className="text-xl mb-1">🌐</div>
                      <p className="text-xs text-gray-400">Decentralized</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="mt-12 text-center text-gray-500 text-xs">
            <p>Supported: Blocto • Lilico • Flow Wallet | {process.env.NEXT_PUBLIC_FLOW_NETWORK === 'mainnet' ? 'Mainnet' : 'Testnet'}</p>
          </div>
        </main>
      </div>
    </div>
  );
}