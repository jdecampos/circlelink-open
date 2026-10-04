import { api, body, invalid, json } from '@/lib/api/http';
import { categoryNameFrom } from '@/lib/content/validate';
import { createCategory, getCategory, listCategories } from '@/lib/db/queries/categories';

export const GET = api(async () => json(await listCategories()));

export const POST = api(
  async (req) => {
    const name = categoryNameFrom((await body(req)).name);
    if (typeof name !== 'string') throw invalid(name.error);
    const id = await createCategory(name);
    return json(await getCategory(id), 201);
  },
  { writes: true },
);
