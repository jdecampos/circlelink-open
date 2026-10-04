/** Au démarrage du serveur : reprise interne de la file newsletter, toutes les 15 minutes. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { startNewsletterRetry } = await import('./lib/newsletter/start');
  startNewsletterRetry();
}
