import 'server-only';
import { createHash } from 'node:crypto';
import { classify, num, readOrThrow, request } from './http';
import type { Connector } from './types';

// API Marketing de Mailchimp : https://mailchimp.com/developer/marketing/api/
const LABEL = 'Mailchimp';
// La clé se termine par le centre de données du compte (-us21…) : il donne l'hôte de l'API.
const KEY_RE = /^[0-9a-f]{32}-([a-z]{2,4}[0-9]{1,3})$/;

function base(key: string): string {
  const dc = KEY_RE.exec(key)?.[1];
  if (!dc) throw new Error('clé Mailchimp invalide'); // checkKey l'a déjà refusée
  return `https://${dc}.api.mailchimp.com/3.0`;
}
const headers = (key: string) => ({ Authorization: 'Basic ' + Buffer.from('circlelink:' + key).toString('base64') });
const memberHash = (email: string) => createHash('md5').update(email.toLowerCase()).digest('hex');

type List = { id?: unknown; name?: unknown; stats?: { member_count?: unknown } };

export const mailchimp: Connector = {
  id: 'mailchimp',
  label: LABEL,
  audienceLabel: 'audience',
  keyHelp: { url: 'https://admin.mailchimp.com/account/api/', text: 'Mailchimp → Profil → Extras → Clés API → « Créer une clé » (elle se termine par -us21, par exemple).' },

  checkKey: (key) => (KEY_RE.test(key) ? null : 'Format de clé Mailchimp inattendu : elle se termine par le centre de données, par exemple -us21.'),

  async listAudiences(key, { timeoutMs }) {
    const json = readOrThrow(await request(`${base(key)}/lists?count=100&fields=lists.id,lists.name,lists.stats.member_count`, { headers: headers(key), timeoutMs }), LABEL);
    const lists = (json as { lists?: List[] } | null)?.lists ?? [];
    return lists.map((l) => ({ id: String(l.id), name: String(l.name ?? l.id), count: Number.isFinite(Number(l.stats?.member_count)) ? Number(l.stats?.member_count) : null }));
  },

  async subscribe(key, audienceId, sub, { timeoutMs }) {
    // PUT : crée le membre ou le met à jour, sans doublon ; un désinscrit le reste (choix de Mailchimp)
    const url = `${base(key)}/lists/${encodeURIComponent(audienceId)}/members/${memberHash(sub.email)}`;
    const body = { email_address: sub.email, status_if_new: 'subscribed', tags: ['circlelink', 'source-' + sub.source] };
    return classify(await request(url, { method: 'PUT', headers: headers(key), body, timeoutMs }));
  },

  async countSubscribers(key, audienceId, { timeoutMs }) {
    const json = readOrThrow(await request(`${base(key)}/lists/${encodeURIComponent(audienceId)}?fields=stats.member_count`, { headers: headers(key), timeoutMs }), LABEL);
    return num((json as List | null)?.stats?.member_count, LABEL);
  },
};
