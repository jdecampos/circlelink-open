/** Journal de la newsletter. Règle : jamais d'email, de clé, de corps de réponse du service ni d'en-tête. */
export function logNewsletter(event: string, data: { outcome?: string; cause?: string; queueId?: number; code?: string }) {
  console.warn(JSON.stringify({ event, ...data }));
}
