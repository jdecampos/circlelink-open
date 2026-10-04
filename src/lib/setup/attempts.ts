import 'server-only';

/**
 * Essais d'installation : 5 par adresse IP et par heure, en mémoire du processus.
 * Suffisant face à un code de 130 bits : la limite freine le bruit, le code fait la sécurité.
 */
export const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 60 * 1000;

const attempts = new Map<string, number[]>();

/** Compte un essai ; false s'il dépasse la limite. */
export function takeAttempt(ip: string, now = Date.now()): boolean {
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  const allowed = recent.length < MAX_ATTEMPTS;
  if (allowed) recent.push(now);
  attempts.set(ip, recent);
  return allowed;
}

/** Tests uniquement. */
export function resetAttempts() {
  attempts.clear();
}
