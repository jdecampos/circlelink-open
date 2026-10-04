import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '@/lib/auth/server';

// Better Auth est créé à la première requête, pas au chargement du module :
// le build de l'image n'a ni base ni secret.
const handler = () => toNextJsHandler(getAuth());

export const GET = (req: Request) => handler().GET(req);
export const POST = (req: Request) => handler().POST(req);
