import 'server-only';
import { revalidatePath, revalidateTag } from 'next/cache';
import type { OwnerSession } from '@/lib/auth/owner';
import { PUBLIC_PAGE_TAG } from '@/lib/cache-tags';
import { CategoryNotEmptyError, DuplicateNameError } from '@/lib/db/queries/categories';
import { ApiAuthError, requireApiOwner } from './auth';

/** Refus prévu, avec son code HTTP et un message en français qui nomme la cause. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const json = (data: unknown, status = 200) => Response.json(data, { status });
export const noContent = () => new Response(null, { status: 204 });
export const invalid = (message: string) => new ApiError(422, message);
export const notFound = (message: string) => new ApiError(404, message);

/** Corps de la requête : un objet JSON, sinon 400. */
export async function body(req: Request): Promise<Record<string, unknown>> {
  let v: unknown;
  try {
    v = await req.json();
  } catch {
    throw new ApiError(400, 'Corps de requête illisible : envoie du JSON (Content-Type: application/json).');
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new ApiError(400, 'Le corps de la requête doit être un objet JSON.');
  return v as Record<string, unknown>;
}

/** Après une écriture : la page publique et l'admin repartent de la base (constitution VII.2). */
function published() {
  // hors server action, updateTag n'existe pas : { expire: 0 } expire le cache tout de suite
  revalidateTag(PUBLIC_PAGE_TAG, { expire: 0 });
  revalidatePath('/');
  revalidatePath('/admin', 'layout');
}

type Handler<P> = (req: Request, ctx: { owner: OwnerSession; params: P }) => Promise<Response>;

/** Route de /api/v1 : clé propriétaire d'abord, puis le traitement ; chaque erreur devient un code HTTP. */
export function api<P extends Record<string, string> = Record<string, never>>(handler: Handler<P>, opts: { writes?: boolean } = {}) {
  return async (req: Request, ctx: { params: Promise<P> }): Promise<Response> => {
    try {
      const owner = await requireApiOwner(req);
      const res = await handler(req, { owner, params: await ctx.params });
      if (opts.writes && res.ok) published();
      return res;
    } catch (e) {
      if (e instanceof ApiAuthError) return Response.json({ error: e.message }, { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } });
      if (e instanceof ApiError) return json({ error: e.message }, e.status);
      if (e instanceof DuplicateNameError) return json({ error: e.message }, 422);
      if (e instanceof CategoryNotEmptyError) return json({ error: 'La catégorie contient des liens : précise move_to.' }, 409);
      // le détail reste côté serveur, sans en-tête ni corps (la clé n'y est jamais)
      console.error('api', req.method, new URL(req.url).pathname, e instanceof Error ? e.message : e);
      return json({ error: 'Erreur interne. Réessaie dans un instant.' }, 500);
    }
  };
}
