import 'server-only';
import { PROVIDERS } from '../providers';
import { classify, num, readOrThrow, request } from './http';
import { ConnectorError, type Connector } from './types';

// API v3 de Brevo : https://developers.brevo.com/reference
const BASE = 'https://api.brevo.com/v3';
const LABEL = PROVIDERS.brevo.label;
const headers = (key: string) => ({ 'api-key': key });

type List = { id?: unknown; name?: unknown; uniqueSubscribers?: unknown; totalSubscribers?: unknown };

export const brevo: Connector = {
  ...PROVIDERS.brevo,

  checkKey(key) {
    if (key.startsWith('xsmtpsib-')) return 'C’est une clé SMTP : crée plutôt une clé API Brevo (elle commence par xkeysib-).';
    return key.length >= 20 ? null : 'Clé Brevo trop courte : copie-la en entier.';
  },

  async listAudiences(key, { timeoutMs }) {
    const json = readOrThrow(await request(`${BASE}/contacts/lists?limit=50&offset=0&sort=desc`, { headers: headers(key), timeoutMs }), LABEL);
    const lists = (json as { lists?: List[] } | null)?.lists;
    if (!Array.isArray(lists)) return []; // compte sans liste : Brevo ne renvoie pas le champ
    return lists.map((l) => ({ id: String(l.id), name: String(l.name ?? l.id), count: Number.isFinite(Number(l.uniqueSubscribers ?? l.totalSubscribers)) ? Number(l.uniqueSubscribers ?? l.totalSubscribers) : null }));
  },

  async subscribe(key, audienceId, sub, { timeoutMs }) {
    const listId = Number(audienceId);
    if (!Number.isInteger(listId)) return { kind: 'permanent', cause: 'liste Brevo invalide' };
    // updateEnabled : un contact existant est ajouté à la liste au lieu de provoquer un doublon
    return classify(await request(`${BASE}/contacts`, { method: 'POST', headers: headers(key), body: { email: sub.email, listIds: [listId], updateEnabled: true }, timeoutMs }));
  },

  async countSubscribers(key, audienceId, { timeoutMs }) {
    const json = readOrThrow(await request(`${BASE}/contacts/lists/${encodeURIComponent(audienceId)}`, { headers: headers(key), timeoutMs }), LABEL) as List | null;
    if (!json) throw new ConnectorError('unexpected', `Réponse inattendue de ${LABEL}.`);
    return num(json.uniqueSubscribers ?? json.totalSubscribers, LABEL);
  },
};
