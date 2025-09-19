"use client";

import { useState, useEffect, useRef } from "react";
import { useFlow } from "./FlowProvider";
import FlowService from "@/lib/flow/flowService";
import { UnifiedChatInput } from "./ui/UnifiedChatInput";
import { TypingIndicator } from "./ui/TypingIndicator";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

export function UnifiedCalendarChat() {
  const { user } = useFlow();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [flowBalance, setFlowBalance] = useState<string>("0.0");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.addr) {
      fetchFlowBalance();
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchFlowBalance = async () => {
    if (!user?.addr) return;
    try {
      const balance = await FlowService.getFlowBalance(user.addr);
      setFlowBalance(balance);
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  const handleMessage = async (text: string) => {
    if (!user?.addr) {
      alert("Please connect your Flow wallet first");
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: text,
      timestamp: new Date(),
      status: 'sent'
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Process with AI
      const response = await fetch('/api/assistant/voice-to-meeting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: user.addr,
          voice_command: text,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process command');
      }

      // Extract meeting details from AI response
      const { title, startTime, endTime, stakeAmount, participants } = data;

      // Create blockchain meeting (stake-first approach)
      const meetingId = `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: `Creating meeting: "${title}" with ${stakeAmount} FLOW stake...`,
        timestamp: new Date(),
        status: 'sent'
      };

      setMessages(prev => [...prev, assistantMessage]);

      await FlowService.createMeeting(
        meetingId,
        "",
        title,
        new Date(startTime).getTime() / 1000,
        new Date(endTime).getTime() / 1000,
        stakeAmount.toString()
      );

      // Update with success message
      const successMessage: Message = {
        id: `assistant-${Date.now()}-success`,
        type: 'assistant',
        content: `✅ Meeting created successfully!\n\n📅 ${title}\n⏰ ${new Date(startTime).toLocaleString()}\n💎 Stake: ${stakeAmount} FLOW\n👥 Participants: ${participants.length || 'Open invitation'}`,
        timestamp: new Date(),
        status: 'sent'
      };

      setMessages(prev => [...prev, successMessage]);

    } catch (error) {
      const errorMessage: Message = {
        id: `assistant-${Date.now()}-error`,
        type: 'assistant',
        content: `Sorry, I couldn't process that: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        status: 'error'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user?.addr) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 mx-auto bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Connect Your Flow Wallet</h2>
          <p className="text-gray-600 dark:text-gray-400">Connect your wallet to start creating meetings with voice or text</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {user.addr.slice(0, 6)}...{user.addr.slice(-4)}
          </span>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {parseFloat(flowBalance).toFixed(2)} FLOW
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="space-y-6 max-w-2xl">
              <div className="space-y-2">
                <h3 className="text-2xl font-light text-gray-700 dark:text-gray-300">
                  Hi! I can help you create meetings
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Just type or speak naturally, like:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => handleMessage("Schedule team meeting tomorrow at 3pm with 10 FLOW stake")}
                  className="text-left p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
                >
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    "Team meeting tomorrow 3pm, stake 10 FLOW"
                  </p>
                </button>
                <button
                  onClick={() => handleMessage("Meeting with Sarah Friday 2pm, 20 FLOW stake")}
                  className="text-left p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
                >
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    "Meeting with Sarah Friday 2pm, stake 20 FLOW"
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : message.status === 'error'
                  ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.type === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2">
              <TypingIndicator isTyping={true} label="AI is thinking" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <UnifiedChatInput
          onSendMessage={handleMessage}
          placeholder="Type or speak to create a meeting..."
          disabled={isProcessing}
        />
      </div>
    </div>
  );
}