import { NextRequest, NextResponse } from 'next/server';
import { googleCalendarService } from '@/lib/services/googleCalendar';
import { getCalendarConnection } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const walletAddress = searchParams.get('wallet_address');
  
  if (!walletAddress) {
    return NextResponse.json(
      { error: 'Wallet address is required' },
      { status: 400 }
    );
  }
  
  // Check if calendar is connected
  const connection = getCalendarConnection(walletAddress);
  if (!connection) {
    return NextResponse.json(
      { error: 'No calendar connected' },
      { status: 404 }
    );
  }
  
  try {
    // Get date range from query params (optional)
    const timeMin = searchParams.get('timeMin');
    const timeMax = searchParams.get('timeMax');
    const maxResults = searchParams.get('maxResults');
    
    const events = await googleCalendarService.getCalendarEvents(
      walletAddress,
      timeMin ? new Date(timeMin) : undefined,
      timeMax ? new Date(timeMax) : undefined,
      maxResults ? parseInt(maxResults) : undefined
    );
    
    return NextResponse.json({ 
      events,
      connected: true,
      email: connection.google_email 
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    
    // If token refresh failed, indicate that reconnection is needed
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json(
        { error: 'Authentication expired. Please reconnect your calendar.' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { wallet_address, event } = await request.json();
    
    if (!wallet_address || !event) {
      return NextResponse.json(
        { error: 'Wallet address and event data are required' },
        { status: 400 }
      );
    }
    
    const createdEvent = await googleCalendarService.createCalendarEvent(
      wallet_address,
      event
    );
    
    return NextResponse.json({ success: true, event: createdEvent });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create calendar event' },
      { status: 500 }
    );
  }
}