// OpenAI Responses API Integration with Google Calendar Connector
// Uses OpenAI's built-in Google Calendar connector for calendar operations

import OpenAI from 'openai';

interface CalendarResponse {
  success: boolean;
  message: string;
  calendarData?: any;
  error?: string;
  tokenId?: string;
  permissions?: {
    hasReadAccess: boolean;
    hasWriteAccess: boolean;
    scopes: string[];
  };
}

interface MCPTool {
  type: 'mcp';
  server_label: string;
  connector_id: string;
  authorization: string;
  require_approval: 'never' | 'always' | 'auto';
}

export class OpenAICalendarIntegration {
  private client: OpenAI;
  private model: string = 'gpt-5'; // Using GPT-5 for Responses API

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey: apiKey
    });
  }

  /**
   * Process calendar request using OpenAI's Google Calendar connector
   */
  async processCalendarRequest(
    userMessage: string,
    googleAccessToken: string,
    userEmail?: string
  ): Promise<CalendarResponse> {
    try {
      // Check if we have a valid token
      if (!googleAccessToken) {
        return {
          success: false,
          message: 'Please connect your Google Calendar first.',
          error: 'no_auth'
        };
      }

      // Call OpenAI Responses API with Google Calendar connector
      const response = await this.client.responses.create({
        model: this.model,
        tools: [
          {
            type: 'mcp',
            server_label: 'google_calendar',
            connector_id: 'connector_googlecalendar',
            authorization: googleAccessToken,
            require_approval: 'never'
          } as MCPTool
        ],
        input: userMessage
      } as any);

      // Extract the response
      const output = this.extractOutput(response);
      
      return {
        success: true,
        message: output.text || 'Calendar operation completed.',
        calendarData: output.calendarData,
        tokenId: response.id,
        permissions: this.extractPermissions(googleAccessToken)
      };
    } catch (error: any) {
      console.error('Error processing calendar request:', error);
      
      // Handle specific errors
      if (error.message?.includes('unauthorized') || error.message?.includes('401')) {
        return {
          success: false,
          message: 'Your Google Calendar access has expired. Please reconnect.',
          error: 'token_expired'
        };
      }
      
      if (error.message?.includes('insufficient_scope')) {
        return {
          success: false,
          message: 'You need to grant additional permissions for this operation.',
          error: 'insufficient_scope'
        };
      }
      
      return {
        success: false,
        message: 'Failed to process your calendar request. Please try again.',
        error: error.message
      };
    }
  }

  /**
   * Extract output from OpenAI response
   */
  private extractOutput(response: any): { text: string; calendarData?: any } {
    try {
      // Handle different response formats from OpenAI
      if (response.output_text) {
        return { text: response.output_text };
      }
      
      if (response.output && Array.isArray(response.output)) {
        // Look for calendar-specific outputs
        const mcpOutput = response.output.find((item: any) => item.type === 'mcp_call');
        if (mcpOutput) {
          const calendarData = JSON.parse(mcpOutput.output || '{}');
          const text = this.formatCalendarResponse(calendarData);
          return { text, calendarData };
        }
        
        // Look for text outputs
        const textOutput = response.output.find((item: any) => 
          item.type === 'message' || item.type === 'output_text'
        );
        if (textOutput) {
          return { 
            text: textOutput.text || textOutput.content?.[0]?.text || 'Operation completed.' 
          };
        }
      }
      
      // Fallback to any text field
      return { 
        text: response.text || response.message || 'Calendar operation completed.' 
      };
    } catch (error) {
      console.error('Error extracting output:', error);
      return { text: 'Calendar operation completed.' };
    }
  }

  /**
   * Format calendar data into readable response
   */
  private formatCalendarResponse(calendarData: any): string {
    try {
      if (calendarData.events && Array.isArray(calendarData.events)) {
        if (calendarData.events.length === 0) {
          return 'No events found for the specified time period.';
        }
        
        const eventList = calendarData.events.map((event: any) => {
          const start = new Date(event.start).toLocaleString();
          const summary = event.summary || 'Untitled Event';
          const location = event.location ? ` at ${event.location}` : '';
          return `• ${summary} - ${start}${location}`;
        }).join('\n');
        
        return `Here are your calendar events:\n${eventList}`;
      }
      
      if (calendarData.message) {
        return calendarData.message;
      }
      
      return 'Calendar operation completed successfully.';
    } catch (error) {
      console.error('Error formatting calendar response:', error);
      return 'Calendar operation completed.';
    }
  }

  /**
   * Extract permissions from token (simplified - in production, decode JWT)
   */
  private extractPermissions(token: string): any {
    // In a real implementation, you would decode the token or
    // check the scopes from the OAuth response
    return {
      hasReadAccess: true,
      hasWriteAccess: token.length > 0, // Simplified check
      scopes: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email'
      ]
    };
  }

  /**
   * Check if user has calendar connected
   */
  async checkCalendarConnection(googleAccessToken?: string): Promise<boolean> {
    return !!googleAccessToken && googleAccessToken.length > 0;
  }
}

// Export factory function
export function createOpenAICalendarIntegration(
  apiKey: string
): OpenAICalendarIntegration {
  return new OpenAICalendarIntegration(apiKey);
}