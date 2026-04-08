const SESSION_COOKIE = 'dagauto_session';
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days in seconds
const SESSION_DURATION_LONG = 60 * 60 * 24 * 30; // 30 days (remember me)

async function hmacSign(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function hmacVerify(secret: string, data: string, signature: string): Promise<boolean> {
  const expected = await hmacSign(secret, data);
  return expected === signature;
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createSessionToken(userId: number, secret: string): Promise<string> {
  const payload = `${userId}:${Date.now()}`;
  const sig = await hmacSign(secret, payload);
  return btoa(`${payload}:${sig}`);
}

export async function verifySessionToken(token: string, secret: string): Promise<number | null> {
  try {
    const decoded = atob(token);
    const lastColon = decoded.lastIndexOf(':');
    const data = decoded.substring(0, lastColon);
    const sig = decoded.substring(lastColon + 1);
    const valid = await hmacVerify(secret, data, sig);
    if (!valid) return null;
    const parts = data.split(':');
    const timestamp = parseInt(parts[1]);
    if (Date.now() - timestamp > SESSION_DURATION * 1000) return null;
    return parseInt(parts[0]);
  } catch {
    return null;
  }
}

export function setSessionCookie(token: string, rememberMe = false): string {
  const duration = rememberMe ? SESSION_DURATION_LONG : SESSION_DURATION;
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${duration}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return match ? match[1] : null;
}
