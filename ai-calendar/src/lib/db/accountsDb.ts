import db, { encrypt, decrypt } from './sqlite';

export interface Account {
  id?: number;
  wallet_address: string;
  google_email?: string;
  access_token?: string;
  refresh_token?: string;
  token_expiry?: number;
  scopes?: string;
  last_sync_at?: number;
  created_at?: number;
  updated_at?: number;
}

export interface TokenUpdate {
  access_token: string;
  refresh_token?: string;
  token_expiry?: number;
}

class AccountsDatabase {
  private createStmt = db.prepare(`
    INSERT INTO accounts (wallet_address, google_email, access_token, refresh_token, token_expiry, scopes)
    VALUES (@wallet_address, @google_email, @access_token, @refresh_token, @token_expiry, @scopes)
  `);

  private updateStmt = db.prepare(`
    UPDATE accounts
    SET google_email = @google_email,
        access_token = @access_token,
        refresh_token = @refresh_token,
        token_expiry = @token_expiry,
        scopes = @scopes,
        updated_at = unixepoch()
    WHERE wallet_address = @wallet_address
  `);

  private getByWalletStmt = db.prepare(`
    SELECT * FROM accounts WHERE wallet_address = ?
  `);

  private getByIdStmt = db.prepare(`
    SELECT * FROM accounts WHERE id = ?
  `);

  private updateTokensStmt = db.prepare(`
    UPDATE accounts
    SET access_token = @access_token,
        refresh_token = COALESCE(@refresh_token, refresh_token),
        token_expiry = @token_expiry,
        updated_at = unixepoch()
    WHERE id = @id
  `);

  private updateSyncTimeStmt = db.prepare(`
    UPDATE accounts
    SET last_sync_at = unixepoch(),
        updated_at = unixepoch()
    WHERE id = ?
  `);

  private deleteStmt = db.prepare(`
    DELETE FROM accounts WHERE wallet_address = ?
  `);

  /**
   * Create or update an account
   */
  public createOrUpdateAccount(account: Account): Account {
    const existing = this.getByWalletStmt.get(account.wallet_address) as Account | undefined;

    // Encrypt tokens before saving
    const encryptedAccount = {
      ...account,
      access_token: account.access_token ? encrypt(account.access_token) : undefined,
      refresh_token: account.refresh_token ? encrypt(account.refresh_token) : undefined,
    };

    if (existing) {
      // Update existing account
      this.updateStmt.run(encryptedAccount);
      return this.getAccountByWallet(account.wallet_address)!;
    } else {
      // Create new account
      const result = this.createStmt.run(encryptedAccount);
      return this.getAccountById(result.lastInsertRowid as number)!;
    }
  }

  /**
   * Get account by wallet address
   */
  public getAccountByWallet(walletAddress: string): Account | null {
    const account = this.getByWalletStmt.get(walletAddress) as Account | undefined;

    if (!account) return null;

    // Decrypt tokens before returning
    return {
      ...account,
      access_token: account.access_token ? decrypt(account.access_token) : undefined,
      refresh_token: account.refresh_token ? decrypt(account.refresh_token) : undefined,
    };
  }

  /**
   * Get account by ID
   */
  public getAccountById(id: number): Account | null {
    const account = this.getByIdStmt.get(id) as Account | undefined;

    if (!account) return null;

    // Decrypt tokens before returning
    return {
      ...account,
      access_token: account.access_token ? decrypt(account.access_token) : undefined,
      refresh_token: account.refresh_token ? decrypt(account.refresh_token) : undefined,
    };
  }

  /**
   * Update account tokens
   */
  public updateTokens(accountId: number, tokens: TokenUpdate): boolean {
    const encryptedTokens = {
      id: accountId,
      access_token: encrypt(tokens.access_token),
      refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
      token_expiry: tokens.token_expiry,
    };

    const result = this.updateTokensStmt.run(encryptedTokens);
    return result.changes > 0;
  }

  /**
   * Update last sync timestamp
   */
  public updateSyncTime(accountId: number): boolean {
    const result = this.updateSyncTimeStmt.run(accountId);
    return result.changes > 0;
  }

  /**
   * Delete account by wallet address
   */
  public deleteAccount(walletAddress: string): boolean {
    const result = this.deleteStmt.run(walletAddress);
    return result.changes > 0;
  }

  /**
   * Get valid access token, refreshing if needed
   */
  public async getValidAccessToken(accountId: number): Promise<string | null> {
    const account = this.getAccountById(accountId);
    if (!account || !account.access_token || !account.refresh_token) {
      return null;
    }

    // Check if token is expired (with 5 minute buffer)
    const now = Math.floor(Date.now() / 1000);
    if (account.token_expiry && account.token_expiry > now + 300) {
      return account.access_token;
    }

    // Token needs refresh - this would need to be implemented
    // For now, return the existing token
    // In production, this should call Google's OAuth2 refresh endpoint
    console.log('[Accounts] Token refresh needed for account', accountId);
    return account.access_token;
  }
}

// Export singleton instance
export const accountsDb = new AccountsDatabase();
export default accountsDb;