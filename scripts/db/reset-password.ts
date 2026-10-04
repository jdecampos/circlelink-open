// Mot de passe oublié, sans SMTP : affiche un lien de réinitialisation valable 15 minutes.
//   docker compose exec app node scripts/reset-password.mjs <email>
// Dev : node --env-file=.env.development.local scripts/db/reset-password.ts <email>
import postgres from 'postgres';
import { createResetLink } from '../../src/lib/auth/reset-link.ts';
import { siteUrl } from '../../src/lib/site.ts';

const email = process.argv[2];
const url = process.env.DATABASE_URL;
if (!email) {
  console.error('usage : node scripts/reset-password.mjs <email du propriétaire>');
  process.exit(2);
}
if (!url) {
  console.error('configuration : DATABASE_URL manquante');
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  const link = await createResetLink((q, p) => sql.unsafe(q, (p ?? []) as never[]) as Promise<Record<string, unknown>[]>, email, siteUrl());
  console.log('Lien valable 15 minutes, utilisable une fois :\n' + link);
} catch (e) {
  console.error('réinitialisation refusée : ' + (e instanceof Error ? e.message : String(e)));
  process.exitCode = 1;
} finally {
  await sql.end();
}
