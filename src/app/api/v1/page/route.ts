import { api, json } from '@/lib/api/http';
import { readAdminPage } from '@/lib/db/queries/page';

/** Tout le contenu, liens masqués compris. */
export const GET = api(async () => json(await readAdminPage()));
