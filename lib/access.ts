import { Connection, PublicKey } from '@solana/web3.js';
import { isBlocked } from './blocked';
import { isAdmin } from './admin';

const RPC = process.env.SOLANA_RPC || 'https://mainnet.helius-rpc.com/?api-key=2054c8a4-ab5b-4b18-acc4-1d581439ff25';
const REQUIRED_MINT = new PublicKey('9AB5cgUf1r1iUU2MfYyzm3YujXpdyS1JQVqRSkxbpump');
const REQUIRED_AMOUNT = 1000;

export async function hasAccess(address: string | null | undefined): Promise<boolean> {
  if (!address || address.length < 32) return false;
  if (isAdmin(address)) return true;
  if (await isBlocked(address)) return false;
  try {
    const conn = new Connection(RPC);
    const accounts = await conn.getParsedTokenAccountsByOwner(
      new PublicKey(address),
      { mint: REQUIRED_MINT }
    );
    if (accounts.value.length === 0) return false;
    const balance = accounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
    return balance >= REQUIRED_AMOUNT;
  } catch {
    return false;
  }
}
