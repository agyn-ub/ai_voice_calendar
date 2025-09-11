import { NextRequest, NextResponse } from 'next/server';
import { createOpenAICalendarIntegration } from '@/lib/openai-calendar-integration';

// Mock calendar data for demonstration
const mockEvents = [
  {
    id: '1',
    title: 'Team Standup',
    startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    endTime: new Date(Date.now() + 90000000).toISOString(),
    location: 'Conference Room A',
    description: 'Daily team sync',
    attendees: ['john@example.com', 'sarah@example.com'],
    status: 'confirmed' as const,
  },
  {
    id: '2',
    title: 'Product Review',
    startTime: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
    endTime: new Date(Date.now() + 176400000).toISOString(),
    location: 'Virtual - Zoom',
    description: 'Q4 product roadmap review',
    attendees: ['team@example.com'],
    status: 'tentative' as const,
    meetingLink: 'https://zoom.us/j/123456789',
  },
];

export async function POST(request: NextRequest) {
  try {
    const { message, walletAddress, isVoice } = await request.json();

    // For demonstration, we'll use mock responses
    // In production, this would integrate with OpenAI GPT-5-mini and Google Calendar
    
    const lowerMessage = message.toLowerCase();
    let response = '';
    let calendarEvent = null;

    // Simple intent detection for demonstration
    if (lowerMessage.includes('today') || lowerMessage.includes('schedule') || lowerMessage.includes('calendar')) {
      // Query calendar
      response = "Here are your upcoming events:";
      calendarEvent = mockEvents[0]; // Return first event
    } else if (lowerMessage.includes('create') || lowerMessage.includes('schedule') || lowerMessage.includes('book')) {
      // Create event
      response = "I'll help you schedule that event. Based on your request, I've prepared the following:";
      calendarEvent = {
        id: 'new-1',
        title: 'New Meeting',
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 90000000).toISOString(),
        location: 'TBD',
        description: 'Created from your request',
        status: 'tentative' as const,
      };
    } else if (lowerMessage.includes('cancel') || lowerMessage.includes('delete')) {
      // Cancel event
      response = "I've cancelled the requested event. The event has been removed from your calendar.";
    } else if (lowerMessage.includes('update') || lowerMessage.includes('change') || lowerMessage.includes('move')) {
      // Update event
      response = "I've updated the event as requested. The changes have been saved to your calendar.";
      calendarEvent = {
        ...mockEvents[0],
        title: 'Updated: ' + mockEvents[0].title,
        status: 'confirmed' as const,
      };
    } else {
      // Default response
      response = `I understand you said: "${message}". I can help you with:
• Viewing your calendar events
• Creating new appointments
• Updating existing events
• Cancelling meetings

What would you like to do?`;
    }

    // Add voice indicator if applicable
    if (isVoice) {
      response = `[Voice command received] ${response}`;
    }

    return NextResponse.json({
      response,
      calendarEvent,
      tokenId: `cal_${walletAddress}_${Date.now()}`,
    });
  } catch (error) {
    console.error('Error processing calendar chat:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}