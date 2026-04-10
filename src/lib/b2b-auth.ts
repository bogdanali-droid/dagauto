import { hashPassword } from './auth';
export { hashPassword };

const B2B_COOKIE = 'dagauto_b2b';
const SESSION_DURATION = 60 * 60 * 24 * 30; // 30 days

async function sign(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export async function createB2BToken(userId: number, secret: string): Promise<string> {
  const payload = `b2b:${userId}:${Date.now()}`;
  const sig = await sign(secret, payload);
  return btoa(`${payload}:${sig}`);
}

export async function verifyB2BToken(token: string, secret: string): Promise<number | null> {
  try {
    const decoded = atob(token);
    const lastColon = decoded.lastIndexOf(':');
    const data = decoded.substring(0, lastColon);
    const sig = decoded.substring(lastColon + 1);
    if ((await sign(secret, data)) !== sig) return null;
    const parts = data.split(':');
    return parseInt(parts[1]);
  } catch { return null; }
}

export function setB2BCookie(token: string): string {
  return `${B2B_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_DURATION}`;
}

export function clearB2BCookie(): string {
  return `${B2B_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function getB2BToken(request: Request): string | null {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp(`${B2B_COOKIE}=([^;]+)`));
  return match ? match[1] : null;
}

export async function getB2BUser(request: Request, DB: any, secret: string) {
  const token = getB2BToken(request);
  if (!token) return null;
  const userId = await verifyB2BToken(token, secret);
  if (!userId) return null;
  return await DB.prepare(
    'SELECT id, email, name, phone, company, status FROM b2b_users WHERE id = ?'
  ).bind(userId).first() as any || null;
}
