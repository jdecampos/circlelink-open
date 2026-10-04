import type { ImportContent } from '@/lib/db/queries/import';
import type { Profile } from '@/lib/types';
import { categoryNameFrom, linkFrom } from './validate';
import { mergeProfile } from './merge';

export const IMPORT_LIMITS = { categories: 50, links: 500 };
// linkFrom exige une catégorie : celle de l'import n'existe pas encore, on valide avec un identifiant fictif
const PENDING_CATEGORY = '00000000-0000-0000-0000-000000000000';

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Valide tout l'import avant d'écrire quoi que ce soit ; l'erreur nomme l'entrée fautive. */
export function importFrom(body: Record<string, unknown>, current: Profile): ImportContent | string {
  const cats = body.categories ?? [];
  if (!Array.isArray(cats)) return 'categories doit être une liste.';
  if (cats.length > IMPORT_LIMITS.categories) return `${IMPORT_LIMITS.categories} catégories au plus par import.`;
  const total = cats.reduce((n: number, c: unknown) => n + (isObject(c) && Array.isArray(c.links) ? c.links.length : 0), 0);
  if (total > IMPORT_LIMITS.links) return `${IMPORT_LIMITS.links} liens au plus par import.`;

  let profile: Profile | null = null;
  if (body.profile !== undefined) {
    if (!isObject(body.profile)) return 'profile doit être un objet.';
    const p = mergeProfile(current, body.profile);
    if (typeof p === 'string') return 'profile : ' + p;
    profile = p;
  }
  if (!profile && !cats.length) return 'Rien à importer : envoie profile ou categories.';

  const out: ImportContent['categories'] = [];
  for (const [i, c] of cats.entries()) {
    const at = `categories[${i}]`;
    if (!isObject(c)) return at + ' doit être un objet.';
    const name = categoryNameFrom(c.name);
    if (typeof name !== 'string') return `${at}.name : ${name.error}`;
    const links = c.links ?? [];
    if (!Array.isArray(links)) return at + '.links doit être une liste.';
    const rows: ImportContent['categories'][number]['links'] = [];
    for (const [j, l] of links.entries()) {
      if (!isObject(l)) return `${at}.links[${j}] doit être un objet.`;
      const row = linkFrom({ ...l, category_id: PENDING_CATEGORY });
      if (typeof row === 'string') return `${at}.links[${j}] : ${row}`;
      rows.push({ type: row.type, title: row.title, url: row.url, description: row.description, price: row.price, visible: row.visible });
    }
    out.push({ name, links: rows });
  }
  return { profile, categories: out };
}
