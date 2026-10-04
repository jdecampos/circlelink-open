import { api, body, invalid, json } from '@/lib/api/http';
import { isId, linkFrom } from '@/lib/content/validate';
import { getCategory } from '@/lib/db/queries/categories';
import { createLink, getLink, listLinks } from '@/lib/db/queries/links';

/** ?category_id=<id> : les liens de cette catégorie seulement. */
export const GET = api(async (req) => {
  const cat = new URL(req.url).searchParams.get('category_id');
  if (cat !== null && !isId(cat)) throw invalid('category_id invalide.');
  return json(await listLinks(cat ?? undefined));
});

export const POST = api(
  async (req) => {
    const row = linkFrom(await body(req));
    if (typeof row === 'string') throw invalid(row);
    if (!(await getCategory(row.categoryId))) throw invalid('Catégorie introuvable.');
    const id = await createLink(row);
    return json(await getLink(id), 201);
  },
  { writes: true },
);
