'use client';

import { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { useFlowCurrentUser } from '@onflow/react-sdk';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  calendarEvent?: any;
  error?: boolean;
}

interface ChatInterfaceProps {
  className?: string;
}

export default function ChatInterface({ className = '' }: ChatInterfaceProps) {
  const { user } = useFlowCurrentUser();
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    setMounted(true);
    // Initialize messages after mount to avoid hydration issues
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: `Hello! I'm your AI Calendar Assistant. I can help you manage your calendar using natural language. Try saying things like:
      
• "What's on my calendar today?"
• "Schedule a meeting with John tomorrow at 3pm"
• "Cancel my 2pm appointment"
• "Move my dentist appointment to next week"

How can I help you today?`,
        timestamp: new Date(),
      },
    ]);
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string, isVoice: boolean = false) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Call API to process message with OpenAI
      const response = await fetch('/api/calendar/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          walletAddress: user?.addr,
          isVoice,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process message');
      }

      const data = await response.json();
      
      // Add assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        calendarEvent: data.calendarEvent,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        error: true,
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-gray-900 rounded-2xl border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-700 bg-gray-800 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">AI Calendar Assistant</h2>
            <p className="text-sm text-gray-400 mt-1">
              Connected: {user?.addr ? `${user.addr.slice(0, 6)}...${user.addr.slice(-4)}` : 'Not connected'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-400">Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <MessageList 
        messages={messages} 
        isLoading={isLoading}
        className="flex-1 overflow-y-auto"
      />
      <div ref={messagesEndRef} />

      {/* Input */}
      <ChatInput 
        onSendMessage={handleSendMessage}
        disabled={isLoading}
        className="border-t border-gray-700"
      />
    </div>
  );
}