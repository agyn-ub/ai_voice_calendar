import { NextRequest, NextResponse } from 'next/server';
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
  
  const connection = getCalendarConnection(walletAddress);
  
  if (!connection) {
    return NextResponse.json({ 
      connected: false,
      email: null 
    });
  }
  
  return NextResponse.json({ 
    connected: true,
    email: connection.google_email,
    provider: 'google'
  });
}