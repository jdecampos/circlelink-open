/** Au démarrage du serveur : reprise interne de la file newsletter, si Mautic est configuré. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { startNewsletterRetry } = await import('./lib/newsletter/start');
  startNewsletterRetry();
}
