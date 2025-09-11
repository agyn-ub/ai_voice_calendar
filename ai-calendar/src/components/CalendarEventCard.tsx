'use client';

interface CalendarEvent {
  id?: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  description?: string;
  attendees?: string[];
  status?: 'confirmed' | 'tentative' | 'cancelled';
  meetingLink?: string;
}

interface CalendarEventCardProps {
  event: CalendarEvent;
  className?: string;
}

export default function CalendarEventCard({ event, className = '' }: CalendarEventCardProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-900/50 border-green-700';
      case 'tentative':
        return 'bg-yellow-900/50 border-yellow-700';
      case 'cancelled':
        return 'bg-red-900/50 border-red-700';
      default:
        return 'bg-blue-900/50 border-blue-700';
    }
  };

  return (
    <div className={`rounded-lg border ${getStatusColor(event.status)} p-4 ${className}`}>
      {/* Event title and status */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-semibold text-white">{event.title}</h3>
        {event.status && (
          <span className={`text-xs px-2 py-1 rounded-full ${
            event.status === 'confirmed' ? 'bg-green-700 text-green-100' :
            event.status === 'tentative' ? 'bg-yellow-700 text-yellow-100' :
            'bg-red-700 text-red-100'
          }`}>
            {event.status}
          </span>
        )}
      </div>

      {/* Date and time */}
      <div className="flex items-center space-x-2 text-sm text-gray-300 mb-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{formatDate(event.startTime)}</span>
        <span>•</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
      </div>

      {/* Location */}
      {event.location && (
        <div className="flex items-center space-x-2 text-sm text-gray-300 mb-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{event.location}</span>
        </div>
      )}

      {/* Description */}
      {event.description && (
        <p className="text-sm text-gray-400 mb-2">{event.description}</p>
      )}

      {/* Attendees */}
      {event.attendees && event.attendees.length > 0 && (
        <div className="flex items-center space-x-2 text-sm text-gray-300 mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span>{event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}</span>
          <span className="text-gray-500">({event.attendees.slice(0, 3).join(', ')}{event.attendees.length > 3 ? '...' : ''})</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex space-x-2 mt-3">
        {event.meetingLink && (
          <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Join Meeting</span>
          </button>
        )}
        <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded-lg transition-colors duration-200">
          View Details
        </button>
      </div>
    </div>
  );
}