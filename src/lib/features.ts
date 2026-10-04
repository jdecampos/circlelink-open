import 'server-only';

/* SMTP facultatif : actif si ses variables sont présentes, lues à l'exécution (ajouter les
   variables puis redémarrer le conteneur suffit, sans reconstruire l'image). La newsletter,
   elle, se règle dans l'espace (src/lib/db/queries/newsletter-settings.ts). */

type Env = Record<string, string | undefined>;
const has = (env: Env, ...names: string[]) => names.every((n) => !!env[n]?.trim());

/** Emails de connexion (lien magique, mot de passe oublié). */
export const mailEnabled = (env: Env = process.env) => has(env, 'SMTP_HOST', 'SMTP_FROM');

/** Modes de connexion proposés par l'écran /connexion. */
export type LoginModes = { magicLink: boolean; reset: boolean };
export const loginModes = (env: Env = process.env): LoginModes => ({ magicLink: mailEnabled(env), reset: mailEnabled(env) });
