import { api, body, invalid, json, noContent, notFound } from '@/lib/api/http';
import { mergeLink } from '@/lib/content/merge';
import { isId } from '@/lib/content/validate';
import { getCategory } from '@/lib/db/queries/categories';
import { deleteLink, getLink, updateLink } from '@/lib/db/queries/links';

async function existing(id: string) {
  const l = isId(id) ? await getLink(id) : null;
  if (!l) throw notFound('Lien introuvable.');
  return l;
}

export const GET = api<{ id: string }>(async (_req, { params }) => json(await existing(params.id)));

/** Seuls les champs envoyés changent. */
export const PATCH = api<{ id: string }>(
  async (req, { params }) => {
    const l = await existing(params.id);
    const row = mergeLink(l, await body(req));
    if (typeof row === 'string') throw invalid(row);
    if (row.categoryId !== l.category_id && !(await getCategory(row.categoryId))) throw invalid('Catégorie introuvable.');
    await updateLink(l.id, row);
    return json(await getLink(l.id));
  },
  { writes: true },
);

export const DELETE = api<{ id: string }>(
  async (_req, { params }) => {
    if (!isId(params.id) || !(await deleteLink(params.id))) throw notFound('Lien introuvable.');
    return noContent();
  },
  { writes: true },
);
