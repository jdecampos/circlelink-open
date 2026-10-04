import 'server-only';
import { classify, num, readOrThrow, request } from './http';
import type { Connector } from './types';

// API v4 de Kit (ex-ConvertKit) : https://developers.kit.com/
const BASE = 'https://api.kit.com/v4';
const LABEL = 'Kit';
const headers = (key: string) => ({ 'X-Kit-Api-Key': key });

type Tag = { id?: unknown; name?: unknown };

export const kit: Connector = {
  id: 'kit',
  label: LABEL,
  audienceLabel: 'tag',
  keyHelp: { url: 'https://app.kit.com/account_settings/developer_settings', text: 'Kit → Paramètres → Développeur → « Ajouter une clé API v4 ». Les inscrits reçoivent le tag choisi.' },

  checkKey: (key) => (key.length >= 20 ? null : 'Clé Kit trop courte : copie la clé API v4 en entier.'),

  async listAudiences(key, { timeoutMs }) {
    const json = readOrThrow(await request(`${BASE}/tags?per_page=500`, { headers: headers(key), timeoutMs }), LABEL);
    const tags = (json as { tags?: Tag[] } | null)?.tags ?? [];
    return tags.map((t) => ({ id: String(t.id), name: String(t.name ?? t.id), count: null }));
  },

  async subscribe(key, audienceId, sub, { timeoutMs }) {
    // Kit crée l'abonné puis lui pose le tag : deux appels, dans le même budget
    const start = Date.now();
    const created = classify(await request(`${BASE}/subscribers`, { method: 'POST', headers: headers(key), body: { email_address: sub.email }, timeoutMs }));
    if (created.kind !== 'ok') return created;
    const left = timeoutMs - (Date.now() - start);
    if (left < 100) return { kind: 'retry', cause: 'budget épuisé avant le tag' };
    const url = `${BASE}/tags/${encodeURIComponent(audienceId)}/subscribers`;
    return classify(await request(url, { method: 'POST', headers: headers(key), body: { email_address: sub.email }, timeoutMs: left }));
  },

  async countSubscribers(key, audienceId, { timeoutMs }) {
    const url = `${BASE}/tags/${encodeURIComponent(audienceId)}/subscribers?per_page=1&include_total_count=true`;
    const json = readOrThrow(await request(url, { headers: headers(key), timeoutMs }), LABEL);
    return num((json as { pagination?: { total_count?: unknown } } | null)?.pagination?.total_count, LABEL);
  },
};
