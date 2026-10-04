import { api, body, invalid, json } from '@/lib/api/http';
import { mergeProfile } from '@/lib/content/merge';
import { getProfile, updateProfile } from '@/lib/db/queries/profile';

export const GET = api(async () => json(await getProfile()));

export const PATCH = api(
  async (req) => {
    const p = mergeProfile(await getProfile(), await body(req));
    if (typeof p === 'string') throw invalid(p);
    await updateProfile(p);
    return json(await getProfile());
  },
  { writes: true },
);
