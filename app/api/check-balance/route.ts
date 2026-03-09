import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { isBlocked } from '@/lib/blocked';

const RPC = process.env.SOLANA_RPC || 'https://mainnet.helius-rpc.com/?api-key=2054c8a4-ab5b-4b18-acc4-1d581439ff25';
const REQUIRED_MINT = new PublicKey('9AB5cgUf1r1iUU2MfYyzm3YujXpdyS1JQVqRSkxbpump');
const REQUIRED_AMOUNT = 1000;

const RPC_TIMEOUT_MS = 6000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('RPC timeout')), ms)
    ),
  ]);
}

/** POST — проверить баланс и блокировку. Тело: { address: string } */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const address = typeof body.address === 'string' ? body.address.trim() : null;
    if (!address || address.length < 32) {
      return NextResponse.json({ blocked: false, balance: 0, hasAccess: false });
    }

    const blocked = await isBlocked(address);
    if (blocked) {
      return NextResponse.json({ blocked: true, balance: 0, hasAccess: false });
    }

    const conn = new Connection(RPC);
    const accounts = await withTimeout(
      conn.getParsedTokenAccountsByOwner(
        new PublicKey(address),
        { mint: REQUIRED_MINT }
      ),
      RPC_TIMEOUT_MS
    );

    const balance = accounts.value.length > 0
      ? (accounts.value[0].account.data.parsed.info.tokenAmount.uiAmount ?? 0)
      : 0;

    return NextResponse.json({
      blocked: false,
      balance,
      hasAccess: balance >= REQUIRED_AMOUNT,
    });
  } catch (e) {
    console.error('Check balance error:', e);
    return NextResponse.json({ blocked: false, balance: 0, hasAccess: false });
  }
}
