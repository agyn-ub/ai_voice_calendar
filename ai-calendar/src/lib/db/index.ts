import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

const DB_PATH = process.env.DATABASE_PATH || './calendar.db';
const ENCRYPTION_KEY = process.env.JWT_SECRET || 'default-dev-secret-change-in-production';

let db: Database.Database | null = null;

export interface CalendarConnection {
  id?: number;
  wallet_address: string;
  google_email?: string;
  access_token?: string;
  refresh_token?: string;
  token_expiry?: number;
  created_at?: number;
  updated_at?: number;
}

function encrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const [ivHex, encrypted] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    
    // Initialize database with schema
    const schemaPath = join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
    
    // Enable foreign keys and WAL mode for better performance
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function saveCalendarConnection(connection: CalendarConnection): CalendarConnection {
  const db = getDb();
  
  // Encrypt tokens before saving
  const encryptedConnection = {
    ...connection,
    access_token: connection.access_token ? encrypt(connection.access_token) : null,
    refresh_token: connection.refresh_token ? encrypt(connection.refresh_token) : null,
    updated_at: Math.floor(Date.now() / 1000)
  };
  
  const stmt = db.prepare(`
    INSERT INTO calendar_connections (
      wallet_address, google_email, access_token, refresh_token, token_expiry, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(wallet_address) DO UPDATE SET
      google_email = excluded.google_email,
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      token_expiry = excluded.token_expiry,
      updated_at = excluded.updated_at
  `);
  
  const result = stmt.run(
    encryptedConnection.wallet_address,
    encryptedConnection.google_email,
    encryptedConnection.access_token,
    encryptedConnection.refresh_token,
    encryptedConnection.token_expiry,
    encryptedConnection.updated_at
  );
  
  return getCalendarConnection(connection.wallet_address)!;
}

export function getCalendarConnection(walletAddress: string): CalendarConnection | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM calendar_connections WHERE wallet_address = ?');
  const row = stmt.get(walletAddress) as CalendarConnection | undefined;
  
  if (!row) return null;
  
  // Decrypt tokens before returning
  return {
    ...row,
    access_token: row.access_token ? decrypt(row.access_token) : undefined,
    refresh_token: row.refresh_token ? decrypt(row.refresh_token) : undefined
  };
}

export function deleteCalendarConnection(walletAddress: string): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM calendar_connections WHERE wallet_address = ?');
  const result = stmt.run(walletAddress);
  return result.changes > 0;
}

export function updateTokens(
  walletAddress: string, 
  accessToken: string, 
  refreshToken?: string,
  tokenExpiry?: number
): boolean {
  const db = getDb();
  
  const encryptedAccessToken = encrypt(accessToken);
  const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : undefined;
  const updatedAt = Math.floor(Date.now() / 1000);
  
  let query = 'UPDATE calendar_connections SET access_token = ?, updated_at = ?';
  const params: any[] = [encryptedAccessToken, updatedAt];
  
  if (refreshToken) {
    query += ', refresh_token = ?';
    params.push(encryptedRefreshToken);
  }
  
  if (tokenExpiry) {
    query += ', token_expiry = ?';
    params.push(tokenExpiry);
  }
  
  query += ' WHERE wallet_address = ?';
  params.push(walletAddress);
  
  const stmt = db.prepare(query);
  const result = stmt.run(...params);
  
  return result.changes > 0;
}