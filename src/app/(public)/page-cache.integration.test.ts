import postgres from 'postgres';
import { describe, expect, it } from 'vitest';

// Contrôle de la constitution VII.2 : `/` ne lit pas la base à chaque visite.
// Contre un serveur lancé (`next start`) et sa base :
//   CACHE_CHECK_URL=http://localhost:3200 CACHE_CHECK_DB=postgres://…/circlelink pnpm vitest run page-cache
const base = process.env.CACHE_CHECK_URL;
const dbUrl = process.env.CACHE_CHECK_DB;

describe.skipIf(!base || !dbUrl)('page publique servie depuis le cache', () => {
  it('20 rendus consécutifs de / → au plus 1 lecture du contenu en base', async () => {
    const sql = postgres(dbUrl ?? '', { max: 1 });
    // chaque régénération lit `profile` une fois : on compte ses scans
    const scans = async () => {
      await new Promise((r) => setTimeout(r, 1500)); // les statistiques sont publiées par lots
      const [r] = await sql`select coalesce(seq_scan, 0) + coalesce(idx_scan, 0) as n from pg_stat_user_tables where relname = 'profile'`;
      return Number(r.n);
    };
    try {
      await fetch(base + '/');
      const before = await scans();
      for (let i = 0; i < 20; i++) expect((await fetch(base + '/')).status).toBe(200);
      expect((await scans()) - before).toBeLessThanOrEqual(1);
    } finally {
      await sql.end();
    }
  }, 60_000);
});
