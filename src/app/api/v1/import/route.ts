import { api, body, invalid, json } from '@/lib/api/http';
import { importFrom } from '@/lib/content/import';
import { importContent } from '@/lib/db/queries/import';
import { getProfile } from '@/lib/db/queries/profile';

/** Profil, catégories et liens en un appel, tout ou rien. */
export const POST = api(
  async (req) => {
    const content = importFrom(await body(req), await getProfile());
    if (typeof content === 'string') throw invalid(content);
    return json(await importContent(content), 201);
  },
  { writes: true },
);
