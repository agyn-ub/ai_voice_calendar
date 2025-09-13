import { calendar_v3 } from 'googleapis';

export interface CalendarToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    optional?: boolean;
  }>;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  recurrence?: string[];
  colorId?: string;
}

export interface GetEventsParams {
  wallet_address: string;
  timeMin?: string;
  timeMax?: string;
  searchQuery?: string;
  maxResults?: number;
}

export interface CreateEventParams {
  wallet_address: string;
  event: CalendarEventInput;
}

export interface UpdateEventParams {
  wallet_address: string;
  eventId: string;
  event: Partial<CalendarEventInput>;
}

export interface DeleteEventParams {
  wallet_address: string;
  eventId: string;
}

export interface SearchEventsParams {
  wallet_address: string;
  query: string;
  timeMin?: string;
  timeMax?: string;
}

export interface AssistantRequest {
  wallet_address: string;
  message: string;
  conversation_id?: string;
  timezone?: string;
}

export interface AssistantResponse {
  message: string;
  actions_taken?: Array<{
    type: 'get_events' | 'create_event' | 'update_event' | 'delete_event' | 'search_events';
    status: 'success' | 'error';
    details?: any;
  }>;
  events?: calendar_v3.Schema$Event[];
  conversation_id: string;
}

export const CALENDAR_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_calendar_events',
      description: 'Get calendar events within a specified time range',
      parameters: {
        type: 'object',
        properties: {
          timeMin: {
            type: 'string',
            description: 'Start time in ISO 8601 format (e.g., 2024-01-15T09:00:00Z)'
          },
          timeMax: {
            type: 'string',
            description: 'End time in ISO 8601 format'
          },
          searchQuery: {
            type: 'string',
            description: 'Optional search query to filter events'
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of events to return (default: 50)'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_calendar_event',
      description: 'Create a new calendar event',
      parameters: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: 'Event title'
          },
          description: {
            type: 'string',
            description: 'Event description'
          },
          location: {
            type: 'string',
            description: 'Event location'
          },
          startDateTime: {
            type: 'string',
            description: 'Start date and time in ISO 8601 format'
          },
          endDateTime: {
            type: 'string',
            description: 'End date and time in ISO 8601 format'
          },
          attendeeEmails: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'List of attendee email addresses'
          },
          reminderMinutes: {
            type: 'number',
            description: 'Reminder time in minutes before the event'
          },
          isAllDay: {
            type: 'boolean',
            description: 'Whether this is an all-day event'
          },
          recurrence: {
            type: 'string',
            description: 'Recurrence rule (e.g., "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR")'
          }
        },
        required: ['summary', 'startDateTime', 'endDateTime']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_calendar_event',
      description: 'Update an existing calendar event',
      parameters: {
        type: 'object',
        properties: {
          eventId: {
            type: 'string',
            description: 'ID of the event to update'
          },
          summary: {
            type: 'string',
            description: 'New event title'
          },
          description: {
            type: 'string',
            description: 'New event description'
          },
          location: {
            type: 'string',
            description: 'New event location'
          },
          startDateTime: {
            type: 'string',
            description: 'New start date and time in ISO 8601 format'
          },
          endDateTime: {
            type: 'string',
            description: 'New end date and time in ISO 8601 format'
          },
          attendeeEmails: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Updated list of attendee email addresses'
          }
        },
        required: ['eventId']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'delete_calendar_event',
      description: 'Delete a calendar event',
      parameters: {
        type: 'object',
        properties: {
          eventId: {
            type: 'string',
            description: 'ID of the event to delete'
          }
        },
        required: ['eventId']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_calendar_events',
      description: 'Search for calendar events by keyword or phrase',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query to find events'
          },
          timeMin: {
            type: 'string',
            description: 'Start time for search range in ISO 8601 format'
          },
          timeMax: {
            type: 'string',
            description: 'End time for search range in ISO 8601 format'
          }
        },
        required: ['query']
      }
    }
  }
];