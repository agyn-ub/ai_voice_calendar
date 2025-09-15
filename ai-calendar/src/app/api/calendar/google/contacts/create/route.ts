import { NextRequest, NextResponse } from 'next/server';
import { googleContactsService } from '@/lib/services/googleContacts';
import { getCalendarConnection } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet_address, name, email, phone } = body;
    
    if (!wallet_address || !name || !email) {
      return NextResponse.json(
        { error: 'Wallet address, name, and email are required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Check if calendar is connected
    const connection = getCalendarConnection(wallet_address);
    if (!connection) {
      return NextResponse.json(
        { error: 'No calendar connected' },
        { status: 404 }
      );
    }
    
    // Create the contact
    const result = await googleContactsService.createContact(
      wallet_address,
      name,
      email,
      phone
    );
    
    return NextResponse.json({
      success: true,
      message: `Contact "${name}" created successfully`,
      contact: {
        name: result.name,
        email: result.email,
        resourceName: result.resourceName
      }
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    
    if (error instanceof Error) {
      // Check if it's a scope error
      if (error.message.includes('permission')) {
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
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}