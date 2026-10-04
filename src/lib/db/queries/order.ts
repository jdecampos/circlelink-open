import 'server-only';
import { sql } from 'drizzle-orm';
import { exec } from '../client';
import type { categories, links } from '../schema';

/**
 * Redistribue entre les éléments listés les places qu'ils occupent, dans l'ordre donné.
 * Les autres ne bougent pas : réordonner une catégorie revient à envoyer ses seuls liens.
 * false si un identifiant est inconnu ou répété.
 */
export async function reorder(table: typeof categories | typeof links, ids: string[]): Promise<boolean> {
  if (!ids.length || new Set(ids).size !== ids.length) return false;
  const list = sql.join(
    ids.map((id) => sql`${id}::uuid`),
    sql`, `,
  );
  const rows = await exec<{ position: number }>(sql`select position from ${table} where id in (${list}) order by position, created_at`);
  if (rows.length !== ids.length) return false;
  const cases = sql.join(
    ids.map((id, i) => sql`when ${id}::uuid then ${Number(rows[i].position)}::int`),
    sql` `,
  );
  // une seule requête : l'échange est atomique
  await exec(sql`update ${table} set position = case id ${cases} end where id in (${list})`);
  return true;
}
