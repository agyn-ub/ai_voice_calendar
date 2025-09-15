'use client';

import { useState, useEffect } from 'react';
import { useFlowCurrentUser } from '@onflow/react-sdk';
import * as fcl from "@onflow/fcl";

interface StakingInterfaceProps {
  meetingId: string;
  eventId: string;
  eventTitle: string;
  startTime: string;
  endTime: string;
  requiredStake?: number;
  isOrganizer: boolean;
  onStakeComplete?: () => void;
}

export default function StakingInterface({
  meetingId,
  eventId,
  eventTitle,
  startTime,
  endTime,
  requiredStake,
  isOrganizer,
  onStakeComplete
}: StakingInterfaceProps) {
  const { user } = useFlowCurrentUser();
  const [stakeStatus, setStakeStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [attendanceCode, setAttendanceCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch stake status
  const fetchStakeStatus = async () => {
    if (!meetingId) return;
    
    setIsRefreshing(true);
    try {
      const params = new URLSearchParams({
        meetingId,
        ...(user?.addr && { walletAddress: user.addr })
      });
      
      const response = await fetch(`/api/staking/status?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setStakeStatus(data);
      } else {
        console.error('Failed to fetch stake status:', data.error);
      }
    } catch (error) {
      console.error('Error fetching stake status:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStakeStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStakeStatus, 30000);
    return () => clearInterval(interval);
  }, [meetingId, user?.addr]);

  // Create staked meeting
  const createStakedMeeting = async () => {
    if (!user?.loggedIn || !requiredStake) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/staking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          meetingId,
          organizer: user.addr,
          requiredStake,
          startTime,
          endTime
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Staking requirement created successfully!');
        await fetchStakeStatus();
      } else {
        setError(data.error || 'Failed to create staking requirement');
      }
    } catch (error) {
      setError('Failed to create staking requirement');
      console.error('Error creating staked meeting:', error);
    } finally {
      setLoading(false);
    }
  };

  // Stake for meeting
  const stakeForMeeting = async () => {
    if (!user?.loggedIn || !stakeStatus?.meeting) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/staking/stake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          amount: stakeStatus.meeting.requiredStake,
          walletAddress: user.addr
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Successfully staked for the meeting!');
        await fetchStakeStatus();
        onStakeComplete?.();
      } else {
        setError(data.error || 'Failed to stake');
      }
    } catch (error) {
      setError('Failed to stake for meeting');
      console.error('Error staking:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate attendance code (for organizers)
  const generateAttendanceCode = async () => {
    if (!user?.loggedIn || !isOrganizer) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/staking/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          walletAddress: user.addr
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setAttendanceCode(data.code);
        setSuccess('Attendance code generated! Share it with attendees.');
        await fetchStakeStatus();
      } else {
        setError(data.error || 'Failed to generate code');
      }
    } catch (error) {
      setError('Failed to generate attendance code');
      console.error('Error generating code:', error);
    } finally {
      setLoading(false);
    }
  };

  // Submit attendance code (for attendees)
  const submitAttendanceCode = async () => {
    if (!user?.loggedIn || !inputCode) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/staking/submit-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          code: inputCode,
          walletAddress: user.addr
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Attendance confirmed! Your stake will be refunded after the meeting.');
        setInputCode('');
        await fetchStakeStatus();
      } else {
        setError(data.error || 'Failed to submit code');
      }
    } catch (error) {
      setError('Failed to submit attendance code');
      console.error('Error submitting code:', error);
    } finally {
      setLoading(false);
    }
  };

  // Settle meeting (after check-in period ends)
  const settleMeeting = async () => {
    if (!user?.loggedIn) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/staking/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          walletAddress: user.addr
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(`Meeting settled! ${data.result.refundedCount} refunded, ${data.result.forfeitedCount} forfeited.`);
        await fetchStakeStatus();
      } else {
        setError(data.error || 'Failed to settle meeting');
      }
    } catch (error) {
      setError('Failed to settle meeting');
      console.error('Error settling:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user?.loggedIn) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <p className="text-gray-400 text-sm">Connect your wallet to participate in staking</p>
      </div>
    );
  }

  // No staking data yet
  if (!stakeStatus && isOrganizer && requiredStake) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
        <h3 className="text-white font-semibold">Enable Staking for This Meeting</h3>
        <p className="text-gray-300 text-sm">
          Require attendees to stake {requiredStake} FLOW to participate
        </p>
        <button
          onClick={createStakedMeeting}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating...' : 'Enable Staking'}
        </button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-green-400 text-sm">{success}</p>}
      </div>
    );
  }

  if (!stakeStatus?.meeting) {
    return null;
  }

  const { meeting, stats, userStake } = stakeStatus;
  const now = new Date();
  const canStake = meeting.status === 'upcoming' && !userStake;
  const canGenerateCode = isOrganizer && meeting.status === 'in_progress' && !meeting.hasAttendanceCode;
  const canSubmitCode = userStake && !userStake.hasCheckedIn && meeting.hasAttendanceCode && 
    (meeting.status === 'in_progress' || meeting.status === 'check_in_period');
  const canSettle = meeting.status === 'pending_settlement' && !meeting.isSettled;

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-white font-semibold">Meeting Staking</h3>
          <p className="text-gray-400 text-sm mt-1">
            Required Stake: {meeting.requiredStake} FLOW
          </p>
        </div>
        <button
          onClick={fetchStakeStatus}
          disabled={isRefreshing}
          className="text-gray-400 hover:text-white transition-colors"
          title="Refresh status"
        >
          <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Status:</span>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          meeting.status === 'upcoming' ? 'bg-blue-600/20 text-blue-400' :
          meeting.status === 'staking_closed' ? 'bg-yellow-600/20 text-yellow-400' :
          meeting.status === 'in_progress' ? 'bg-green-600/20 text-green-400' :
          meeting.status === 'check_in_period' ? 'bg-orange-600/20 text-orange-400' :
          meeting.status === 'pending_settlement' ? 'bg-purple-600/20 text-purple-400' :
          'bg-gray-600/20 text-gray-400'
        }`}>
          {meeting.status.replace(/_/g, ' ').toUpperCase()}
        </span>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 rounded p-2">
          <p className="text-xs text-gray-400">Total Staked</p>
          <p className="text-sm font-semibold text-white">{stats.totalStaked} FLOW</p>
        </div>
        <div className="bg-gray-900 rounded p-2">
          <p className="text-xs text-gray-400">Participants</p>
          <p className="text-sm font-semibold text-white">{stats.totalStakers}</p>
        </div>
        <div className="bg-gray-900 rounded p-2">
          <p className="text-xs text-gray-400">Checked In</p>
          <p className="text-sm font-semibold text-green-400">{stats.totalAttended}</p>
        </div>
        <div className="bg-gray-900 rounded p-2">
          <p className="text-xs text-gray-400">Absent</p>
          <p className="text-sm font-semibold text-red-400">{stats.totalAbsent}</p>
        </div>
      </div>

      {/* User Stake Info */}
      {userStake && (
        <div className="bg-gray-900 rounded p-3 space-y-2">
          <p className="text-sm text-gray-300">
            Your Stake: <span className="font-semibold text-white">{userStake.amount} FLOW</span>
          </p>
          {userStake.hasCheckedIn ? (
            <p className="text-sm text-green-400">✓ Attendance confirmed</p>
          ) : (
            <p className="text-sm text-yellow-400">⚠ Not checked in yet</p>
          )}
          {userStake.isRefunded && (
            <p className="text-sm text-green-400">✓ Stake refunded</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {/* Stake Button */}
        {canStake && (
          <button
            onClick={stakeForMeeting}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Staking...' : `Stake ${meeting.requiredStake} FLOW`}
          </button>
        )}

        {/* Generate Code (Organizer) */}
        {canGenerateCode && (
          <button
            onClick={generateAttendanceCode}
            disabled={loading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Generating...' : 'Generate Attendance Code'}
          </button>
        )}

        {/* Display Generated Code */}
        {attendanceCode && (
          <div className="bg-green-900/20 border border-green-600 rounded-lg p-3">
            <p className="text-sm text-green-400 mb-1">Attendance Code (share with attendees):</p>
            <p className="text-2xl font-bold text-white text-center tracking-wider">{attendanceCode}</p>
          </div>
        )}

        {/* Submit Code (Attendee) */}
        {canSubmitCode && (
          <div className="space-y-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="Enter attendance code"
              className="w-full px-3 py-2 bg-gray-900 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
              maxLength={6}
            />
            <button
              onClick={submitAttendanceCode}
              disabled={loading || !inputCode}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Attendance Code'}
            </button>
          </div>
        )}

        {/* Settle Meeting */}
        {canSettle && (
          <button
            onClick={settleMeeting}
            disabled={loading}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Settling...' : 'Settle Meeting & Distribute Stakes'}
          </button>
        )}
      </div>

      {/* Participants List */}
      {stakeStatus.participants && stakeStatus.participants.length > 0 && (
        <div className="border-t border-gray-700 pt-3">
          <p className="text-sm text-gray-400 mb-2">Participants:</p>
          <div className="space-y-1">
            {stakeStatus.participants.map((p: any, i: number) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <span className="text-gray-300 font-mono">{p.walletAddress}</span>
                <span className={p.hasCheckedIn ? 'text-green-400' : 'text-gray-500'}>
                  {p.hasCheckedIn ? '✓ Attended' : '○ Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <p className="text-red-400 text-sm bg-red-900/20 rounded p-2">{error}</p>
      )}
      {success && (
        <p className="text-green-400 text-sm bg-green-900/20 rounded p-2">{success}</p>
      )}
    </div>
  );
}