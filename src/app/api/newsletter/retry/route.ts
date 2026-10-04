import { timingSafeEqual } from 'node:crypto';
import { readConfig, type NewsletterConfig } from '@/lib/newsletter/config';
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
  let cfg: NewsletterConfig;
  try {
    cfg = readConfig(process.env, { requireRetrySecret: true });
  } catch (e) {
    // le message nomme la variable manquante, jamais une valeur
    return Response.json({ error: e instanceof Error ? e.message : 'configuration illisible' }, { status: 500 });
  }

  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ') || !sameSecret(auth.slice(7), cfg.retrySecret)) {
    return Response.json({ error: 'non autorisé' }, { status: 401 });
  }

  try {
    return Response.json(await processQueue(cfg, { limit: BATCH }));
  } catch (e) {
    logNewsletter('newsletter.retry', { outcome: 'failed', cause: e instanceof Error ? e.message : 'erreur inattendue' });
    return Response.json({ error: 'file indisponible' }, { status: 502 });
  }
}
