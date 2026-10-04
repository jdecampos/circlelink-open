import { vi } from 'vitest';

export type Sent = { url: string; method: string; headers: Record<string, string>; body: unknown };

/** Remplace fetch : chaque appel consomme la réponse suivante ([statut, json] ou une erreur). */
export function mockFetch(...responses: ([number, unknown] | Error)[]): Sent[] {
  const sent: Sent[] = [];
  const queue = [...responses];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      sent.push({ url, method: init.method ?? 'GET', headers: init.headers as Record<string, string>, body: init.body ? JSON.parse(String(init.body)) : undefined });
      const next = queue.shift();
      if (!next) throw new Error('appel inattendu : ' + url);
      if (next instanceof Error) throw next;
      return new Response(next[1] === null ? null : JSON.stringify(next[1]), { status: next[0] });
    }),
  );
  return sent;
}
