import 'server-only';
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

/* Chiffrement des clés de service saisies dans l'espace (constitution VII.3) :
   AES-256-GCM, clé dérivée de BETTER_AUTH_SECRET par HKDF. Format stocké :
   v1.<iv>.<tag>.<chiffré>, en base64url. */

const VERSION = 'v1';
const INFO = 'circlelink:newsletter-key';

export class SecretBoxError extends Error {}

function keyFrom(secret: string | undefined): Buffer {
  if (!secret || secret.length < 32) throw new SecretBoxError('BETTER_AUTH_SECRET manquante ou trop courte');
  return Buffer.from(hkdfSync('sha256', secret, 'circlelink', INFO, 32));
}

export function seal(plain: string, secret = process.env.BETTER_AUTH_SECRET): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFrom(secret), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), data].map((p) => (typeof p === 'string' ? p : p.toString('base64url'))).join('.');
}

/** Lève SecretBoxError si le texte est altéré ou chiffré avec un autre secret. */
export function open(sealed: string, secret = process.env.BETTER_AUTH_SECRET): string {
  const [version, iv, tag, data] = sealed.split('.');
  if (version !== VERSION || !iv || !tag || !data) throw new SecretBoxError('format de clé chiffrée inconnu');
  try {
    const decipher = createDecipheriv('aes-256-gcm', keyFrom(secret), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    throw new SecretBoxError('clé illisible : BETTER_AUTH_SECRET a changé, ou la valeur est altérée');
  }
}
