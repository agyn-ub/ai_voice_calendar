import { google } from 'googleapis';
import { getCalendarConnection, updateTokens } from '@/lib/db';

interface ContactMatch {
  name: string;
  email: string;
  confidence: 'exact' | 'high' | 'medium' | 'low';
}

export class GoogleContactsService {
  private oauth2Client;
  
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/calendar/google/callback'
    );
  }
  
  /**
   * Get a valid access token for the user (refreshing if needed)
   */
  private async getValidToken(walletAddress: string): Promise<string | null> {
    const connection = getCalendarConnection(walletAddress);
    
    if (!connection || !connection.access_token) {
      return null;
    }
    
    // Check if token is expired (with 5 minute buffer)
    const now = Math.floor(Date.now() / 1000);
    const bufferTime = 300; // 5 minutes
    
    if (connection.token_expiry && connection.token_expiry - bufferTime <= now) {
      // Token is expired or about to expire, refresh it
      return await this.refreshAccessToken(walletAddress);
    }
    
    return connection.access_token;
  }
  
  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(walletAddress: string): Promise<string | null> {
    const connection = getCalendarConnection(walletAddress);
    
    if (!connection || !connection.refresh_token) {
      console.error('No refresh token found for wallet:', walletAddress);
      return null;
    }
    
    try {
      this.oauth2Client.setCredentials({
        refresh_token: connection.refresh_token
      });
      
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      if (credentials.access_token) {
        // Update tokens in database
        const tokenExpiry = credentials.expiry_date ? 
          Math.floor(credentials.expiry_date / 1000) : 
          Math.floor(Date.now() / 1000) + 3600;
        
        updateTokens(
          walletAddress,
          credentials.access_token,
          credentials.refresh_token || connection.refresh_token,
          tokenExpiry
        );
        
        return credentials.access_token;
      }
    } catch (error) {
      console.error('Error refreshing token for contacts:', error);
      return null;
    }
    
    return null;
  }
  
  /**
   * Search contacts by name and return matches with email addresses
   */
  async searchContactsByName(walletAddress: string, searchName: string): Promise<ContactMatch[]> {
    console.log(`[Contacts] Starting search for: "${searchName}"`);
    
    const accessToken = await this.getValidToken(walletAddress);
    
    if (!accessToken) {
      console.error('[Contacts] No valid access token available');
      throw new Error('No valid access token available for contacts');
    }
    
    this.oauth2Client.setCredentials({
      access_token: accessToken
    });
    
    const people = google.people({ version: 'v1', auth: this.oauth2Client });
    
    try {
      // First, send a warmup request with empty query to update cache
      console.log('[Contacts] Sending warmup request...');
      await people.people.searchContacts({
        query: '',
        readMask: 'names,emailAddresses',
        pageSize: 1
      });
      
      // Now search for the actual contact
      console.log(`[Contacts] Searching for: "${searchName}"`);
      const response = await people.people.searchContacts({
        query: searchName,
        readMask: 'names,emailAddresses,nicknames,organizations',
        pageSize: 30
      });
      
      const matches: ContactMatch[] = [];
      
      if (response.data.results) {
        console.log(`[Contacts] Found ${response.data.results.length} potential matches`);
        
        for (const result of response.data.results) {
          const person = result.person;
          
          if (person?.emailAddresses && person.emailAddresses.length > 0) {
            // Get the display name
            const displayName = person.names?.[0]?.displayName || 
                              person.nicknames?.[0]?.value || 
                              'Unknown';
            
            // Get primary email or first available
            const primaryEmail = person.emailAddresses.find(e => e.metadata?.primary)?.value ||
                               person.emailAddresses[0].value;
            
            if (primaryEmail) {
              // Calculate confidence based on match quality
              const confidence = this.calculateConfidence(searchName, displayName);
              
              console.log(`[Contacts] Match found: ${displayName} (${primaryEmail}) - Confidence: ${confidence}`);
              
              matches.push({
                name: displayName,
                email: primaryEmail,
                confidence
              });
            }
          }
        }
      } else {
        console.log('[Contacts] No results returned from search');
      }
      
      // Sort by confidence level
      const confidenceOrder = { exact: 0, high: 1, medium: 2, low: 3 };
      matches.sort((a, b) => confidenceOrder[a.confidence] - confidenceOrder[b.confidence]);
      
      console.log(`[Contacts] Returning ${matches.length} matches sorted by confidence`);
      return matches;
    } catch (error) {
      console.error('Error searching contacts:', error);
      
      // If it's a scope error, provide helpful message
      if (error instanceof Error && error.message.includes('insufficient')) {
        throw new Error('Calendar needs to be reconnected with contacts permission. Please disconnect and reconnect your Google Calendar.');
      }
      
      throw error;
    }
  }
  
  /**
   * Calculate confidence level for a contact match
   */
  private calculateConfidence(searchName: string, contactName: string): 'exact' | 'high' | 'medium' | 'low' {
    const searchLower = searchName.toLowerCase().trim();
    const contactLower = contactName.toLowerCase().trim();
    
    // Exact match
    if (searchLower === contactLower) {
      return 'exact';
    }
    
    // First name exact match (e.g., "Tom" matches "Tom Smith")
    const contactFirstName = contactLower.split(' ')[0];
    if (searchLower === contactFirstName) {
      return 'high';
    }
    
    // Contact name contains search name
    if (contactLower.includes(searchLower)) {
      return 'medium';
    }
    
    // Search name contains part of contact name or vice versa
    return 'low';
  }
  
  /**
   * Get the best matching contact's email for a given name
   * Returns null if no match or multiple ambiguous matches
   */
  async getContactEmail(walletAddress: string, name: string): Promise<{ email: string; displayName: string } | null> {
    try {
      const matches = await this.searchContactsByName(walletAddress, name);
      
      if (matches.length === 0) {
        return null;
      }
      
      // If we have an exact match, use it
      const exactMatch = matches.find(m => m.confidence === 'exact');
      if (exactMatch) {
        return { email: exactMatch.email, displayName: exactMatch.name };
      }
      
      // If we have only one high confidence match, use it
      const highMatches = matches.filter(m => m.confidence === 'high');
      if (highMatches.length === 1) {
        return { email: highMatches[0].email, displayName: highMatches[0].name };
      }
      
      // If we have multiple matches with same confidence, it's ambiguous
      // Return the first one but log a warning
      if (matches.length > 1) {
        console.warn(`Multiple contacts found for "${name}":`, matches.map(m => m.name));
      }
      
      // Return the best match we have
      return { email: matches[0].email, displayName: matches[0].name };
    } catch (error) {
      console.error('Error getting contact email:', error);
      return null;
    }
  }
  
  /**
   * Check if a string is an email address
   */
  static isEmailAddress(str: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(str);
  }
  
  /**
   * Resolve attendees - convert names to emails where needed
   */
  async resolveAttendees(
    walletAddress: string, 
    attendees: string[]
  ): Promise<{ resolved: string[]; details: string[] }> {
    console.log(`[Contacts] Resolving ${attendees.length} attendees:`, attendees);
    
    const resolved: string[] = [];
    const details: string[] = [];
    
    for (const attendee of attendees) {
      // If it's already an email, use it as-is
      if (GoogleContactsService.isEmailAddress(attendee)) {
        console.log(`[Contacts] "${attendee}" is already an email address`);
        resolved.push(attendee);
        details.push(`✓ ${attendee}`);
      } else {
        // Try to find the contact
        console.log(`[Contacts] Looking up contact for: "${attendee}"`);
        const contact = await this.getContactEmail(walletAddress, attendee);
        
        if (contact) {
          console.log(`[Contacts] ✓ Resolved "${attendee}" to ${contact.displayName} (${contact.email})`);
          resolved.push(contact.email);
          details.push(`✓ ${contact.displayName} (${contact.email})`);
        } else {
          // Could not resolve - log but don't fail
          console.warn(`[Contacts] ✗ Could not find contact for: "${attendee}"`);
          details.push(`✗ ${attendee} (contact not found)`);
        }
      }
    }
    
    console.log(`[Contacts] Resolution complete. Resolved ${resolved.length}/${attendees.length} attendees`);
    return { resolved, details };
  }
}

// Export singleton instance
export const googleContactsService = new GoogleContactsService();