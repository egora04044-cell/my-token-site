import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.SERVE_TOKEN_SECRET || 'nextuplabel-serve-secret-change-in-production';
const TOKEN_TTL_MS = 5 * 60 * 1000; // 5 минут — короткое окно против слива

export function createServeToken(path: string, address: string): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${path}|${address}|${exp}`;
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${exp}.${sig}`;
}

export function verifyServeToken(path: string, address: string, token: string): boolean {
  try {
    const [expStr, sig] = token.split('.');
    if (!expStr || !sig) return false;
    const exp = parseInt(expStr, 10);
    if (isNaN(exp) || Date.now() > exp) return false;
    const payload = `${path}|${address}|${exp}`;
    const expected = createHmac('sha256', SECRET).update(payload).digest('base64url');
    return timingSafeEqual(Buffer.from(sig, 'base64url'), Buffer.from(expected, 'base64url'));
  } catch {
    return false;
  }
}
