import { api, body, invalid, json, noContent, notFound } from '@/lib/api/http';
import { categoryNameFrom, isId } from '@/lib/content/validate';
import { deleteCategory, getCategory, renameCategory } from '@/lib/db/queries/categories';

async function existing(id: string) {
  const c = isId(id) ? await getCategory(id) : null;
  if (!c) throw notFound('Catégorie introuvable.');
  return c;
}

export const PATCH = api<{ id: string }>(
  async (req, { params }) => {
    const c = await existing(params.id);
    const name = categoryNameFrom((await body(req)).name);
    if (typeof name !== 'string') throw invalid(name.error);
    await renameCategory(c.id, name);
    return json({ ...c, name });
  },
  { writes: true },
);

/** ?move_to=<id> : les liens de la catégorie y sont déplacés, tout ou rien. */
export const DELETE = api<{ id: string }>(
  async (req, { params }) => {
    const c = await existing(params.id);
    const moveTo = new URL(req.url).searchParams.get('move_to');
    if (moveTo !== null && (moveTo === c.id || !isId(moveTo) || !(await getCategory(moveTo)))) throw invalid('Catégorie de destination (move_to) introuvable.');
    await deleteCategory(c.id, moveTo);
    return noContent();
  },
  { writes: true },
);
