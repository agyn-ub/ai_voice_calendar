import { NextRequest, NextResponse } from 'next/server';
import { generateAuthUrl, CALENDAR_SCOPES } from '@/lib/google-oauth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scopeType = searchParams.get('scope') || 'read';
    const state = searchParams.get('state') || '';
    
    // Select scopes based on user preference
    const scopes = scopeType === 'write' 
      ? CALENDAR_SCOPES.READ_WRITE 
      : CALENDAR_SCOPES.READ_ONLY;
    
    // Generate OAuth URL
    const authUrl = generateAuthUrl(scopes, state);
    
    // Redirect to Google OAuth consent screen
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating OAuth flow:', error);
    return NextResponse.json(
      { error: 'Failed to initiate authentication' },
      { status: 500 }
    );
  }
}