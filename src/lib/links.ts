import type { IconName } from './icons';
import type { LinkItem } from './types';

export const NETWORKS = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'x', label: 'X' },
  { id: 'email', label: 'Email' },
] as const satisfies readonly { id: IconName; label: string }[];

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function domain(u: string) {
  try {
    const x = new URL(u);
    if (x.protocol === 'mailto:') return x.pathname;
    return x.hostname.replace(/^www\./, '') + (x.pathname.length > 1 ? x.pathname.replace(/\/$/, '') : '');
  } catch {
    return u;
  }
}

/** Icône d'un lien selon son URL */
export function linkIcon(l: Pick<LinkItem, 'url' | 'type'>): IconName {
  const u = (l.url || '').toLowerCase();
  if (u.includes('youtube')) return 'play';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.startsWith('mailto:') || u.includes('newsletter')) return 'mail';
  if (u.includes('rendez-vous') || u.includes('calendly') || u.includes('cal.com')) return 'calendar';
  if (u.includes('template') || u.includes('stack') || u.includes('prompt')) return 'tool';
  if (l.type === 'product') return 'book';
  return 'link';
}

/** Seules ces URL peuvent finir dans un href (pas de javascript:, data:, …). */
export function isSafeUrl(v: string) {
  try {
    const u = new URL(v);
    if (u.protocol === 'mailto:') return u.pathname.length > 0;
    return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.includes('.');
  } catch {
    return false;
  }
}

/** Ajoute https:// si l'adresse n'a pas de schéma (comportement du design). */
/** Photo de profil : `https:` seulement (une image en `http:` serait bloquée en contenu mixte). */
export function isSafeImageUrl(v: string) {
  return v.length <= 2048 && /^https:\/\/[^\s/]+\.\S+$/i.test(v) && isSafeUrl(v);
}

export function normalizeUrl(raw: string) {
  const v = raw.trim();
  if (v && !/^[a-z][a-z0-9+.-]*:/i.test(v) && v.includes('.')) return 'https://' + v;
  return v;
}

export function plural(n: number, word: string) {
  return n + ' ' + word + (n > 1 ? 's' : '');
}
