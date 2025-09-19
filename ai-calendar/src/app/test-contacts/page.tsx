'use client';

import { useState, useEffect } from 'react';
import { useFlow } from '@/components/FlowProvider';

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

interface SimpleContact {
  email: string;
  name: string | null;
  messageCount: number;
  lastSeen: string;
}

export default function TestContactsPage() {
  const { user } = useFlow();
  const addr = user?.addr || null;
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
  
  // List contacts
  const [myContacts, setMyContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  
  // Create contact
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [creatingContact, setCreatingContact] = useState(false);
  const [createContactResult, setCreateContactResult] = useState<any>(null);

  // Gmail sync
  const [extractedContacts, setExtractedContacts] = useState<SimpleContact[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'syncing' | 'done'>('idle');
  const [syncResult, setSyncResult] = useState<any>(null);
  const [showExtractedContacts, setShowExtractedContacts] = useState(false);

  useEffect(() => {
    if (addr) {
      checkConnection();
      loadStoredContacts();
    }
  }, [addr]);

  const syncGmailContacts = async () => {
    if (!addr) return;

    setSyncStatus('syncing');
    setSyncResult(null);

    try {
      const response = await fetch('/api/calendar/google/sync-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: addr,
          action: 'sync',
          maxResults: 2000
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setSyncResult({ success: false, error: data.error || 'Failed to sync contacts' });
      } else {
        setSyncResult({ success: true, ...data });
        // Fetch the stored contacts after sync
        await loadStoredContacts();
      }
    } catch (error) {
      setSyncResult({ success: false, error: 'Failed to sync Gmail contacts' });
    } finally {
      setSyncStatus('done');
    }
  };

  const loadStoredContacts = async () => {
    if (!addr) return;

    setSyncStatus('loading');
    try {
      const response = await fetch(
        `/api/calendar/google/sync-contacts?wallet_address=${addr}`
      );
      const data = await response.json();

      if (data.success && data.contacts) {
        setExtractedContacts(data.contacts);
        setShowExtractedContacts(true);
      }
    } catch (error) {
      console.error('Failed to load stored contacts:', error);
    } finally {
      setSyncStatus('idle');
    }
  };

  const clearStoredContacts = async () => {
    if (!addr) return;

    try {
      const response = await fetch('/api/calendar/google/sync-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: addr,
          action: 'clear'
        })
      });

      const data = await response.json();

      if (data.success) {
        setExtractedContacts([]);
        setSyncResult({ success: true, message: 'Contacts cleared' });
      }
    } catch (error) {
      console.error('Failed to clear contacts:', error);
    }
  };

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

  const createContact = async () => {
    if (!addr || !newContactName || !newContactEmail) return;

    setCreatingContact(true);
    setCreateContactResult(null);

    try {
      const response = await fetch('/api/calendar/google/contacts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: addr,
          name: newContactName,
          email: newContactEmail,
          phone: newContactPhone || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setCreateContactResult({ success: false, error: data.error, needsReconnect: data.needsReconnect });
      } else {
        setCreateContactResult({ success: true, ...data });
        // Clear form on success
        setNewContactName('');
        setNewContactEmail('');
        setNewContactPhone('');
        // Optionally refresh contacts list
        if (showContacts) {
          fetchMyContacts();
        }
      }
    } catch (error) {
      setCreateContactResult({ success: false, error: 'Failed to create contact' });
    } finally {
      setCreatingContact(false);
    }
  };

  const fetchMyContacts = async () => {
    if (!addr) return;

    setLoadingContacts(true);
    setMyContacts([]);

    try {
      const response = await fetch(
        `/api/calendar/google/contacts/list?wallet_address=${addr}&page_size=100`
      );
      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to fetch contacts:', data.error);
      } else {
        setMyContacts(data.contacts || []);
        setShowContacts(true);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setMyContacts([]);
    } finally {
      setLoadingContacts(false);
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

  // Show connect wallet message if not connected
  if (!addr) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Test Contact Invitations</h1>
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-yellow-400">Flow Wallet Not Connected</h2>
            <p className="text-gray-400 mb-4">
              Please connect your Flow wallet first to test contact invitations.
            </p>
            <p className="text-sm text-gray-500">
              Go back to the main page and connect your Flow wallet (Lilico or Blocto).
            </p>
          </div>
        </div>
      </div>
    );
  }

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
              <span>Google Calendar Connected (Flow: {addr?.slice(0, 6)}...{addr?.slice(-4)})</span>
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

        {/* Gmail Contact Extraction Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-purple-400">Gmail Contact Sync</h2>
              <p className="text-gray-400 text-sm mt-1">Extract email addresses from Gmail and store locally (like Attio)</p>
            </div>
            <button
              onClick={() => setShowExtractedContacts(!showExtractedContacts)}
              className="text-sm text-gray-400 hover:text-gray-300"
            >
              {showExtractedContacts ? 'Hide' : 'Show'} Extracted
            </button>
          </div>

          <div className="flex gap-3 mb-4">
            <button
              onClick={syncGmailContacts}
              disabled={!addr || syncStatus === 'syncing' || syncStatus === 'loading'}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {syncStatus === 'syncing' ? 'Syncing from Gmail...' : 'Sync Contacts from Gmail'}
            </button>

            {extractedContacts.length > 0 && (
              <button
                onClick={clearStoredContacts}
                disabled={syncStatus === 'syncing' || syncStatus === 'loading'}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Clear Stored Contacts
              </button>
            )}
          </div>

          {/* Sync Result */}
          {syncResult && (
            <div className={`mb-4 p-4 rounded-lg ${
              syncResult.success
                ? 'bg-green-900/20 border border-green-600'
                : 'bg-red-900/20 border border-red-600'
            }`}>
              {syncResult.success ? (
                <>
                  {syncResult.action === 'extract' && (
                    <>
                      <p className="text-green-400 font-semibold">✅ Extracted {syncResult.totalExtracted} contacts from Gmail</p>
                      <p className="text-gray-300 text-sm mt-1">
                        These are email addresses found in your Gmail headers (From/To/Cc/Bcc)
                      </p>
                    </>
                  )}
                  {syncResult.action === 'sync' && syncResult.summary && (
                    <>
                      <p className="text-green-400 font-semibold">✅ Sync Complete!</p>
                      <div className="text-gray-300 text-sm mt-2">
                        <p>• Total contacts found: {syncResult.summary.totalContacts}</p>
                        <p>• With names: {syncResult.summary.withNames}</p>
                        <p>• Without names: {syncResult.summary.withoutNames}</p>
                      </div>
                      <p className="text-gray-400 text-xs mt-2">
                        Contacts are now stored locally for use with calendar invites
                      </p>
                    </>
                  )}
                  {syncResult.summary && (
                    <div className="text-gray-300 text-sm mt-2">
                      <p>• Total: {syncResult.summary.totalContacts} contacts</p>
                      <p>• With names: {syncResult.summary.withNames}</p>
                      <p>• Email only: {syncResult.summary.withoutNames}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-red-400 font-semibold">❌ Error</p>
                  <p className="text-red-300 mt-2">{syncResult.error}</p>
                </>
              )}
            </div>
          )}

          {/* Extracted Contacts List */}
          {showExtractedContacts && extractedContacts.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-3">
                Top {Math.min(20, extractedContacts.length)} of {extractedContacts.length} extracted contacts (sorted by interaction frequency):
              </p>
              <div className="max-h-96 overflow-y-auto">
                <div className="grid gap-2">
                  {extractedContacts.slice(0, 20).map((contact, index) => (
                    <div key={index} className="bg-gray-700 rounded-lg p-3 hover:bg-gray-600 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-200">
                            {contact.name || <span className="text-gray-400 italic">No name</span>}
                          </p>
                          <p className="text-sm text-blue-400 mt-1">{contact.email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {contact.messageCount} email{contact.messageCount !== 1 ? 's' : ''} •
                            Last: {new Date(contact.lastSeen).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="ml-4 flex flex-col gap-1">
                          <span className="text-xs px-2 py-1 bg-purple-900/30 text-purple-400 rounded">
                            {contact.messageCount} msgs
                          </span>
                          {contact.name && (
                            <button
                              onClick={() => setSearchName(contact.name)}
                              className="text-xs px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded"
                            >
                              Test Search
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {extractedContacts.length > 20 && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Showing first 20 of {extractedContacts.length} contacts. Click "Sync to Google Contacts" to add all.
                </p>
              )}
            </div>
          )}
        </div>

        {/* My Contacts Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Your Google Contacts</h2>
            <button
              onClick={() => setShowContacts(!showContacts)}
              className="text-sm text-gray-400 hover:text-gray-300"
            >
              {showContacts ? 'Hide' : 'Show'} Contacts
            </button>
          </div>
          
          <button
            onClick={fetchMyContacts}
            disabled={!addr || loadingContacts}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4"
          >
            {loadingContacts ? 'Loading...' : `Load My Contacts (First 100)`}
          </button>

          {showContacts && myContacts.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-3">
                Found {myContacts.length} contacts. {myContacts.filter(c => c.primaryEmail).length} have email addresses.
              </p>
              <div className="max-h-96 overflow-y-auto">
                <div className="grid gap-2">
                  {myContacts.map((contact, index) => (
                    <div key={index} className="bg-gray-700 rounded-lg p-3 hover:bg-gray-600 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-200">
                            {contact.name}
                            {contact.firstName && (
                              <span className="text-xs text-gray-400 ml-2">
                                (First: {contact.firstName})
                              </span>
                            )}
                          </p>
                          {contact.primaryEmail && (
                            <p className="text-sm text-blue-400 mt-1">{contact.primaryEmail}</p>
                          )}
                          {contact.organization && (
                            <p className="text-xs text-gray-400 mt-1">
                              {contact.organization}
                              {contact.jobTitle && ` - ${contact.jobTitle}`}
                            </p>
                          )}
                          {contact.phoneNumbers && contact.phoneNumbers.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              📞 {contact.phoneNumbers[0].value}
                            </p>
                          )}
                        </div>
                        <div className="ml-4">
                          {contact.primaryEmail ? (
                            <span className="text-xs px-2 py-1 bg-green-900/30 text-green-400 rounded">
                              Can Invite
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-gray-600 text-gray-400 rounded">
                              No Email
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Quick test buttons */}
                      {contact.primaryEmail && (
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => setSearchName(contact.firstName || contact.name)}
                            className="text-xs px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded"
                          >
                            Test Search: "{contact.firstName || contact.name}"
                          </button>
                          <button
                            onClick={() => setAttendees(contact.firstName || contact.name)}
                            className="text-xs px-2 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded"
                          >
                            Add to Event Test
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {showContacts && myContacts.length === 0 && !loadingContacts && (
            <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
              <p className="text-yellow-400">No contacts found. Click "Load My Contacts" to fetch them.</p>
            </div>
          )}
        </div>

        {/* Create Real Test Contact */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create Real Test Contact</h2>
          <p className="text-gray-400 mb-4">
            Create a contact with your second Gmail account to test real invitations
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Contact Name
              </label>
              <input
                type="text"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                placeholder="e.g., John Test or Test User"
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address (Your Second Gmail)
              </label>
              <input
                type="email"
                value={newContactEmail}
                onChange={(e) => setNewContactEmail(e.target.value)}
                placeholder="your.second.email@gmail.com"
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone Number (Optional)
              </label>
              <input
                type="text"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                placeholder="+1234567890"
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              onClick={createContact}
              disabled={!addr || !newContactName || !newContactEmail || creatingContact}
              className="w-full px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creatingContact ? 'Creating Contact...' : 'Create Contact'}
            </button>
          </div>
          
          {/* Result message */}
          {createContactResult && (
            <div className={`mt-4 p-4 rounded-lg ${
              createContactResult.success 
                ? 'bg-green-900/20 border border-green-600' 
                : 'bg-red-900/20 border border-red-600'
            }`}>
              {createContactResult.success ? (
                <>
                  <p className="text-green-400 font-semibold">✅ Contact Created Successfully!</p>
                  <p className="text-gray-300 mt-2">
                    Created: {createContactResult.contact?.name} ({createContactResult.contact?.email})
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    You can now test: "Schedule a meeting with {createContactResult.contact?.name}"
                  </p>
                </>
              ) : (
                <>
                  <p className="text-red-400 font-semibold">❌ Error Creating Contact</p>
                  <p className="text-red-300 mt-2">{createContactResult.error}</p>
                  {createContactResult.needsReconnect && (
                    <p className="text-yellow-400 mt-2">
                      💡 Please disconnect and reconnect your Google Calendar to grant write permission
                    </p>
                  )}
                </>
              )}
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