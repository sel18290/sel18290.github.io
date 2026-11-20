const encoder = new TextEncoder();
const validity = 12 * 60 * 60 * 1000;
let signingKey: Promise<CryptoKey> | undefined;

function key() {
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret) throw Error('Service d’accès indisponible.');
  return signingKey ??= crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

const signed = (payload: string) => encoder.encode('cortex-academie-entry/v2.' + payload);

export async function issueRealEntry() {
  const payload = (Date.now() + validity) + '.' + hex(crypto.getRandomValues(new Uint8Array(16)));
  const signature = await crypto.subtle.sign('HMAC', await key(), signed(payload));
  return payload + '.' + hex(new Uint8Array(signature));
}

export async function validRealEntry(ticket: unknown) {
  if (typeof ticket !== 'string' || !/^\d{13}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(ticket)) return false;
  const [expires, nonce, signature] = ticket.split('.');
  if (Number(expires) <= Date.now()) return false;
  const bytes = Uint8Array.from(signature.match(/../g)!, byte => Number.parseInt(byte, 16));
  return crypto.subtle.verify('HMAC', await key(), bytes, signed(expires + '.' + nonce));
}
