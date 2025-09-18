"use client";

import { useFlow } from "./FlowProvider";

export function FlowWalletAuth() {
  const { user, loading, logIn, logOut } = useFlow();

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-600">Connecting to Flow...</span>
      </div>
    );
  }

  if (user?.loggedIn) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-green-700">
            {user.addr?.slice(0, 6)}...{user.addr?.slice(-4)}
          </span>
        </div>
        <button
          onClick={logOut}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={logIn}
      className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
    >
      Connect Flow Wallet
    </button>
  );
}