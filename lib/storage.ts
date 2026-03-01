import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const ADDRESSES_FILE = path.join(DATA_DIR, 'connected-addresses.json');
const FILES_META_PATH = path.join(DATA_DIR, 'uploaded-files.json');
export const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export type FileCategory = 'tracks' | 'videos' | 'community' | 'tickets' | 'other';

export interface ConnectedAddress {
  address: string;
  connectedAt: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  path: string;
  size: number;
  uploadedAt: string;
  category: FileCategory;
}

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // ignore
  }
}

async function readAddresses(): Promise<ConnectedAddress[]> {
  try {
    await ensureDir(DATA_DIR);
    const data = await fs.readFile(ADDRESSES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeAddresses(addresses: ConnectedAddress[]) {
  await ensureDir(DATA_DIR);
  await fs.writeFile(ADDRESSES_FILE, JSON.stringify(addresses, null, 2));
}

export async function getConnectedAddresses(): Promise<ConnectedAddress[]> {
  return readAddresses();
}

export async function addConnectedAddress(address: string): Promise<void> {
  const addresses = await readAddresses();
  const exists = addresses.some((a) => a.address === address);
  if (!exists) {
    addresses.push({ address, connectedAt: new Date().toISOString() });
    await writeAddresses(addresses);
  }
}

async function readFilesMeta(): Promise<UploadedFile[]> {
  try {
    await ensureDir(DATA_DIR);
    const data = await fs.readFile(FILES_META_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeFilesMeta(files: UploadedFile[]) {
  await ensureDir(DATA_DIR);
  await fs.writeFile(FILES_META_PATH, JSON.stringify(files, null, 2));
}

export async function getUploadedFiles(): Promise<UploadedFile[]> {
  const files = await readFilesMeta();
  return files.map((f) => ({
    ...f,
    category: f.category ?? 'other',
  }));
}

export async function addUploadedFile(
  name: string,
  savedPath: string,
  size: number,
  category: FileCategory
): Promise<UploadedFile> {
  const files = await readFilesMeta();
  const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const file: UploadedFile = {
    id,
    name,
    path: savedPath,
    size,
    uploadedAt: new Date().toISOString(),
    category,
  };
  files.push(file);
  await writeFilesMeta(files);
  return file;
}

export async function deleteUploadedFile(id: string): Promise<boolean> {
  const files = await readFilesMeta();
  const index = files.findIndex((f) => f.id === id);
  if (index === -1) return false;
  const file = files[index];
  try {
    const fullPath = path.join(process.cwd(), 'public', file.path);
    await fs.unlink(fullPath);
  } catch {
    // file may not exist
  }
  files.splice(index, 1);
  await writeFilesMeta(files);
  return true;
}
