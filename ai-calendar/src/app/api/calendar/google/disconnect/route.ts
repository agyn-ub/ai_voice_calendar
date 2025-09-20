import { NextRequest, NextResponse } from 'next/server';
import { accountsDb } from '@/lib/db/accountsDb';

export async function POST(request: NextRequest) {
  try {
    const { wallet_address } = await request.json();
    
    if (!wallet_address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    const deleted = accountsDb.deleteAccountSync(wallet_address);
    
    if (deleted) {
      return NextResponse.json({ success: true, message: 'Calendar disconnected' });
    } else {
      return NextResponse.json(
        { error: 'No calendar connection found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error disconnecting calendar:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect calendar' },
      { status: 500 }
    );
  }
}