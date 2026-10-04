import { newsletterEnabled } from '@/lib/features';
import { readConfig } from './config';
import { logNewsletter } from './log';
import { processQueue } from './retry';
import { scheduleQueueRetry } from './schedule';

/** Appelé une fois par processus, depuis src/instrumentation.ts. */
export function startNewsletterRetry(): void {
  if (!newsletterEnabled()) return;
  console.log('newsletter : reprise de la file toutes les 15 minutes');
  scheduleQueueRetry(
    () => processQueue(readConfig(), { limit: 50 }),
    (e) => logNewsletter('newsletter.retry', { outcome: 'failed', cause: e instanceof Error ? e.message : 'erreur inattendue' }),
  );
}
