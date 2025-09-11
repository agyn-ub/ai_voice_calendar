'use client';

import { Message } from './ChatInterface';
import CalendarEventCard from './CalendarEventCard';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  className?: string;
}

export default function MessageList({ messages, isLoading, className = '' }: MessageListProps) {
  return (
    <div className={`px-6 py-4 space-y-4 ${className}`}>
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] ${
              message.role === 'user'
                ? 'bg-gradient-to-r from-green-600 to-blue-600'
                : message.error
                ? 'bg-red-900/50 border border-red-700'
                : 'bg-gray-800 border border-gray-700'
            } rounded-lg px-4 py-3 shadow-lg`}
          >
            {/* Avatar and name */}
            <div className="flex items-center space-x-2 mb-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                  message.role === 'user'
                    ? 'bg-green-700/50'
                    : 'bg-blue-700/50'
                }`}
              >
                {message.role === 'user' ? 'U' : 'AI'}
              </div>
              <span className="text-sm text-gray-300">
                {message.role === 'user' ? 'You' : 'AI Assistant'}
              </span>
              <span className="text-xs text-gray-500">
                {typeof window !== 'undefined' 
                  ? message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : ''
                }
              </span>
            </div>

            {/* Message content */}
            <div className="text-white whitespace-pre-wrap">{message.content}</div>

            {/* Calendar event card if present */}
            {message.calendarEvent && (
              <CalendarEventCard event={message.calendarEvent} className="mt-3" />
            )}
          </div>
        </div>
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 shadow-lg">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-blue-700/50 flex items-center justify-center text-white text-sm font-semibold">
                AI
              </div>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}