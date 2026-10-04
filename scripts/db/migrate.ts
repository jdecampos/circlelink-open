// Prépare la base au démarrage du conteneur, avant le serveur (voir Dockerfile) :
// variables vérifiées, base créée si absente, migrations de drizzle/, rôle applicatif de
// DATABASE_URL, puis, tant qu'aucun propriétaire n'existe, code d'installation journalisé.
// Dev : `pnpm db:migrate`.
import postgres from 'postgres';
import { envProblems } from '../../src/lib/env.ts';
import { prepareSetupCode, setupBanner } from '../../src/lib/setup/code.ts';
import { siteUrl } from '../../src/lib/site.ts';
import { setupDatabase } from './setup.ts';

// Variable manquante : on s'arrête avant tout, en la nommant (constitution V).
const problems = envProblems();
if (problems.length) {
  for (const p of problems) console.error('configuration : ' + p);
  process.exit(1);
}
// Le rôle applicatif ne peut pas se créer lui-même : il faut l'URL du propriétaire du schéma.
const migrationUrl = process.env.DATABASE_MIGRATION_URL!;

async function announceSetup(): Promise<void> {
  const sql = postgres(migrationUrl, { max: 1, onnotice: () => {} });
  try {
    const code = await prepareSetupCode((q, params) => sql.unsafe(q, (params ?? []) as never[]) as Promise<Record<string, unknown>[]>);
    if (code) console.log(setupBanner(code, siteUrl()));
  } finally {
    await sql.end();
  }
}

try {
  await setupDatabase({ migrationUrl, appUrl: process.env.DATABASE_URL, migrationsFolder: process.env.MIGRATIONS_DIR ?? 'drizzle' });
  await announceSetup();
} catch (e) {
  console.error('base : échec de l’initialisation —', e instanceof Error ? e.message : e);
  process.exitCode = 1;
}
