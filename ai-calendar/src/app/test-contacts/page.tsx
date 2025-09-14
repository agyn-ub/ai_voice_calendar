'use client';

import { useState, useEffect } from 'react';
import { useFlowCurrentUser } from '@onflow/react-sdk';

interface ContactMatch {
  name: string;
  email: string;
  confidence: 'exact' | 'high' | 'medium' | 'low';
}

interface TestResult {
  success: boolean;
  searchQuery: string;
  matches: ContactMatch[];
  bestMatch: { email: string; displayName: string } | null;
  totalMatches: number;
  error?: string;
  needsReconnect?: boolean;
}

export default function TestContactsPage() {
  const { user } = useFlowCurrentUser();
  const addr = user?.addr;
  const [searchName, setSearchName] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'not_connected'>('checking');
  
  // Test event creation
  const [eventTitle, setEventTitle] = useState('Test Meeting');
  const [attendees, setAttendees] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('14:00');
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [eventResult, setEventResult] = useState<any>(null);

  useEffect(() => {
    checkConnection();
  }, [addr]);

  const checkConnection = async () => {
    if (!addr) {
      setConnectionStatus('not_connected');
      return;
    }

    try {
      const response = await fetch(`/api/calendar/status?wallet_address=${addr}`);
      const data = await response.json();
      setConnectionStatus(data.connected ? 'connected' : 'not_connected');
    } catch (error) {
      setConnectionStatus('not_connected');
    }
  };

  const searchContacts = async () => {
    if (!addr || !searchName) return;

    setLoading(true);
    setTestResult(null);

    try {
      const response = await fetch(
        `/api/calendar/google/contacts/test?wallet_address=${addr}&name=${encodeURIComponent(searchName)}`
      );
      const data = await response.json();

      if (!response.ok) {
        setTestResult({
          success: false,
          searchQuery: searchName,
          matches: [],
          bestMatch: null,
          totalMatches: 0,
          error: data.error,
          needsReconnect: data.needsReconnect
        });
      } else {
        setTestResult(data);
      }
    } catch (error) {
      setTestResult({
        success: false,
        searchQuery: searchName,
        matches: [],
        bestMatch: null,
        totalMatches: 0,
        error: 'Failed to search contacts'
      });
    } finally {
      setLoading(false);
    }
  };

  const testEventCreation = async () => {
    if (!addr || !eventTitle || !attendees) return;

    setCreatingEvent(true);
    setEventResult(null);

    try {
      // Parse attendees (comma-separated)
      const attendeeList = attendees.split(',').map(a => a.trim()).filter(a => a);
      
      // Use the assistant API to create the event
      const response = await fetch('/api/assistant/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: addr,
          message: `Create an event titled "${eventTitle}" ${eventDate ? `on ${eventDate}` : 'today'} at ${eventTime} with ${attendeeList.join(', ')}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
      });

      const data = await response.json();
      setEventResult(data);
    } catch (error) {
      setEventResult({ error: 'Failed to create event' });
    } finally {
      setCreatingEvent(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'exact': return 'text-green-400';
      case 'high': return 'text-blue-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const getConfidenceEmoji = (confidence: string) => {
    switch (confidence) {
      case 'exact': return '✅';
      case 'high': return '👍';
      case 'medium': return '🤔';
      case 'low': return '⚠️';
      default: return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test Contact Invitations</h1>

        {/* Connection Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          {connectionStatus === 'checking' && (
            <p className="text-gray-400">Checking connection...</p>
          )}
          {connectionStatus === 'connected' && (
            <div className="flex items-center gap-2 text-green-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Google Calendar Connected (Wallet: {addr})</span>
            </div>
          )}
          {connectionStatus === 'not_connected' && (
            <div className="text-red-400">
              <p>⚠️ Google Calendar not connected</p>
              <p className="text-sm mt-2 text-gray-400">
                Please connect your Google Calendar first to test contact invitations
              </p>
            </div>
          )}
        </div>

        {/* Contact Search Test */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">1. Test Contact Search</h2>
          <p className="text-gray-400 mb-4">
            Search for a contact by name to see if they can be found in your Google Contacts
          </p>
          
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Enter contact name (e.g., 'Tom', 'John Smith')"
              className="flex-1 px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && searchContacts()}
            />
            <button
              onClick={searchContacts}
              disabled={!addr || !searchName || loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Searching...' : 'Search Contacts'}
            </button>
          </div>

          {/* Search Results */}
          {testResult && (
            <div className="mt-6 space-y-4">
              {testResult.error ? (
                <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
                  <p className="text-red-400 font-semibold">Error:</p>
                  <p className="text-red-300">{testResult.error}</p>
                  {testResult.needsReconnect && (
                    <p className="text-yellow-400 mt-2">
                      💡 You need to disconnect and reconnect your Google Calendar to grant contacts permission
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-2">Search Query: "{testResult.searchQuery}"</p>
                    <p className="text-sm text-gray-400">Total Matches: {testResult.totalMatches}</p>
                  </div>

                  {testResult.bestMatch && (
                    <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
                      <p className="text-green-400 font-semibold mb-2">Best Match:</p>
                      <p className="text-gray-200">{testResult.bestMatch.displayName}</p>
                      <p className="text-gray-400">{testResult.bestMatch.email}</p>
                    </div>
                  )}

                  {testResult.matches.length > 0 && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <p className="font-semibold mb-3">All Matches:</p>
                      <div className="space-y-2">
                        {testResult.matches.map((match, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                            <div>
                              <p className="font-medium">{match.name}</p>
                              <p className="text-sm text-gray-400">{match.email}</p>
                            </div>
                            <div className={`flex items-center gap-2 ${getConfidenceColor(match.confidence)}`}>
                              <span>{getConfidenceEmoji(match.confidence)}</span>
                              <span className="text-sm">{match.confidence}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {testResult.matches.length === 0 && (
                    <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
                      <p className="text-yellow-400">No contacts found for "{testResult.searchQuery}"</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Event Creation Test */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">2. Test Event Creation with Contacts</h2>
          <p className="text-gray-400 mb-4">
            Create a test event with contact names or email addresses
          </p>

          <div className="space-y-4 mb-6">
            <input
              type="text"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="Event title"
              className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <input
              type="text"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              placeholder="Attendees (comma-separated names or emails, e.g., 'Tom, sarah@example.com, John Smith')"
              className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex gap-4">
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={testEventCreation}
            disabled={!addr || !eventTitle || !attendees || creatingEvent}
            className="w-full px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {creatingEvent ? 'Creating Event...' : 'Create Test Event'}
          </button>

          {/* Event Creation Result */}
          {eventResult && (
            <div className="mt-6">
              {eventResult.error ? (
                <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
                  <p className="text-red-400 font-semibold">Error:</p>
                  <p className="text-red-300">{eventResult.error}</p>
                </div>
              ) : (
                <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
                  <p className="text-green-400 font-semibold mb-2">Event Created Successfully!</p>
                  <p className="text-gray-200 mb-2">{eventResult.message}</p>
                  {eventResult.actions_taken && eventResult.actions_taken.length > 0 && (
                    <div className="mt-3 p-3 bg-gray-700 rounded">
                      <p className="text-sm font-semibold mb-2">Actions Taken:</p>
                      {eventResult.actions_taken.map((action: any, index: number) => (
                        <div key={index} className="text-sm text-gray-300">
                          • {action.type}: {action.status}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-900/20 border border-blue-600 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-400">How to Test:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>First, make sure your Google Calendar is connected with contacts permission</li>
            <li>Search for a contact name that exists in your Google Contacts</li>
            <li>Check if the contact is found with the correct email address</li>
            <li>Create a test event using contact names (not emails) in the attendees field</li>
            <li>Check your Google Calendar to verify the event was created with the correct attendees</li>
            <li>The invited contacts should receive calendar invitations via email</li>
          </ol>
        </div>
      </div>
    </div>
  );
}