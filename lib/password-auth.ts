import { cookies } from 'next/headers';

import { getAuthEnvironment } from '@/db';

export const SESSION_COOKIE = 'space_light_session';
const SESSION_DURATION_SECONDS = 60 * 60 * 12;
const PASSWORD_ITERATIONS = 210_000;

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function sessionSecret() {
  const configured = getAuthEnvironment().sessionSecret;
  if (configured) return configured;
  if (process.env.NODE_ENV !== 'production') {
    return 'space-light-local-development-session-secret';
  }
  throw new Error('AUTH_SESSION_SECRET não foi configurado.');
}

async function hmacKey() {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(sessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function hashPassword(password: string, existingSalt?: string) {
  const salt = existingSalt
    ? base64UrlToBytes(existingSalt)
    : crypto.getRandomValues(new Uint8Array(18));
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations: PASSWORD_ITERATIONS,
    },
    baseKey,
    256,
  );
  return {
    passwordHash: bytesToBase64Url(new Uint8Array(bits)),
    passwordSalt: bytesToBase64Url(salt),
  };
}

export async function verifyPassword(
  password: string,
  expectedHash: string,
  salt: string,
) {
  if (!expectedHash || !salt) return false;
  const candidate = await hashPassword(password, salt);
  const expected = base64UrlToBytes(expectedHash);
  const actual = base64UrlToBytes(candidate.passwordHash);
  if (expected.length !== actual.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected[index] ^ actual[index];
  }
  return difference === 0;
}

export function generateTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

export async function createSessionToken(userId: string) {
  const payload = bytesToBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        userId,
        exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
      }),
    ),
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(),
    new TextEncoder().encode(payload),
  );
  return `${payload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token?: string) {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const valid = await crypto.subtle.verify(
    'HMAC',
    await hmacKey(),
    base64UrlToBytes(signature),
    new TextEncoder().encode(payload),
  );
  if (!valid) return null;
  try {
    const data = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(payload)),
    ) as { userId?: string; exp?: number };
    if (!data.userId || !data.exp || data.exp <= Date.now() / 1000) return null;
    return data.userId;
  } catch {
    return null;
  }
}

export async function getSessionUserId() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_DURATION_SECONDS,
};
