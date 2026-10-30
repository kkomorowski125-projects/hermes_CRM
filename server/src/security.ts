// Hasła (scrypt), losowe tokeny i jednorazowe kody 2FA (TOTP, RFC 6238) bez zewnętrznych bibliotek.
import crypto from 'node:crypto';

export const newId = (prefix = '') => prefix + crypto.randomBytes(12).toString('base64url');
export const newToken = () => crypto.randomBytes(32).toString('base64url');
export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
export const now = () => new Date().toISOString();
export const inDays = (d: number) => new Date(Date.now() + d * 864e5).toISOString();
export const inHours = (h: number) => new Date(Date.now() + h * 36e5).toISOString();

const N = 16384, R = 8, P = 1, LEN = 64;
export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(pw, salt, LEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}
export function verifyPassword(pw: string, stored: string): boolean {
  const [alg, n, r, p, salt, key] = stored.split('$');
  if (alg !== 'scrypt') return false;
  const want = Buffer.from(key, 'base64');
  const got = crypto.scryptSync(pw, Buffer.from(salt, 'base64'), want.length, { N: +n, r: +r, p: +p });
  return crypto.timingSafeEqual(want, got);
}
export const passwordProblem = (pw: string) => (typeof pw !== 'string' || pw.length < 10 ? 'Hasło musi mieć co najmniej 10 znaków.' : '');

/* ---- TOTP ---- */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(buf: Buffer) {
  let bits = '', out = '';
  for (const b of buf) bits += b.toString(2).padStart(8, '0');
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}
function unbase32(s: string) {
  let bits = '';
  for (const c of s.replace(/=+$/, '').toUpperCase()) { const v = B32.indexOf(c); if (v < 0) continue; bits += v.toString(2).padStart(5, '0'); }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
export const newTotpSecret = () => base32(crypto.randomBytes(20));
export function totpCode(secret: string, t = Date.now(), step = 30) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(t / 1000 / step)));
  const h = crypto.createHmac('sha1', unbase32(secret)).update(counter).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1e6).padStart(6, '0');
}
/** Akceptuje kod z bieżącego okna i jednego okna obok (różnica zegarów do 30 s). */
export function verifyTotp(secret: string, code: string) {
  const c = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(c)) return false;
  return [-1, 0, 1].some(w => totpCode(secret, Date.now() + w * 30000) === c);
}
export const totpUri = (secret: string, email: string, issuer = 'Hermes CRM') =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

/** Proste ograniczenie liczby prób (np. logowania) w pamięci procesu. */
export function limiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (key: string) => {
    const t = Date.now(), arr = (hits.get(key) || []).filter(x => t - x < windowMs);
    arr.push(t); hits.set(key, arr);
    return arr.length <= max;
  };
}
