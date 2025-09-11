import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getUserInfo } from '@/lib/google-oauth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/?error=${encodeURIComponent(error)}`
      );
    }
    
    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/?error=no_code`
      );
    }
    
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);
    
    if (!tokens.access_token) {
      throw new Error('No access token received');
    }
    
    // Get user info
    const userInfo = await getUserInfo(tokens.access_token);
    
    // Store tokens in secure HTTP-only cookies
    const cookieStore = await cookies();
    
    // Store access token (expires in 1 hour typically)
    cookieStore.set('google_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
      path: '/'
    });
    
    // Store refresh token if available (long-lived)
    if (tokens.refresh_token) {
      cookieStore.set('google_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/'
      });
    }
    
    // Store user info
    cookieStore.set('google_user', JSON.stringify({
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      scope: tokens.scope
    }), {
      httpOnly: false, // Allow client to read user info
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    });
    
    // Redirect back to the app with success
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/?auth=success&email=${encodeURIComponent(userInfo.email)}`
    );
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/?error=callback_failed`
    );
  }
}