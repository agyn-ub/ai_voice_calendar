import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { saveCalendarConnection } from '@/lib/db';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/calendar/google/callback'
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // This is the wallet address
  const error = searchParams.get('error');
  
  // Handle OAuth errors
  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    );
  }
  
  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/?error=missing_parameters', request.url)
    );
  }
  
  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Get user email
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    
    // Calculate token expiry (typically 1 hour from now)
    const tokenExpiry = tokens.expiry_date ? 
      Math.floor(tokens.expiry_date / 1000) : 
      Math.floor(Date.now() / 1000) + 3600;
    
    // Save to database
    saveCalendarConnection({
      wallet_address: state,
      google_email: userInfo.email || '',
      access_token: tokens.access_token || '',
      refresh_token: tokens.refresh_token || '',
      token_expiry: tokenExpiry
    });
    
    // Redirect back to the app with success
    return NextResponse.redirect(
      new URL('/?calendar_connected=true', request.url)
    );
  } catch (error) {
    console.error('Error during OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/?error=oauth_failed', request.url)
    );
  }
}