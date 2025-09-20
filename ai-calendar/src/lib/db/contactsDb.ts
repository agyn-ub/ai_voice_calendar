import db from './sqlite';

export interface Contact {
  id?: number;
  account_id: number;
  email: string;
  name?: string | null;
  created_at?: number;
}

export interface ContactSearchResult {
  email: string;
  name: string | null;
  confidence: number;
}

class ContactsDatabase {
  // Prepared statements
  private insertStmt = db.prepare(`
    INSERT OR IGNORE INTO contacts (account_id, email, name)
    VALUES (@account_id, @email, @name)
  `);

  private bulkInsertStmt = db.prepare(`
    INSERT OR IGNORE INTO contacts (account_id, email, name)
    VALUES (?, ?, ?)
  `);

  private getByEmailStmt = db.prepare(`
    SELECT * FROM contacts
    WHERE account_id = ? AND email = ?
  `);

  private searchByNameStmt = db.prepare(`
    SELECT email, name FROM contacts
    WHERE account_id = ?
    AND (
      name LIKE ?
      OR name LIKE ?
      OR name LIKE ?
    )
    ORDER BY
      CASE
        WHEN name LIKE ? THEN 1  -- Exact match
        WHEN name LIKE ? THEN 2  -- Starts with
        ELSE 3                    -- Contains
      END,
      name
    LIMIT 50
  `);

  private searchByEmailStmt = db.prepare(`
    SELECT email, name FROM contacts
    WHERE account_id = ?
    AND email LIKE ?
    ORDER BY email
    LIMIT 50
  `);

  private getAllStmt = db.prepare(`
    SELECT * FROM contacts
    WHERE account_id = ?
    ORDER BY name, email
    LIMIT ?
  `);

  private countStmt = db.prepare(`
    SELECT COUNT(*) as count FROM contacts
    WHERE account_id = ?
  `);

  private clearStmt = db.prepare(`
    DELETE FROM contacts WHERE account_id = ?
  `);

  /**
   * Save contacts for an account (batch operation)
   */
  public saveContacts(accountId: number, contacts: Array<{ email: string; name?: string | null }>): number {
    let inserted = 0;

    // Use transaction for batch insert
    const insertMany = db.transaction((contacts: Array<{ email: string; name?: string | null }>) => {
      for (const contact of contacts) {
        const result = this.bulkInsertStmt.run(
          accountId,
          contact.email.toLowerCase(),
          contact.name || null
        );
        if (result.changes > 0) inserted++;
      }
    });

    insertMany(contacts);
    console.log(`[ContactsDB] Inserted ${inserted} new contacts for account ${accountId}`);
    return inserted;
  }

  /**
   * Search contacts by name
   */
  public searchContactsByName(accountId: number, searchQuery: string): ContactSearchResult[] {
    const query = searchQuery.trim();

    // Prepare search patterns
    const exactMatch = query;
    const startsWithPattern = `${query}%`;
    const containsPattern = `%${query}%`;
    const lastNamePattern = `% ${query}%`;

    const results = this.searchByNameStmt.all(
      accountId,
      exactMatch,           // For exact match check
      startsWithPattern,    // For starts with check
      containsPattern,       // For contains check
      exactMatch,           // For ordering - exact match
      startsWithPattern     // For ordering - starts with
    ) as Array<{ email: string; name: string | null }>;

    // Calculate confidence scores
    return results.map(contact => {
      let confidence = 0.5; // Base confidence

      if (!contact.name) {
        confidence = 0.3;
      } else {
        const nameLower = contact.name.toLowerCase();
        const queryLower = query.toLowerCase();

        if (nameLower === queryLower) {
          confidence = 1.0; // Exact match
        } else if (nameLower.startsWith(queryLower)) {
          confidence = 0.9; // Starts with
        } else if (nameLower.includes(` ${queryLower}`)) {
          confidence = 0.8; // Last name match
        } else if (nameLower.includes(queryLower)) {
          confidence = 0.6; // Contains
        }
      }

      return {
        email: contact.email,
        name: contact.name,
        confidence
      };
    });
  }

  /**
   * Search contacts by email
   */
  public searchContactsByEmail(accountId: number, emailQuery: string): ContactSearchResult[] {
    const results = this.searchByEmailStmt.all(
      accountId,
      `%${emailQuery}%`
    ) as Array<{ email: string; name: string | null }>;

    return results.map(contact => ({
      email: contact.email,
      name: contact.name,
      confidence: contact.email.toLowerCase() === emailQuery.toLowerCase() ? 1.0 : 0.7
    }));
  }

  /**
   * Get contact by exact email
   */
  public getContactByEmail(accountId: number, email: string): Contact | null {
    const contact = this.getByEmailStmt.get(accountId, email.toLowerCase()) as Contact | undefined;
    return contact || null;
  }

  /**
   * Get all contacts for an account
   */
  public getContacts(accountId: number, limit: number = 1000): Contact[] {
    return this.getAllStmt.all(accountId, limit) as Contact[];
  }

  /**
   * Get contact count for an account
   */
  public getContactCount(accountId: number): number {
    const result = this.countStmt.get(accountId) as { count: number };
    return result.count;
  }

  /**
   * Clear all contacts for an account
   */
  public clearContacts(accountId: number): boolean {
    const result = this.clearStmt.run(accountId);
    console.log(`[ContactsDB] Cleared ${result.changes} contacts for account ${accountId}`);
    return result.changes > 0;
  }

  /**
   * Search for the best matching contact
   */
  public findBestMatch(accountId: number, query: string): { email: string; name: string | null } | null {
    // First check if it's an email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(query.trim())) {
      return { email: query.trim(), name: null };
    }

    // Search by name
    const matches = this.searchContactsByName(accountId, query);

    // Return best match if confidence is high enough
    if (matches.length > 0 && matches[0].confidence >= 0.7) {
      return {
        email: matches[0].email,
        name: matches[0].name
      };
    }

    return null;
  }
}

// Export singleton instance
export const contactsDb = new ContactsDatabase();
export default contactsDb;