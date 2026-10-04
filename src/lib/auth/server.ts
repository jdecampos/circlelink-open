import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { magicLink } from 'better-auth/plugins';
import { getDb } from '@/lib/db/client';
import { mailEnabled } from '@/lib/features';
import { siteUrl } from '@/lib/site';
import * as schema from '@/lib/db/schema';
import { magicLinkMail, resetPasswordMail, sendMail } from './mail';
import { isOwnerEmail } from '@/lib/db/queries/owner';
import { getProfile } from '@/lib/db/queries/profile';
import { displayName } from '@/lib/brand';

/** Durées fixées par la spec 002 (US-004, « Données personnelles »). */
export const AUTH_DURATIONS = {
  sessionSeconds: 60 * 60 * 24 * 30, // 30 jours glissants
  sessionRefreshSeconds: 60 * 60 * 24,
  tokenSeconds: 15 * 60, // lien magique et réinitialisation
} as const;

// Better Auth envoie le lien même à une adresse inconnue (il ne refuse qu'au clic).
// On n'écrit qu'au propriétaire : personne ne peut faire envoyer des emails depuis
// l'instance à une adresse quelconque. La réponse reste identique (rien n'est révélé).
const toOwnerOnly = (send: (email: string, url: string) => Promise<void>) => async (email: string, url: string) => {
  if (await isOwnerEmail(email)) await send(email, url);
};
/** Nom affiché dans l'email : celui du profil, à défaut CircleLink. */
const brand = async () => displayName((await getProfile()).name);
const sendReset = toOwnerOnly(async (email, url) => sendMail(email, resetPasswordMail(url, siteUrl(), await brand())));
const sendMagic = toOwnerOnly(async (email, url) => sendMail(email, magicLinkMail(url, siteUrl(), await brand())));

function createAuth() {
  // Sans SMTP : connexion par mot de passe seulement ; réinitialisation par scripts/reset-password.mjs.
  const mail = mailEnabled();
  return betterAuth({
    baseURL: siteUrl(), // lue à l'exécution : une même image sert n'importe quel domaine
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), { provider: 'pg', schema }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true, // un seul compte : celui du propriétaire, créé par /installation
      minPasswordLength: 8,
      resetPasswordTokenExpiresIn: AUTH_DURATIONS.tokenSeconds,
      revokeSessionsOnPasswordReset: true,
      ...(mail && { sendResetPassword: ({ user, url }: { user: { email: string }; url: string }) => sendReset(user.email, url) }),
    },
    session: { expiresIn: AUTH_DURATIONS.sessionSeconds, updateAge: AUTH_DURATIONS.sessionRefreshSeconds },
    plugins: [
      ...(mail ? [magicLink({ expiresIn: AUTH_DURATIONS.tokenSeconds, disableSignUp: true, sendMagicLink: ({ email, url }) => sendMagic(email, url) })] : []),
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
let instance: Auth | null = null;

/** Créée au premier appel : le build de l'image n'a ni base ni secret. */
export function getAuth(): Auth {
  instance ??= createAuth();
  return instance;
}
