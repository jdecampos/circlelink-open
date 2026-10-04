import 'server-only';

/* Intégrations facultatives : actives si leurs variables sont présentes, lues à l'exécution
   (ajouter les variables puis redémarrer le conteneur suffit, sans reconstruire l'image). */

type Env = Record<string, string | undefined>;
const has = (env: Env, ...names: string[]) => names.every((n) => !!env[n]?.trim());

/** Emails de connexion (lien magique, mot de passe oublié). */
export const mailEnabled = (env: Env = process.env) => has(env, 'SMTP_HOST', 'SMTP_FROM');

/** Inscription newsletter vers Mautic. */
export const newsletterEnabled = (env: Env = process.env) => has(env, 'MAUTIC_URL', 'MAUTIC_USERNAME', 'MAUTIC_PASSWORD');

/** Modes de connexion proposés par l'écran /connexion. */
export type LoginModes = { magicLink: boolean; reset: boolean };
export const loginModes = (env: Env = process.env): LoginModes => ({ magicLink: mailEnabled(env), reset: mailEnabled(env) });
