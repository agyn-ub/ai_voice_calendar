import OpenAI from 'openai';
import { CALENDAR_TOOLS, CalendarEventInput } from '@/types/openai';
import { googleCalendarService } from './googleCalendar';
import { calendar_v3 } from 'googleapis';

export class OpenAIService {
  private client: OpenAI;
  
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  
  async processCalendarRequest(
    message: string,
    walletAddress: string,
    conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[] = []
  ) {
    const systemPrompt = `You are a helpful calendar assistant. You can help users manage their Google Calendar by:
- Viewing upcoming events
- Creating new events
- Updating existing events
- Deleting events
- Searching for specific events

When users ask about their schedule, use the appropriate calendar tools to help them.
Parse natural language dates and times accurately. Today's date is ${new Date().toLocaleDateString()}.
When creating events, always ask for confirmation if important details are missing.
Be concise and helpful in your responses.`;

    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message }
      ];
      
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages,
        tools: CALENDAR_TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1000
      });
      
      const assistantMessage = response.choices[0].message;
      const toolCalls = assistantMessage.tool_calls;
      
      const actionsExecuted = [];
      let events: calendar_v3.Schema$Event[] = [];
      
      if (toolCalls && toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          
          try {
            const result = await this.executeToolCall(
              functionName,
              args,
              walletAddress
            );
            
            actionsExecuted.push({
              type: functionName,
              status: 'success',
              details: result
            });
            
            if (functionName === 'get_calendar_events' || functionName === 'search_calendar_events') {
              events = result as calendar_v3.Schema$Event[];
            }
          } catch (error) {
            actionsExecuted.push({
              type: functionName,
              status: 'error',
              details: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }
      
      return {
        message: assistantMessage.content || '',
        actions_taken: actionsExecuted,
        events,
        toolCalls
      };
    } catch (error) {
      console.error('Error processing calendar request:', error);
      throw new Error('Failed to process calendar request');
    }
  }
  
  private async executeToolCall(
    functionName: string,
    args: any,
    walletAddress: string
  ): Promise<any> {
    switch (functionName) {
      case 'get_calendar_events':
        return await this.getCalendarEvents(walletAddress, args);
        
      case 'create_calendar_event':
        return await this.createCalendarEvent(walletAddress, args);
        
      case 'update_calendar_event':
        return await this.updateCalendarEvent(walletAddress, args);
        
      case 'delete_calendar_event':
        return await this.deleteCalendarEvent(walletAddress, args);
        
      case 'search_calendar_events':
        return await this.searchCalendarEvents(walletAddress, args);
        
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }
  
  private async getCalendarEvents(walletAddress: string, args: any) {
    const { timeMin, timeMax, maxResults = 50 } = args;
    
    const events = await googleCalendarService.getCalendarEvents(
      walletAddress,
      timeMin ? new Date(timeMin) : new Date(),
      timeMax ? new Date(timeMax) : undefined
    );
    
    return events.slice(0, maxResults);
  }
  
  private async createCalendarEvent(walletAddress: string, args: any) {
    const {
      summary,
      description,
      location,
      startDateTime,
      endDateTime,
      attendeeEmails,
      reminderMinutes,
      isAllDay,
      recurrence
    } = args;
    
    const event: CalendarEventInput = {
      summary,
      description,
      location,
      start: isAllDay 
        ? { date: startDateTime.split('T')[0] }
        : { dateTime: startDateTime },
      end: isAllDay
        ? { date: endDateTime.split('T')[0] }
        : { dateTime: endDateTime }
    };
    
    if (attendeeEmails && attendeeEmails.length > 0) {
      event.attendees = attendeeEmails.map((email: string) => ({ email }));
    }
    
    if (reminderMinutes) {
      event.reminders = {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: reminderMinutes }
        ]
      };
    }
    
    if (recurrence) {
      event.recurrence = [recurrence];
    }
    
    return await googleCalendarService.createCalendarEvent(walletAddress, event);
  }
  
  private async updateCalendarEvent(walletAddress: string, args: any) {
    const { eventId, ...updateFields } = args;
    
    const event: Partial<CalendarEventInput> = {};
    
    if (updateFields.summary) event.summary = updateFields.summary;
    if (updateFields.description) event.description = updateFields.description;
    if (updateFields.location) event.location = updateFields.location;
    
    if (updateFields.startDateTime) {
      event.start = { dateTime: updateFields.startDateTime };
    }
    
    if (updateFields.endDateTime) {
      event.end = { dateTime: updateFields.endDateTime };
    }
    
    if (updateFields.attendeeEmails) {
      event.attendees = updateFields.attendeeEmails.map((email: string) => ({ email }));
    }
    
    return await googleCalendarService.updateCalendarEvent(walletAddress, eventId, event);
  }
  
  private async deleteCalendarEvent(walletAddress: string, args: any) {
    const { eventId } = args;
    return await googleCalendarService.deleteCalendarEvent(walletAddress, eventId);
  }
  
  private async searchCalendarEvents(walletAddress: string, args: any) {
    const { query, timeMin, timeMax } = args;
    
    const events = await googleCalendarService.getCalendarEvents(
      walletAddress,
      timeMin ? new Date(timeMin) : new Date(),
      timeMax ? new Date(timeMax) : undefined
    );
    
    const searchLower = query.toLowerCase();
    return events.filter((event: any) => {
      const summary = event.summary?.toLowerCase() || '';
      const description = event.description?.toLowerCase() || '';
      const location = event.location?.toLowerCase() || '';
      
      return summary.includes(searchLower) || 
             description.includes(searchLower) || 
             location.includes(searchLower);
    });
  }
  
  parseNaturalLanguageDate(input: string): Date {
    const now = new Date();
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('today')) {
      return now;
    }
    
    if (lowerInput.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
    
    if (lowerInput.includes('next week')) {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek;
    }
    
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < daysOfWeek.length; i++) {
      if (lowerInput.includes(daysOfWeek[i])) {
        const targetDay = i;
        const currentDay = now.getDay();
        let daysToAdd = targetDay - currentDay;
        
        if (daysToAdd <= 0) {
          daysToAdd += 7;
        }
        
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + daysToAdd);
        return targetDate;
      }
    }
    
    try {
      return new Date(input);
    } catch {
      return now;
    }
  }
}

export const openAIService = new OpenAIService();