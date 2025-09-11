// Google Calendar Connector with OpenAI GPT-5-mini
// Handles both read and write operations based on user permissions

export interface CalendarPermissions {
  read: boolean;
  write: boolean;
  scopes: string[];
}

export interface CalendarOperation {
  action: 'get_profile' | 'search' | 'fetch' | 'search_events' | 'read_event' | 
          'create_event' | 'update_event' | 'delete_event' | 'move_event';
  requiresWrite: boolean;
  requiredScopes: string[];
}

// Define available operations based on permissions
export const CALENDAR_OPERATIONS: Record<string, CalendarOperation> = {
  // Read-only operations (always available)
  get_profile: {
    action: 'get_profile',
    requiresWrite: false,
    requiredScopes: ['userinfo.email', 'userinfo.profile']
  },
  search: {
    action: 'search',
    requiresWrite: false,
    requiredScopes: ['calendar.events.readonly', 'calendar.readonly']
  },
  fetch: {
    action: 'fetch',
    requiresWrite: false,
    requiredScopes: ['calendar.events.readonly', 'calendar.readonly']
  },
  search_events: {
    action: 'search_events',
    requiresWrite: false,
    requiredScopes: ['calendar.events.readonly', 'calendar.readonly']
  },
  read_event: {
    action: 'read_event',
    requiresWrite: false,
    requiredScopes: ['calendar.events.readonly', 'calendar.readonly']
  },
  
  // Write operations (require write permissions)
  create_event: {
    action: 'create_event',
    requiresWrite: true,
    requiredScopes: ['calendar.events', 'calendar']
  },
  update_event: {
    action: 'update_event',
    requiresWrite: true,
    requiredScopes: ['calendar.events', 'calendar']
  },
  delete_event: {
    action: 'delete_event',
    requiresWrite: true,
    requiredScopes: ['calendar.events', 'calendar']
  },
  move_event: {
    action: 'move_event',
    requiresWrite: true,
    requiredScopes: ['calendar.events', 'calendar']
  }
};

export class GoogleCalendarConnector {
  private tokenId: string;
  private permissions: CalendarPermissions;
  private availableOperations: Set<string>;

  constructor(tokenId: string, scopes: string[]) {
    this.tokenId = tokenId;
    this.permissions = this.parsePermissions(scopes);
    this.availableOperations = this.determineAvailableOperations(scopes);
  }

  /**
   * Parse OAuth scopes to determine permissions
   */
  private parsePermissions(scopes: string[]): CalendarPermissions {
    const scopeString = scopes.join(' ');
    
    return {
      read: scopeString.includes('calendar.readonly') || 
            scopeString.includes('calendar.events.readonly') ||
            scopeString.includes('calendar.events') ||
            scopeString.includes('calendar'),
      write: scopeString.includes('calendar.events') || 
             scopeString.includes('calendar'),
      scopes: scopes
    };
  }

  /**
   * Determine which operations are available based on scopes
   */
  private determineAvailableOperations(scopes: string[]): Set<string> {
    const available = new Set<string>();
    
    for (const [name, operation] of Object.entries(CALENDAR_OPERATIONS)) {
      const hasRequiredScopes = operation.requiredScopes.some(required => 
        scopes.some(scope => scope.includes(required.replace('.readonly', '')))
      );
      
      if (hasRequiredScopes) {
        available.add(name);
      }
    }
    
    return available;
  }

  /**
   * Check if an operation is available
   */
  canPerformOperation(operation: string): boolean {
    return this.availableOperations.has(operation);
  }

  /**
   * Get list of available operations
   */
  getAvailableOperations(): string[] {
    return Array.from(this.availableOperations);
  }

  /**
   * Execute calendar operation based on permissions
   */
  async executeOperation(operation: string, params: any): Promise<any> {
    if (!this.canPerformOperation(operation)) {
      throw new Error(`Operation '${operation}' not available with current permissions. Required scopes: ${CALENDAR_OPERATIONS[operation]?.requiredScopes.join(', ')}`);
    }

    // Route to appropriate handler based on operation
    switch (operation) {
      // Read operations
      case 'get_profile':
        return this.getProfile();
      case 'search':
        return this.searchEvents(params);
      case 'fetch':
        return this.fetchEvent(params.eventId);
      case 'search_events':
        return this.searchEventsAdvanced(params);
      case 'read_event':
        return this.readEvent(params.eventId);
      
      // Write operations (only if permissions allow)
      case 'create_event':
        return this.createEvent(params);
      case 'update_event':
        return this.updateEvent(params.eventId, params.updates);
      case 'delete_event':
        return this.deleteEvent(params.eventId);
      case 'move_event':
        return this.moveEvent(params.eventId, params.calendarId);
      
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  // Read-only operations
  private async getProfile(): Promise<any> {
    // Implementation for getting user profile
    return {
      tokenId: this.tokenId,
      operation: 'get_profile',
      // Actual API call would go here
    };
  }

  private async searchEvents(params: any): Promise<any> {
    // Implementation for searching events
    return {
      tokenId: this.tokenId,
      operation: 'search',
      timeMin: params.timeMin,
      timeMax: params.timeMax,
      // Actual API call would go here
    };
  }

  private async fetchEvent(eventId: string): Promise<any> {
    // Implementation for fetching single event
    return {
      tokenId: this.tokenId,
      operation: 'fetch',
      eventId,
      // Actual API call would go here
    };
  }

  private async searchEventsAdvanced(params: any): Promise<any> {
    // Implementation for advanced search
    return {
      tokenId: this.tokenId,
      operation: 'search_events',
      filters: params,
      // Actual API call would go here
    };
  }

  private async readEvent(eventId: string): Promise<any> {
    // Implementation for reading event by ID
    return {
      tokenId: this.tokenId,
      operation: 'read_event',
      eventId,
      // Actual API call would go here
    };
  }

  // Write operations (only available with write permissions)
  private async createEvent(params: any): Promise<any> {
    if (!this.permissions.write) {
      throw new Error('Write permission required for creating events');
    }
    
    return {
      tokenId: this.tokenId,
      operation: 'create_event',
      event: params,
      // Actual API call would go here
    };
  }

  private async updateEvent(eventId: string, updates: any): Promise<any> {
    if (!this.permissions.write) {
      throw new Error('Write permission required for updating events');
    }
    
    return {
      tokenId: this.tokenId,
      operation: 'update_event',
      eventId,
      updates,
      // Actual API call would go here
    };
  }

  private async deleteEvent(eventId: string): Promise<any> {
    if (!this.permissions.write) {
      throw new Error('Write permission required for deleting events');
    }
    
    return {
      tokenId: this.tokenId,
      operation: 'delete_event',
      eventId,
      // Actual API call would go here
    };
  }

  private async moveEvent(eventId: string, calendarId: string): Promise<any> {
    if (!this.permissions.write) {
      throw new Error('Write permission required for moving events');
    }
    
    return {
      tokenId: this.tokenId,
      operation: 'move_event',
      eventId,
      calendarId,
      // Actual API call would go here
    };
  }
}

// Helper function to create connector based on user permissions
export function createCalendarConnector(tokenId: string, scopes: string[]): GoogleCalendarConnector {
  return new GoogleCalendarConnector(tokenId, scopes);
}