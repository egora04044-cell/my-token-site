import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const BLOCKED_FILE = path.join(DATA_DIR, 'blocked-addresses.json');

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // ignore
  }
}

async function readBlocked(): Promise<string[]> {
  try {
    await ensureDir(DATA_DIR);
    const data = await fs.readFile(BLOCKED_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeBlocked(addresses: string[]) {
  await ensureDir(DATA_DIR);
  await fs.writeFile(BLOCKED_FILE, JSON.stringify(addresses, null, 2));
}

export async function getBlockedAddresses(): Promise<string[]> {
  return readBlocked();
}

export async function isBlocked(address: string | null | undefined): Promise<boolean> {
  if (!address) return false;
  const blocked = await readBlocked();
  return blocked.includes(address);
}

export async function addBlockedAddress(address: string): Promise<void> {
  const blocked = await readBlocked();
  if (!blocked.includes(address)) {
    blocked.push(address);
    await writeBlocked(blocked);
  }
}

export async function removeBlockedAddress(address: string): Promise<void> {
  const blocked = await readBlocked();
  const filtered = blocked.filter((a) => a !== address);
  if (filtered.length !== blocked.length) {
    await writeBlocked(filtered);
  }
}
