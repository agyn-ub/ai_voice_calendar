import { NextRequest, NextResponse } from 'next/server';
import { GmailContactSyncService } from '@/lib/services/gmailContactSync';
import { saveExtractedContacts, getExtractedContacts, clearExtractedContacts } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet_address, action = 'sync', maxResults = 2000 } = body;

    if (!wallet_address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    console.log(`[Sync] Starting ${action} for wallet: ${wallet_address}`);

    // Create service instance
    const syncService = await GmailContactSyncService.createFromWallet(wallet_address);

    if (!syncService) {
      return NextResponse.json(
        { error: 'No calendar connection found. Please connect your Google Calendar first.' },
        { status: 401 }
      );
    }

    switch (action) {
      case 'preview': {
        // Just get a summary without saving
        console.log('[Sync] Getting contact summary...');
        const summary = await syncService.getContactsSummary(maxResults);
        return NextResponse.json({
          success: true,
          action: 'preview',
          summary
        });
      }

      case 'sync': {
        // Extract contacts from Gmail and save to local database
        console.log('[Sync] Extracting contacts from Gmail...');
        const contacts = await syncService.extractContactsFromGmail(maxResults);

        // Save to database
        console.log(`[Sync] Saving ${contacts.length} contacts to database...`);
        const success = saveExtractedContacts(wallet_address, contacts);

        if (!success) {
          return NextResponse.json(
            { error: 'Failed to save contacts to database' },
            { status: 500 }
          );
        }

        // Get summary statistics
        const withNames = contacts.filter(c => c.name !== null).length;
        const withoutNames = contacts.filter(c => c.name === null).length;
        const topContacts = contacts.slice(0, 10);

        console.log(`[Sync] Contact sync complete. Total: ${contacts.length}, With names: ${withNames}`);

        return NextResponse.json({
          success: true,
          action: 'sync',
          summary: {
            totalContacts: contacts.length,
            withNames,
            withoutNames,
            topContacts
          }
        });
      }

      case 'clear': {
        // Clear stored contacts
        console.log('[Sync] Clearing stored contacts...');
        const success = clearExtractedContacts(wallet_address);

        if (!success) {
          return NextResponse.json(
            { error: 'Failed to clear contacts' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          action: 'clear',
          message: 'Contacts cleared successfully'
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "preview", "sync", or "clear"' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[Sync] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync contacts' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet_address = searchParams.get('wallet_address');

    if (!wallet_address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Get stored contacts from database
    const contacts = getExtractedContacts(wallet_address);

    // Calculate statistics
    const withNames = contacts.filter(c => c.name !== null).length;
    const withoutNames = contacts.filter(c => c.name === null).length;

    return NextResponse.json({
      success: true,
      contacts,
      summary: {
        totalContacts: contacts.length,
        withNames,
        withoutNames,
        hasData: contacts.length > 0
      }
    });

  } catch (error) {
    console.error('[Sync] Error getting contacts:', error);
    return NextResponse.json(
      { error: 'Failed to get contacts' },
      { status: 500 }
    );
  }
}