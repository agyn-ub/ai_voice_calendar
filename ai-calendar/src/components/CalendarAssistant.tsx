'use client';

import { useState, useRef, useEffect } from 'react';
import { AssistantResponse } from '@/types/openai';

interface CalendarAssistantProps {
  walletAddress: string | null;
  onCalendarUpdate?: () => void;
}

export default function CalendarAssistant({ walletAddress, onCalendarUpdate }: CalendarAssistantProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; actions?: any[] }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !walletAddress || isLoading) return;
    
    const userMessage = message.trim();
    setMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/assistant/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          message: userMessage,
          conversation_id: conversationId
        }),
      });
      
      const data: AssistantResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to process request');
      }
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.message,
        actions: data.actions_taken
      }]);
      
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }
      
      // Trigger calendar update if actions were taken
      if (data.actions_taken && data.actions_taken.length > 0 && onCalendarUpdate) {
        onCalendarUpdate();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearConversation = async () => {
    if (conversationId) {
      try {
        await fetch(`/api/assistant/calendar?conversation_id=${conversationId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Error clearing conversation:', error);
      }
    }
    
    setMessages([]);
    setConversationId(null);
    setMessage('');
  };

  const examplePrompts = [
    "What's on my calendar today?",
    "Schedule a meeting tomorrow at 2pm",
    "Clear my calendar for next Monday",
    "Find all meetings with John",
    "Move my 3pm meeting to 4pm"
  ];

  if (!walletAddress) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <span className="mr-2">🤖</span> Calendar Assistant
        </h2>
        <p className="text-gray-600">Please connect your wallet to use the calendar assistant.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div 
        className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white cursor-pointer flex justify-between items-center"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-xl font-semibold flex items-center">
          <span className="mr-2">🤖</span> Calendar Assistant
        </h2>
        <button className="text-2xl">
          {isExpanded ? '−' : '+'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="p-4">
          {messages.length === 0 && (
            <div className="mb-4">
              <p className="text-gray-600 mb-3">Try asking me something like:</p>
              <div className="space-y-2">
                {examplePrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => setMessage(prompt)}
                    className="block w-full text-left px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="h-96 overflow-y-auto mb-4 space-y-3 p-2">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-300">
                      <p className="text-xs font-semibold mb-1">Actions taken:</p>
                      {msg.actions.map((action, actionIndex) => (
                        <div key={actionIndex} className="text-xs">
                          <span className={action.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                            {action.status === 'success' ? '✓' : '✗'}
                          </span>
                          {' '}{action.type.replace(/_/g, ' ')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask me about your calendar..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!message.trim() || isLoading}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearConversation}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}