import 'server-only';
import { sql } from 'drizzle-orm';
import { exec, getDb } from '../client';
import { linkClicks } from '../schema';

/** Compte un clic, seulement si le lien existe et est visible : une seule requête, donc atomique. */
export async function trackClick(linkId: string, source: string): Promise<boolean> {
  const rows = await exec<{ id: number }>(sql`
    insert into link_clicks (link_id, source)
    select l.id, left(nullif(btrim(${source}), ''), 20) from links l where l.id = ${linkId} and l.visible
    returning id`);
  return rows.length > 0;
}

export async function clickCounts(): Promise<Record<string, number>> {
  const rows = await getDb()
    .select({ linkId: linkClicks.linkId, n: sql<number>`count(*)::int` })
    .from(linkClicks)
    .groupBy(linkClicks.linkId);
  return Object.fromEntries(rows.map((r) => [r.linkId, Number(r.n)]));
}

/** Clics par provenance ; une provenance absente compte comme `direct`. */
export async function clickSources(): Promise<{ source: string; clicks: number }[]> {
  const source = sql<string>`coalesce(${linkClicks.source}, 'direct')`;
  const rows = await getDb()
    .select({ source, clicks: sql<number>`count(*)::int` })
    .from(linkClicks)
    .groupBy(source)
    .orderBy(sql`count(*) desc`);
  return rows.map((r) => ({ source: r.source, clicks: Number(r.clicks) }));
}
