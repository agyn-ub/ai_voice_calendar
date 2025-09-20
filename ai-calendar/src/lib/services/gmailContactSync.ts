import { google, gmail_v1 } from 'googleapis';
import { accountsDb } from '@/lib/db/accountsDb';
import { contactsDb } from '@/lib/db/contactsDb';

export class GmailContactSyncService {
  private gmail: gmail_v1.Gmail;
  private oauth2Client;

  constructor(accessToken: string, refreshToken: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/calendar/google/callback'
    );

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  static async createFromWallet(walletAddress: string): Promise<GmailContactSyncService | null> {
    const account = accountsDb.getAccountByWalletSync(walletAddress);
    if (!account || !account.access_token || !account.refresh_token) {
      return null;
    }
    return new GmailContactSyncService(
      account.access_token,
      account.refresh_token
    );
  }

  /**
   * Extract contacts from Gmail message headers
   * Only reads metadata (From, To, Cc, Bcc) without accessing message bodies
   */
  async extractContactsFromGmail(maxResults: number = 1000): Promise<Array<{ email: string; name: string | null }>> {
    const contactMap = new Map<string, { email: string; name: string | null }>();

    try {
      // List messages with metadata scope only
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults
      });

      if (!response.data.messages) {
        console.log('[Gmail] No messages found');
        return [];
      }

      console.log(`[Gmail] Processing ${response.data.messages.length} messages for contacts`);

      // Batch get message metadata
      const messagePromises = response.data.messages.map(message =>
        this.gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'METADATA',
          metadataHeaders: ['From', 'To', 'Cc', 'Bcc'],
        }).catch(err => {
          console.error(`[Gmail] Error fetching message ${message.id}:`, err.message);
          return null;
        })
      );

      const messages = await Promise.all(messagePromises);

      // Process each message's headers
      for (const messageResponse of messages) {
        if (!messageResponse?.data?.payload?.headers) continue;

        const headers = messageResponse.data.payload.headers;

        // Extract contacts from all email fields
        const emailFields = ['From', 'To', 'Cc', 'Bcc'];

        for (const field of emailFields) {
          const header = headers.find(h => h.name === field);
          if (!header?.value) continue;

          // Parse email addresses from header
          const addresses = this.parseEmailAddresses(header.value);

          for (const { email, name } of addresses) {
            // Skip noreply and system emails
            if (this.isSystemEmail(email)) continue;

            // Store contact with name if we have it, or update name if better
            if (contactMap.has(email)) {
              const existing = contactMap.get(email)!;
              // Update name if we found one and didn't have it before
              if (name && !existing.name) {
                existing.name = name;
              }
            } else {
              contactMap.set(email, {
                email,
                name: name || null,
              });
            }
          }
        }
      }

      // Convert map to array
      const contacts = Array.from(contactMap.values());

      console.log(`[Gmail] Extracted ${contacts.length} unique contacts`);

      return contacts;

    } catch (error) {
      console.error('[Gmail] Error extracting contacts:', error);
      throw error;
    }
  }

  /**
   * Parse email addresses from a header value
   * Handles formats like:
   * - "Name <email@example.com>"
   * - "email@example.com"
   * - "Name <email1@example.com>, Name2 <email2@example.com>"
   */
  private parseEmailAddresses(headerValue: string): { email: string; name?: string }[] {
    const results: { email: string; name?: string }[] = [];

    // Split by comma for multiple addresses
    const parts = headerValue.split(',');

    for (const part of parts) {
      const trimmed = part.trim();

      // Match "Name <email>" format
      const matchWithName = trimmed.match(/^"?([^"<>]+?)"?\s*<([^>]+)>$/);
      if (matchWithName) {
        const name = matchWithName[1].trim();
        const email = matchWithName[2].trim().toLowerCase();
        results.push({ email, name });
        continue;
      }

      // Match plain email format
      const matchEmail = trimmed.match(/^<?([^<>@]+@[^<>@]+)>?$/);
      if (matchEmail) {
        const email = matchEmail[1].trim().toLowerCase();
        results.push({ email });
      }
    }

    return results;
  }

  /**
   * Check if an email is a system/noreply address
   */
  private isSystemEmail(email: string): boolean {
    const systemPatterns = [
      /^no-?reply@/i,
      /^do-?not-?reply@/i,
      /^notifications?@/i,
      /^system@/i,
      /^alerts?@/i,
      /^mailer@/i,
      /^postmaster@/i,
      /^bounce@/i,
      /@noreply\./i,
    ];

    return systemPatterns.some(pattern => pattern.test(email));
  }

  /**
   * Get a summary of extracted contacts
   */
  async getContactsSummary(maxResults: number = 1000): Promise<{
    totalContacts: number;
    sampleContacts: Array<{ email: string; name: string | null }>;
    withNames: number;
    withoutNames: number;
  }> {
    const contacts = await this.extractContactsFromGmail(maxResults);

    return {
      totalContacts: contacts.length,
      sampleContacts: contacts.slice(0, 20),
      withNames: contacts.filter(c => c.name !== null).length,
      withoutNames: contacts.filter(c => c.name === null).length,
    };
  }
}