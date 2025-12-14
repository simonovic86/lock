/**
 * API route to unpin content from Pinata
 * Used for "destroy after reading" feature
 */

import { NextRequest, NextResponse } from 'next/server';

const PINATA_API = 'https://api.pinata.cloud';

export async function POST(request: NextRequest) {
  try {
    const { cid } = await request.json();

    if (!cid || typeof cid !== 'string') {
      return NextResponse.json(
        { error: 'CID is required' },
        { status: 400 }
      );
    }

    const jwt = process.env.PINATA_JWT || process.env.NEXT_PUBLIC_PINATA_JWT;
    
    if (!jwt) {
      // No JWT configured - just return success
      // The content will eventually be garbage collected from IPFS
      return NextResponse.json({ success: true, unpinned: false });
    }

    // Unpin from Pinata
    const response = await fetch(`${PINATA_API}/pinning/unpin/${cid}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });

    if (response.ok) {
      return NextResponse.json({ success: true, unpinned: true });
    }

    // 404 means already unpinned or never pinned - that's fine
    if (response.status === 404) {
      return NextResponse.json({ success: true, unpinned: false });
    }

    const errorText = await response.text();
    console.error('Pinata unpin failed:', response.status, errorText);
    
    // Still return success - unpinning is best-effort
    return NextResponse.json({ success: true, unpinned: false });

  } catch (error) {
    console.error('Unpin error:', error);
    // Return success anyway - unpinning is best-effort
    return NextResponse.json({ success: true, unpinned: false });
  }
}
