import { NextRequest, NextResponse } from 'next/server';
import { googleContactsService } from '@/lib/services/googleContacts';
import { getCalendarConnection } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const walletAddress = searchParams.get('wallet_address');
  const searchName = searchParams.get('name');
  
  if (!walletAddress) {
    return NextResponse.json(
      { error: 'Wallet address is required' },
      { status: 400 }
    );
  }
  
  if (!searchName) {
    return NextResponse.json(
      { error: 'Name parameter is required' },
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
    // Test the contact search
    const matches = await googleContactsService.searchContactsByName(walletAddress, searchName);
    
    // Also test the single contact resolution
    const bestMatch = await googleContactsService.getContactEmail(walletAddress, searchName);
    
    return NextResponse.json({
      success: true,
      searchQuery: searchName,
      matches: matches,
      bestMatch: bestMatch,
      totalMatches: matches.length
    });
  } catch (error) {
    console.error('Error testing contact search:', error);
    
    if (error instanceof Error) {
      // Check if it's a scope error
      if (error.message.includes('reconnect')) {
        return NextResponse.json(
          { 
            error: error.message,
            needsReconnect: true
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to search contacts' },
      { status: 500 }
    );
  }
}