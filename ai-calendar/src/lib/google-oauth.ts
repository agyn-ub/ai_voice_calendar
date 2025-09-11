import { OAuth2Client } from 'google-auth-library';

// Initialize OAuth2 client
export function getOAuth2Client() {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// OAuth scopes for Google Calendar
export const CALENDAR_SCOPES = {
  READ_ONLY: [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/calendar.events.readonly'
  ],
  READ_WRITE: [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/calendar.events'
  ]
};

// Generate OAuth URL
export function generateAuthUrl(scopes: string[], state?: string) {
  const oauth2Client = getOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Get refresh token
    scope: scopes,
    state: state || '',
    prompt: 'consent' // Force consent screen to get refresh token
  });
}

// Exchange authorization code for tokens
export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client();
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw new Error('Failed to exchange authorization code');
  }
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw new Error('Failed to refresh access token');
  }
}

// Verify and decode ID token
export async function verifyIdToken(idToken: string) {
  const oauth2Client = getOAuth2Client();
  
  try {
    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID!
    });
    
    const payload = ticket.getPayload();
    return payload;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    throw new Error('Invalid ID token');
  }
}

// Get user info from access token
export async function getUserInfo(accessToken: string) {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching user info:', error);
    throw new Error('Failed to get user information');
  }
}

// Check if token is expired
export function isTokenExpired(expiryDate?: number | null): boolean {
  if (!expiryDate) return true;
  return Date.now() >= expiryDate;
}

// Token storage interface
export interface TokenData {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
}

// User info interface
export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}