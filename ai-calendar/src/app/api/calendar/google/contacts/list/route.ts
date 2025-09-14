import { NextRequest, NextResponse } from 'next/server';
import { googleContactsService } from '@/lib/services/googleContacts';
import { getCalendarConnection } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const walletAddress = searchParams.get('wallet_address');
  const pageSize = searchParams.get('page_size');
  
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
    // List contacts (default to 20 if not specified)
    const contactsLimit = pageSize ? parseInt(pageSize) : 20;
    const contacts = await googleContactsService.listContacts(walletAddress, contactsLimit);
    
    // Summary statistics
    const withEmails = contacts.filter((c: any) => c.primaryEmail).length;
    const withPhones = contacts.filter((c: any) => c.phoneNumbers && c.phoneNumbers.length > 0).length;
    const withOrganizations = contacts.filter((c: any) => c.organization).length;
    
    return NextResponse.json({
      success: true,
      totalContacts: contacts.length,
      stats: {
        withEmails,
        withPhones,
        withOrganizations
      },
      contacts: contacts.map((contact: any) => ({
        name: contact.name,
        firstName: contact.firstName,
        lastName: contact.lastName,
        primaryEmail: contact.primaryEmail,
        emails: contact.emails,
        phoneNumbers: contact.phoneNumbers,
        organization: contact.organization,
        jobTitle: contact.jobTitle,
        photoUrl: contact.photoUrl
      }))
    });
  } catch (error) {
    console.error('Error listing contacts:', error);
    
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
      { error: 'Failed to list contacts' },
      { status: 500 }
    );
  }
}