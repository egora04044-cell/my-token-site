import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const FAVORITES_FILE = path.join(DATA_DIR, 'favorites.json');

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // ignore
  }
}

async function readFavorites(): Promise<Record<string, string[]>> {
  try {
    await ensureDir(DATA_DIR);
    const data = await fs.readFile(FAVORITES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function writeFavorites(fav: Record<string, string[]>) {
  await ensureDir(DATA_DIR);
  await fs.writeFile(FAVORITES_FILE, JSON.stringify(fav, null, 2));
}

export async function getFavorites(address: string): Promise<string[]> {
  const fav = await readFavorites();
  return fav[address] ?? [];
}

export async function addFavorite(address: string, path: string): Promise<string[]> {
  const fav = await readFavorites();
  const list = fav[address] ?? [];
  if (!list.includes(path)) {
    list.push(path);
    fav[address] = list;
    await writeFavorites(fav);
  }
  return list;
}

export async function removeFavorite(address: string, path: string): Promise<string[]> {
  const fav = await readFavorites();
  const list = (fav[address] ?? []).filter((p) => p !== path);
  fav[address] = list;
  await writeFavorites(fav);
  return list;
}
