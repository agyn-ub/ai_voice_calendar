'use client';

import { useState, useEffect } from 'react';

interface GoogleSignInButtonProps {
  onSignIn?: () => void;
  className?: string;
}

interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
  scope?: string;
}

export default function GoogleSignInButton({ onSignIn, className = '' }: GoogleSignInButtonProps) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [scopeType, setScopeType] = useState<'read' | 'write'>('read');

  useEffect(() => {
    // Check if user is already signed in
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    const userCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('google_user='));
    
    if (userCookie) {
      try {
        const userData = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
        setUser(userData);
        // Check if user has write scope
        if (userData.scope?.includes('calendar.events') && !userData.scope?.includes('readonly')) {
          setScopeType('write');
        }
      } catch (error) {
        console.error('Error parsing user cookie:', error);
      }
    }
  };

  const handleSignIn = () => {
    setLoading(true);
    // Redirect to Google OAuth
    window.location.href = `/api/auth/google?scope=${scopeType}`;
  };

  const handleSignOut = () => {
    // Clear cookies
    document.cookie = 'google_access_token=; Max-Age=0; path=/';
    document.cookie = 'google_refresh_token=; Max-Age=0; path=/';
    document.cookie = 'google_user=; Max-Age=0; path=/';
    setUser(null);
    window.location.reload();
  };

  const handleUpgradePermissions = () => {
    setLoading(true);
    // Request write permissions
    window.location.href = '/api/auth/google?scope=write';
  };

  if (user) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        <div className="flex items-center space-x-3">
          {user.picture && (
            <img 
              src={user.picture} 
              alt={user.name} 
              className="w-8 h-8 rounded-full"
            />
          )}
          <div>
            <p className="text-sm font-medium text-gray-200">{user.name}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {!user.scope?.includes('calendar.events') || user.scope?.includes('readonly') ? (
            <button
              onClick={handleUpgradePermissions}
              disabled={loading}
              className="px-3 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors"
            >
              Upgrade to Write Access
            </button>
          ) : (
            <span className="px-2 py-1 text-xs bg-green-900 text-green-300 rounded-md">
              Full Access
            </span>
          )}
          
          <button
            onClick={handleSignOut}
            className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      <div className="flex items-center space-x-2">
        <label className="text-sm text-gray-300">
          Permission Level:
        </label>
        <select
          value={scopeType}
          onChange={(e) => setScopeType(e.target.value as 'read' | 'write')}
          className="px-2 py-1 text-sm bg-gray-800 text-white rounded-md border border-gray-700 focus:border-blue-500 focus:outline-none"
          disabled={loading}
        >
          <option value="read">Read Only</option>
          <option value="write">Read & Write</option>
        </select>
      </div>
      
      <button
        onClick={handleSignIn}
        disabled={loading}
        className="flex items-center space-x-2 px-4 py-2 bg-white hover:bg-gray-100 text-gray-800 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span>{loading ? 'Connecting...' : 'Connect Google Calendar'}</span>
      </button>
    </div>
  );
}