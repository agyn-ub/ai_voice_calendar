// OpenAI GPT-5-mini Integration with Google Calendar
// Adapts natural language processing based on user permissions

import { GoogleCalendarConnector, CalendarPermissions } from './calendar-connector';

interface NaturalLanguageIntent {
  query: string;
  intent: 'query' | 'create' | 'update' | 'delete' | 'move';
  parameters: any;
  confidence: number;
}

interface OpenAICalendarResponse {
  tokenId: string;
  intent: NaturalLanguageIntent;
  availableOperations: string[];
  canExecute: boolean;
  fallbackSuggestion?: string;
  naturalResponse: string;
}

export class OpenAICalendarIntegration {
  private apiKey: string;
  private model: string = 'gpt-5-mini';
  private calendarConnector: GoogleCalendarConnector | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Initialize with user's calendar permissions
   */
  initializeWithPermissions(tokenId: string, scopes: string[]): void {
    this.calendarConnector = new GoogleCalendarConnector(tokenId, scopes);
  }

  /**
   * Process natural language request based on available permissions
   */
  async processRequest(
    naturalLanguageInput: string,
    sessionId: string
  ): Promise<OpenAICalendarResponse> {
    if (!this.calendarConnector) {
      throw new Error('Calendar connector not initialized. Call initializeWithPermissions first.');
    }

    const availableOps = this.calendarConnector.getAvailableOperations();
    const intent = await this.parseIntent(naturalLanguageInput, availableOps);
    
    // Determine the required operation based on intent
    const requiredOperation = this.mapIntentToOperation(intent);
    const canExecute = this.calendarConnector.canPerformOperation(requiredOperation);

    // Generate appropriate response based on permissions
    const response = await this.generateResponse(
      intent,
      canExecute,
      availableOps,
      sessionId
    );

    return response;
  }

  /**
   * Parse natural language to extract intent using GPT-5-mini
   */
  private async parseIntent(
    input: string,
    availableOperations: string[]
  ): Promise<NaturalLanguageIntent> {
    const prompt = `
    Parse the following calendar request and determine the intent.
    Available operations: ${availableOperations.join(', ')}
    
    User request: "${input}"
    
    Respond with:
    - intent: 'query' for reading/searching events
    - intent: 'create' for creating new events
    - intent: 'update' for modifying existing events
    - intent: 'delete' for removing events
    - intent: 'move' for moving events between calendars
    
    Extract relevant parameters like dates, times, titles, attendees.
    `;

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: prompt,
        }),
      });

      const data = await response.json();
      // Parse the GPT-5-mini response
      return this.extractIntent(data.output, input);
    } catch (error) {
      console.error('Error parsing intent:', error);
      return {
        query: input,
        intent: 'query',
        parameters: {},
        confidence: 0.3
      };
    }
  }

  /**
   * Extract structured intent from AI response
   */
  private extractIntent(aiOutput: string, originalInput: string): NaturalLanguageIntent {
    // Parse AI output to extract intent and parameters
    // This is a simplified version - actual implementation would be more robust
    
    const lowerInput = originalInput.toLowerCase();
    
    // Determine intent based on keywords
    let intent: 'query' | 'create' | 'update' | 'delete' | 'move' = 'query';
    
    if (lowerInput.includes('create') || lowerInput.includes('schedule') || 
        lowerInput.includes('add') || lowerInput.includes('book')) {
      intent = 'create';
    } else if (lowerInput.includes('update') || lowerInput.includes('change') || 
               lowerInput.includes('modify') || lowerInput.includes('reschedule')) {
      intent = 'update';
    } else if (lowerInput.includes('delete') || lowerInput.includes('cancel') || 
               lowerInput.includes('remove')) {
      intent = 'delete';
    } else if (lowerInput.includes('move')) {
      intent = 'move';
    }

    return {
      query: originalInput,
      intent,
      parameters: this.extractParameters(originalInput),
      confidence: 0.85
    };
  }

  /**
   * Extract parameters from natural language
   */
  private extractParameters(input: string): any {
    const params: any = {};
    
    // Extract dates (simplified - real implementation would use better NLP)
    const datePatterns = [
      /tomorrow/i,
      /today/i,
      /next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /(\d{1,2})(st|nd|rd|th)? (january|february|march|april|may|june|july|august|september|october|november|december)/i
    ];
    
    // Extract times
    const timePattern = /(\d{1,2}):?(\d{2})?\s*(am|pm)?/i;
    const timeMatch = input.match(timePattern);
    if (timeMatch) {
      params.time = timeMatch[0];
    }
    
    // Extract duration
    const durationPattern = /(\d+)\s*(hour|minute|min|hr)s?/i;
    const durationMatch = input.match(durationPattern);
    if (durationMatch) {
      params.duration = durationMatch[0];
    }
    
    return params;
  }

  /**
   * Map intent to required calendar operation
   */
  private mapIntentToOperation(intent: NaturalLanguageIntent): string {
    switch (intent.intent) {
      case 'query':
        return intent.parameters.eventId ? 'fetch' : 'search';
      case 'create':
        return 'create_event';
      case 'update':
        return 'update_event';
      case 'delete':
        return 'delete_event';
      case 'move':
        return 'move_event';
      default:
        return 'search';
    }
  }

  /**
   * Generate appropriate response based on permissions
   */
  private async generateResponse(
    intent: NaturalLanguageIntent,
    canExecute: boolean,
    availableOperations: string[],
    sessionId: string
  ): Promise<OpenAICalendarResponse> {
    const tokenId = this.generateTokenId(sessionId);
    
    let naturalResponse: string;
    let fallbackSuggestion: string | undefined;

    if (canExecute) {
      // User has permission to execute the operation
      naturalResponse = this.generateSuccessResponse(intent);
    } else {
      // User lacks permission for the requested operation
      naturalResponse = this.generatePermissionDeniedResponse(intent);
      fallbackSuggestion = this.generateFallbackSuggestion(intent, availableOperations);
    }

    return {
      tokenId,
      intent,
      availableOperations,
      canExecute,
      fallbackSuggestion,
      naturalResponse
    };
  }

  /**
   * Generate success response message
   */
  private generateSuccessResponse(intent: NaturalLanguageIntent): string {
    switch (intent.intent) {
      case 'query':
        return "I'll search your calendar for those events.";
      case 'create':
        return "I'll create that event for you.";
      case 'update':
        return "I'll update that event as requested.";
      case 'delete':
        return "I'll remove that event from your calendar.";
      case 'move':
        return "I'll move that event to the specified calendar.";
      default:
        return "I'll process your calendar request.";
    }
  }

  /**
   * Generate permission denied response
   */
  private generatePermissionDeniedResponse(intent: NaturalLanguageIntent): string {
    switch (intent.intent) {
      case 'create':
        return "I don't have permission to create events. You'll need to grant write access to your calendar.";
      case 'update':
        return "I don't have permission to update events. Write access is required for this operation.";
      case 'delete':
        return "I don't have permission to delete events. Please grant write access to proceed.";
      case 'move':
        return "I don't have permission to move events between calendars.";
      default:
        return "I don't have the necessary permissions for that operation.";
    }
  }

  /**
   * Generate fallback suggestion based on available operations
   */
  private generateFallbackSuggestion(
    intent: NaturalLanguageIntent,
    availableOperations: string[]
  ): string {
    if (availableOperations.includes('search') || availableOperations.includes('fetch')) {
      return "However, I can help you search for and view your existing calendar events.";
    }
    return "Please grant additional calendar permissions to perform this action.";
  }

  /**
   * Generate unique token ID
   */
  private generateTokenId(sessionId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `cal_${sessionId}_${timestamp}_${random}`;
  }

  /**
   * Execute the calendar operation if permissions allow
   */
  async executeOperation(response: OpenAICalendarResponse): Promise<any> {
    if (!this.calendarConnector) {
      throw new Error('Calendar connector not initialized');
    }

    if (!response.canExecute) {
      throw new Error(response.naturalResponse);
    }

    const operation = this.mapIntentToOperation(response.intent);
    return this.calendarConnector.executeOperation(operation, response.intent.parameters);
  }
}

// Export factory function
export function createOpenAICalendarIntegration(
  apiKey: string,
  tokenId: string,
  scopes: string[]
): OpenAICalendarIntegration {
  const integration = new OpenAICalendarIntegration(apiKey);
  integration.initializeWithPermissions(tokenId, scopes);
  return integration;
}