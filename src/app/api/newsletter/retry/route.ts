import { timingSafeEqual } from 'node:crypto';
import { logNewsletter } from '@/lib/newsletter/log';
import { processQueue } from '@/lib/newsletter/retry';

// Facultatif : l'app retente déjà la file toutes les 15 min (src/instrumentation.ts). Cette route sert
// à qui préfère un déclenchement externe. 10 inscriptions × 5 s max tiennent dans 60 s ; le reste attend.
export const maxDuration = 60;
const BATCH = 10;

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function POST(req: Request) {
  const secret = process.env.NEWSLETTER_RETRY_SECRET?.trim();
  // route facultative : sans secret, elle n'existe pas (l'app retente déjà la file elle-même)
  if (!secret) return Response.json({ error: 'NEWSLETTER_RETRY_SECRET non définie : reprise externe désactivée' }, { status: 404 });

  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ') || !sameSecret(auth.slice(7), secret)) {
    return Response.json({ error: 'non autorisé' }, { status: 401 });
  }

  try {
    return Response.json(await processQueue({ limit: BATCH }));
  } catch (e) {
    logNewsletter('newsletter.retry', { outcome: 'failed', cause: e instanceof Error ? e.message : 'erreur inattendue' });
    return Response.json({ error: 'file indisponible' }, { status: 502 });
  }
}
