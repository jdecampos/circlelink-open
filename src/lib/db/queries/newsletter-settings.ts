import 'server-only';
import { eq } from 'drizzle-orm';
import { SecretBoxError, open, seal } from '@/lib/crypto/secret-box';
import { getDb, type Db } from '../client';
import { NEWSLETTER_PROVIDERS, newsletterSettings } from '../schema';

export type ProviderId = (typeof NEWSLETTER_PROVIDERS)[number];

/** Ce que l'espace peut voir : jamais la clé, ni chiffrée ni en clair (constitution VII.3). */
export type NewsletterSettingsView = {
  enabled: boolean;
  provider: ProviderId | null;
  keyHint: string | null;
  audienceName: string | null;
  keyRejected: boolean;
  /** La clé ne se déchiffre plus (BETTER_AUTH_SECRET a changé) : à reconnecter. */
  keyUnreadable: boolean;
};

/** Connexion utilisable par le serveur pour appeler le service. */
export type ActiveConnection = { provider: ProviderId; key: string; audienceId: string };

export const isProvider = (v: unknown): v is ProviderId => typeof v === 'string' && (NEWSLETTER_PROVIDERS as readonly string[]).includes(v);

const EMPTY: NewsletterSettingsView = { enabled: false, provider: null, keyHint: null, audienceName: null, keyRejected: false, keyUnreadable: false };

async function row(db: Db) {
  const [r] = await db.select().from(newsletterSettings).where(eq(newsletterSettings.id, 1)).limit(1);
  return r ?? null;
}

function readable(ciphertext: string | null): string | null {
  if (!ciphertext) return null;
  try {
    return open(ciphertext);
  } catch (e) {
    if (e instanceof SecretBoxError) return null;
    throw e;
  }
}

export async function getNewsletterView(db: Db = getDb()): Promise<NewsletterSettingsView> {
  const r = await row(db);
  if (!r) return EMPTY;
  const keyUnreadable = !!r.keyCiphertext && readable(r.keyCiphertext) === null;
  return {
    enabled: r.enabled && !keyUnreadable,
    provider: isProvider(r.provider) ? r.provider : null,
    keyHint: r.keyHint,
    audienceName: r.audienceName,
    keyRejected: !!r.keyRejectedAt,
    keyUnreadable,
  };
}

/** Connexion active : newsletter activée, service, clé lisible et liste. Sinon null. */
export async function getActiveConnection(db: Db = getDb()): Promise<ActiveConnection | null> {
  const r = await row(db);
  if (!r?.enabled || !isProvider(r.provider) || !r.audienceId) return null;
  const key = readable(r.keyCiphertext);
  return key ? { provider: r.provider, key, audienceId: r.audienceId } : null;
}

/** Clé enregistrée pour ce service (pour garder la clé quand seule la liste change). */
export async function storedKey(provider: ProviderId, db: Db = getDb()): Promise<string | null> {
  const r = await row(db);
  return r?.provider === provider ? readable(r.keyCiphertext) : null;
}

export async function saveNewsletterSettings(
  input: { provider: ProviderId; key: string; audienceId: string; audienceName: string; enabled: boolean },
  db: Db = getDb(),
): Promise<void> {
  const values = {
    provider: input.provider,
    keyCiphertext: seal(input.key),
    keyHint: input.key.slice(-4),
    audienceId: input.audienceId,
    audienceName: input.audienceName.slice(0, 200),
    enabled: input.enabled,
    keyRejectedAt: null,
    updatedAt: new Date(),
  };
  await db.insert(newsletterSettings).values({ id: 1, ...values }).onConflictDoUpdate({ target: newsletterSettings.id, set: values });
}

/** La base refuse l'activation sans service ni liste (contrainte newsletter_settings_enabled_check). */
export async function setNewsletterEnabled(enabled: boolean, db: Db = getDb()): Promise<void> {
  await db.update(newsletterSettings).set({ enabled, updatedAt: new Date() }).where(eq(newsletterSettings.id, 1));
}

export async function disconnectNewsletter(db: Db = getDb()): Promise<void> {
  await db.delete(newsletterSettings).where(eq(newsletterSettings.id, 1));
}

/** Le service a répondu 401/403 : l'espace affiche « reconnecte ton service ». */
export async function markKeyRejected(db: Db = getDb()): Promise<void> {
  await db.update(newsletterSettings).set({ keyRejectedAt: new Date() }).where(eq(newsletterSettings.id, 1));
}
