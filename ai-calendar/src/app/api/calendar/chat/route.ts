import { NextRequest, NextResponse } from 'next/server';
import { createOpenAICalendarIntegration } from '@/lib/openai-calendar-integration';
import { cookies } from 'next/headers';
import { refreshAccessToken, isTokenExpired } from '@/lib/google-oauth';


async function getOrRefreshToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    let accessToken = cookieStore.get('google_access_token')?.value;
    const refreshToken = cookieStore.get('google_refresh_token')?.value;
    
    // If no tokens at all, user needs to authenticate
    if (!accessToken && !refreshToken) {
      return null;
    }
    
    // If we have a refresh token but no access token, refresh it
    if (!accessToken && refreshToken) {
      const newTokens = await refreshAccessToken(refreshToken);
      accessToken = newTokens.access_token || null;
      
      // Update the access token cookie
      if (accessToken) {
        cookieStore.set('google_access_token', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60, // 1 hour
          path: '/'
        });
      }
    }
    
    return accessToken;
  } catch (error) {
    console.error('Error getting/refreshing token:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, walletAddress, isVoice } = await request.json();
    
    // Get or refresh Google access token
    const googleAccessToken = await getOrRefreshToken();
    
    // Get user info from cookie
    const cookieStore = await cookies();
    const userInfoStr = cookieStore.get('google_user')?.value;
    const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
    
    // Check if OpenAI API key is configured
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey || openaiApiKey.includes('your_openai_api_key')) {
      return NextResponse.json({
        response: 'OpenAI API key not configured. Please add your API key to the environment variables.',
        error: 'no_openai_key',
        needsAuth: false
      });
    }
    
    // Initialize OpenAI calendar integration
    const calendarIntegration = createOpenAICalendarIntegration(openaiApiKey);
    
    // Check if user has Google Calendar connected
    if (!googleAccessToken) {
      return NextResponse.json({
        response: 'Please connect your Google Calendar to use calendar features.',
        error: 'no_google_auth',
        needsAuth: true
      });
    }
    
    // Process the calendar request with OpenAI
    const result = await calendarIntegration.processCalendarRequest(
      message,
      googleAccessToken,
      userInfo?.email
    );
    
    // Add voice indicator if applicable
    let finalResponse = result.message;
    if (isVoice) {
      finalResponse = `[Voice command] ${finalResponse}`;
    }
    
    return NextResponse.json({
      response: finalResponse,
      calendarEvent: result.calendarData,
      tokenId: result.tokenId || `cal_${walletAddress}_${Date.now()}`,
      permissions: result.permissions,
      userEmail: userInfo?.email,
      success: result.success
    });
  } catch (error) {
    console.error('Error processing calendar chat:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        response: 'Sorry, I encountered an error processing your request. Please try again.'
      },
      { status: 500 }
    );
  }
}