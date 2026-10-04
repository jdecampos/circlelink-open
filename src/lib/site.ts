// Pas de 'server-only' : lu aussi par les scripts du conteneur (migrate, reset-password).

type Env = Record<string, string | undefined>;

const DEV_URL = 'http://localhost:3000';

/**
 * URL publique du site, lue à l'exécution (et non figée au build) : une même image
 * sert n'importe quel domaine. Sans barre finale. En production, `checkEnv()` a déjà
 * refusé le démarrage si elle manque ou n'est pas une URL http(s).
 */
export function siteUrl(env: Env = process.env): string {
  const raw = env.SITE_URL?.trim();
  return raw ? raw.replace(/\/+$/, '') : DEV_URL;
}
