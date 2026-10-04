/** Journal de la newsletter. Règle : jamais d'email, de corps de réponse Mautic ni d'en-tête. */
export function logNewsletter(event: string, data: { outcome?: string; cause?: string; queueId?: number; code?: string }) {
  console.warn(JSON.stringify({ event, ...data }));
}
