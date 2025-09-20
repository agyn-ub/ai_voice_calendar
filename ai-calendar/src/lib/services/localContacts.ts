import { accountsDb } from '@/lib/db/accountsDb';
import { contactsDb } from '@/lib/db/contactsDb';

export interface ResolveResult {
  resolved: string[];  // Array of resolved email addresses
  details: string[];   // Human-readable resolution details
}

class LocalContactsService {
  /**
   * Resolve attendees from names or emails using local database
   */
  async resolveAttendees(walletAddress: string, attendees: string[]): Promise<ResolveResult> {
    console.log(`[LocalContacts] Resolving ${attendees.length} attendees for wallet: ${walletAddress}`);

    // Get account ID
    const account = accountsDb.getAccountByWalletSync(walletAddress);
    if (!account || !account.id) {
      console.warn('[LocalContacts] No account found for wallet address');
      return { resolved: [], details: ['✗ No calendar connection found'] };
    }

    const resolved: string[] = [];
    const details: string[] = [];

    for (const attendee of attendees) {
      if (!attendee || attendee.trim() === '') {
        continue;
      }

      const trimmed = attendee.trim();

      // Check if it's an email address
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(trimmed)) {
        // It's already an email address, use it directly
        console.log(`[LocalContacts] ✓ Direct email: ${trimmed}`);
        resolved.push(trimmed.toLowerCase());
        details.push(`✓ ${trimmed} (email address)`);
      } else {
        // It's a name, search in contacts
        const contact = contactsDb.findBestMatch(account.id, trimmed);

        if (contact) {
          console.log(`[LocalContacts] ✓ Resolved "${trimmed}" to ${contact.name || 'Unknown'} (${contact.email})`);
          resolved.push(contact.email);
          details.push(`✓ ${contact.name || trimmed} (${contact.email})`);
        } else {
          // Could not resolve - log but don't fail
          console.warn(`[LocalContacts] ✗ Could not find contact for: "${trimmed}"`);
          details.push(`✗ ${trimmed} (contact not found)`);
        }
      }
    }

    console.log(`[LocalContacts] Resolution complete. Resolved ${resolved.length}/${attendees.length} attendees`);
    return { resolved, details };
  }

  /**
   * Search contacts by name
   */
  async searchContactsByName(walletAddress: string, searchQuery: string) {
    const account = accountsDb.getAccountByWalletSync(walletAddress);
    if (!account || !account.id) {
      console.warn('[LocalContacts] No account found for wallet address');
      return [];
    }

    const results = contactsDb.searchContactsByName(account.id, searchQuery);

    // Map to format expected by existing code
    return results.map(contact => ({
      name: contact.name || contact.email,
      email: contact.email,
      confidence: this.mapConfidenceLevel(contact.confidence)
    }));
  }

  /**
   * Get the best matching contact's email for a given name
   */
  async getContactEmail(walletAddress: string, name: string): Promise<{ email: string; displayName: string } | null> {
    const account = accountsDb.getAccountByWalletSync(walletAddress);
    if (!account || !account.id) {
      return null;
    }

    const contact = contactsDb.findBestMatch(account.id, name);

    if (contact) {
      return {
        email: contact.email,
        displayName: contact.name || contact.email
      };
    }

    return null;
  }

  /**
   * Get all contacts for a wallet
   */
  async listContacts(walletAddress: string, limit: number = 100) {
    const account = accountsDb.getAccountByWalletSync(walletAddress);
    if (!account || !account.id) {
      return [];
    }

    const contacts = contactsDb.getContacts(account.id, limit);

    // Format for compatibility with existing code
    return contacts.map(contact => ({
      name: contact.name || 'No Name',
      firstName: contact.name ? contact.name.split(' ')[0] : undefined,
      lastName: contact.name ? contact.name.split(' ').slice(1).join(' ') : undefined,
      primaryEmail: contact.email,
      emails: [{ value: contact.email, type: 'other', primary: true }]
    }));
  }

  /**
   * Get contact count
   */
  async getContactCount(walletAddress: string): number {
    const account = accountsDb.getAccountByWalletSync(walletAddress);
    if (!account || !account.id) {
      return 0;
    }

    return contactsDb.getContactCount(account.id);
  }

  /**
   * Map confidence score to level
   */
  private mapConfidenceLevel(score: number): 'exact' | 'high' | 'medium' | 'low' {
    if (score >= 0.95) return 'exact';
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  }
}

// Export singleton instance
export const localContactsService = new LocalContactsService();
export default localContactsService;