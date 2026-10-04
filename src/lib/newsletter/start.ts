import { logNewsletter } from './log';
import { processQueue } from './retry';
import { scheduleQueueRetry } from './schedule';

/**
 * Appelé une fois par processus, depuis src/instrumentation.ts. Tourne toujours : le service
 * se branche depuis l'espace, sans redémarrage ; sans service, la reprise ne fait que purger.
 */
export function startNewsletterRetry(): void {
  console.log('newsletter : reprise de la file toutes les 15 minutes');
  scheduleQueueRetry(
    () => processQueue({ limit: 50 }),
    (e) => logNewsletter('newsletter.retry', { outcome: 'failed', cause: e instanceof Error ? e.message : 'erreur inattendue' }),
  );
}
