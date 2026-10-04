// Pas de 'server-only' : vérifié au démarrage du conteneur par scripts/db/migrate.ts.

type Env = Record<string, string | undefined>;

/** Variables sans lesquelles l'instance ne peut pas démarrer. SMTP_* est facultative ; la newsletter se règle dans l'espace. */
export const REQUIRED_ENV = ['SITE_URL', 'DATABASE_URL', 'DATABASE_MIGRATION_URL', 'BETTER_AUTH_SECRET'] as const;

const HINT = 'Renseigne-la dans les variables d’environnement de l’application, ou lance ./scripts/init-env.sh <url> pour générer un fichier .env.';

/** Une erreur par variable absente ou invalide, chacune nommant la variable (constitution V). */
export function envProblems(env: Env = process.env): string[] {
  const problems: string[] = [];
  for (const name of REQUIRED_ENV) {
    if (!env[name]?.trim()) problems.push(`${name} manquante. ${HINT}`);
  }
  const site = env.SITE_URL?.trim();
  if (site && !/^https?:\/\/[^\s/]+/.test(site)) problems.push(`SITE_URL invalide (« ${site} ») : attendu une URL complète, par exemple https://mondomaine.fr`);
  const secret = env.BETTER_AUTH_SECRET?.trim();
  if (secret && secret.length < 32) problems.push('BETTER_AUTH_SECRET trop court : 32 caractères au moins (openssl rand -hex 32)');
  return problems;
}
