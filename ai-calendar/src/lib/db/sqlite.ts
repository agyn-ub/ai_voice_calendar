import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const DB_PATH = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'calendar.db');
const ENCRYPTION_KEY = process.env.JWT_SECRET || 'default-dev-secret-change-in-production';

// Encryption utilities
export function encrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const [ivHex, encrypted] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

class SqliteDatabase {
  private db: Database.Database;
  private static instance: SqliteDatabase;

  private constructor() {
    // Initialize database connection
    this.db = new Database(DB_PATH);

    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Optimize for performance
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');

    // Initialize schema
    this.initializeSchema();
  }

  public static getInstance(): SqliteDatabase {
    if (!SqliteDatabase.instance) {
      SqliteDatabase.instance = new SqliteDatabase();
    }
    return SqliteDatabase.instance;
  }

  private initializeSchema() {
    // Create accounts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wallet_address TEXT UNIQUE NOT NULL,
        google_email TEXT,
        access_token TEXT,
        refresh_token TEXT,
        token_expiry INTEGER,
        scopes TEXT,
        last_sync_at INTEGER,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      )
    `);

    // Create contacts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        email TEXT NOT NULL,
        name TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
        UNIQUE(account_id, email)
      )
    `);

    // Create meeting_stakes table (for future use)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS meeting_stakes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meeting_id TEXT UNIQUE NOT NULL,
        event_id TEXT,
        organizer TEXT,
        required_stake REAL,
        start_time TEXT,
        end_time TEXT,
        attendance_code TEXT,
        code_generated_at TEXT,
        is_settled INTEGER DEFAULT 0,
        stakes TEXT,
        created_at INTEGER DEFAULT (unixepoch())
      )
    `);

    // Create indexes
    this.createIndexes();
  }

  private createIndexes() {
    // Account indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_wallet_address
      ON accounts(wallet_address);
    `);

    // Contact indexes for fast searching
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_account_contacts
      ON contacts(account_id, name COLLATE NOCASE);
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_account_email
      ON contacts(account_id, email);
    `);

    // Meeting stakes index
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_meeting_organizer
      ON meeting_stakes(organizer);
    `);
  }

  public getDb(): Database.Database {
    return this.db;
  }

  // Prepared statements for common operations
  public prepare(sql: string) {
    return this.db.prepare(sql);
  }

  // Transaction support
  public transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  // Close database connection (for cleanup)
  public close() {
    this.db.close();
  }
}

// Export singleton instance
export const db = SqliteDatabase.getInstance();
export default db;