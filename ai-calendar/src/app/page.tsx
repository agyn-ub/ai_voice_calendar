'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import GoogleCalendarConnect from '@/components/GoogleCalendarConnect';
import CalendarAssistant from '@/components/CalendarAssistant';
import CalendarView from '@/components/CalendarView';
import { WalletService } from '@/lib/web3/wallet';

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [calendarUpdateTrigger, setCalendarUpdateTrigger] = useState(0);
  const [showWalletDetails, setShowWalletDetails] = useState(false);

  // Check if wallet is already connected on mount
  useEffect(() => {
    const checkWallet = async () => {
      const account = await WalletService.getAccount();
      if (account) {
        setWalletAddress(account);
      }
    };
    checkWallet();

    // Set up event listeners
    const cleanup = WalletService.setupEventListeners(
      (accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        } else {
          setWalletAddress(null);
        }
      },
      (chainId) => {
        console.log('Chain changed:', chainId);
      }
    );

    return cleanup;
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const account = await WalletService.connect();
      setWalletAddress(account);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet. Please make sure MetaMask is installed.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    WalletService.disconnect();
    setWalletAddress(null);
    setShowWalletDetails(false);
  };

  const handleCalendarUpdate = () => {
    setCalendarUpdateTrigger(prev => prev + 1);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
              {walletAddress ? (
                <>
                  <button
                    onClick={() => setShowWalletDetails(!showWalletDetails)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors"
                  >
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm font-mono text-gray-300">
                      {formatAddress(walletAddress)}
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
                    onClick={handleDisconnect}
                    className="px-3 py-1.5 text-sm bg-red-600/20 text-red-400 rounded-lg border border-red-600/30 hover:bg-red-600/30 transition-colors"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="px-4 py-1.5 text-sm bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                >
                  {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <main className="max-w-4xl mx-auto">
          {/* Collapsible Wallet Details */}
          {showWalletDetails && walletAddress && (
            <div className="mb-6 bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700 animate-in slide-in-from-top-2">
              <div className="space-y-4">
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <p className="text-xs text-gray-400 mb-1">Full Wallet Address</p>
                  <p className="text-sm font-mono text-green-400 break-all">
                    {walletAddress}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                    <p className="text-xs text-gray-400 mb-1">Network</p>
                    <p className="text-sm font-semibold">
                      Flow EVM Testnet
                    </p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                    <p className="text-xs text-gray-400 mb-1">Chain ID</p>
                    <p className="text-sm font-semibold text-green-400">
                      545
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Main Content Area */}
          {walletAddress ? (
            <div className="space-y-6">
              {/* Calendar Assistant - Primary Focus */}
              <div className="min-h-[600px]">
                <CalendarAssistant 
                  walletAddress={walletAddress} 
                  onCalendarUpdate={handleCalendarUpdate}
                />
              </div>
              
              {/* Calendar View - Visual Calendar Grid */}
              <div>
                <CalendarView 
                  walletAddress={walletAddress} 
                  refreshTrigger={calendarUpdateTrigger}
                />
              </div>
              
              {/* Google Calendar Integration - Settings */}
              <div>
                <GoogleCalendarConnect walletAddress={walletAddress} key={calendarUpdateTrigger} />
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
                    <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
                    <p className="text-gray-400">
                      Connect your MetaMask wallet to access your AI Calendar
                    </p>
                  </div>
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
                  </button>
                  <p className="text-xs text-gray-500">
                    Make sure you have MetaMask installed and are connected to Flow EVM Testnet
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}