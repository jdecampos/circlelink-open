import { api, body, invalid, json } from '@/lib/api/http';
import { listLinks } from '@/lib/db/queries/links';
import { reorder } from '@/lib/db/queries/order';
import { links } from '@/lib/db/schema';

/** Les liens listés échangent leurs places entre eux (par exemple ceux d'une catégorie). */
export const PUT = api(
  async (req) => {
    const { ids } = await body(req);
    if (!Array.isArray(ids) || !ids.every((v): v is string => typeof v === 'string')) throw invalid('ids doit être une liste d’identifiants.');
    if (!(await reorder(links, ids))) throw invalid('ids contient un lien introuvable ou répété.');
    return json(await listLinks());
  },
  { writes: true },
);
