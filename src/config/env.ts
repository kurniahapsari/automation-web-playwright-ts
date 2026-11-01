import fs from 'node:fs';
import path from 'node:path';

export type Platform = 'desktop' | 'mobile';

export const BASE_URLS: Record<Platform, string> = {
  desktop: process.env.KUMPARAN_DESKTOP_URL ?? 'https://kumparan.com',
  mobile: process.env.KUMPARAN_MOBILE_URL ?? 'https://m.kumparan.com',
};

const AUTH_DIR = path.join(__dirname, '..', '..', '.auth');

export const AUTH_FILES: Record<Platform, string> = {
  desktop: path.join(AUTH_DIR, 'desktop.json'),
  mobile: path.join(AUTH_DIR, 'mobile.json'),
};

/**
 * Cookie request header copied from a browser where the tester logged in by hand (see README),
 * read from KUMPARAN_COOKIE in .env. `npm run auth:import` turns it into the session files.
 */
export function getCookieHeader(): string | null {
  return process.env.KUMPARAN_COOKIE?.trim().replace(/^cookie:\s*/i, '') || null;
}

export const MISSING_COOKIE = 'KUMPARAN_COOKIE is not set in .env (see README: "If Turnstile rejects the automated browser")';

/** Written by tests/discover-articles.setup.ts at the start of every run. */
export const ARTICLES_FILE = path.join(__dirname, '..', '..', '.cache', 'articles.json');

export function hasSavedSession(authFile: string): boolean {
  return fs.existsSync(authFile);
}

export interface Credentials {
  email: string;
  password: string;
}

/** Credentials come only from .env (never committed). Returns null when not configured. */
export function getCredentials(): Credentials | null {
  const email = process.env.KUMPARAN_EMAIL?.trim();
  const password = process.env.KUMPARAN_PASSWORD;
  return email && password ? { email, password } : null;
}

export const MISSING_CREDENTIALS = 'KUMPARAN_EMAIL / KUMPARAN_PASSWORD are not set in .env';
export const MISSING_SESSION = 'No saved session: run `npm run auth:save` first (solves Cloudflare Turnstile once)';
