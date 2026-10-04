import { api, body, invalid, json } from '@/lib/api/http';
import { listCategories } from '@/lib/db/queries/categories';
import { reorder } from '@/lib/db/queries/order';
import { categories } from '@/lib/db/schema';

export const PUT = api(
  async (req) => {
    const { ids } = await body(req);
    if (!Array.isArray(ids) || !ids.every((v): v is string => typeof v === 'string')) throw invalid('ids doit être une liste d’identifiants.');
    if (!(await reorder(categories, ids))) throw invalid('ids contient une catégorie introuvable ou répétée.');
    return json(await listCategories());
  },
  { writes: true },
);
