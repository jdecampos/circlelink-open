import type { LinkRow } from '@/lib/db/queries/links';
import { EMAIL_RE, isSafeImageUrl, isSafeUrl, NETWORKS, normalizeUrl } from '@/lib/links';
import type { LinkShape, LinkType, Profile, Theme } from '@/lib/types';

/* Règles d'écriture du contenu, communes à l'admin et à l'API. Les entrées viennent du
   réseau : tout est `unknown` jusqu'ici. Les contraintes de la base restent le dernier verrou. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const LINK_TYPES: readonly LinkType[] = ['link', 'featured', 'product'];
export const THEMES: readonly Theme[] = ['clair', 'sombre'];
export const LINK_SHAPES: readonly LinkShape[] = ['pilule', 'arrondi', 'carre'];

export const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
export const isId = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === 'string' && (list as readonly string[]).includes(v);

/** Lien à écrire, ou le message qui explique le refus. */
export function linkFrom(input: Record<string, unknown>): LinkRow | string {
  const type = input.type ?? 'link';
  if (!oneOf(LINK_TYPES, type)) return 'Type de lien inconnu : link, featured ou product.';
  const title = str(input.title, 70);
  const url = normalizeUrl(str(input.url, 2048));
  if (!title) return 'Donne un titre au lien : c’est le texte du bouton.';
  if (!isSafeUrl(url)) return 'Adresse invalide. Exemple : https://monsite.fr/page';
  if (!isId(input.category_id)) return 'Choisis ou crée une catégorie.';
  if (input.visible !== undefined && typeof input.visible !== 'boolean') return 'visible doit valoir true ou false.';
  return {
    type,
    title,
    url,
    categoryId: input.category_id,
    description: type === 'link' ? '' : str(input.description, 140),
    price: type === 'product' ? str(input.price, 20) : '',
    visible: input.visible ?? true,
  };
}

export function categoryNameFrom(v: unknown): string | { error: string } {
  const name = str(v, 100);
  if (!name) return { error: 'Donne un nom à la catégorie.' };
  if (name.length > 24) return { error: '24 caractères maximum.' };
  return name;
}

function socialsFrom(input: unknown): Record<string, string> | string {
  const src = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const out: Record<string, string> = {};
  for (const n of NETWORKS) {
    const v = str(src[n.id], 2048).replace(/^mailto:/i, '');
    if (!v) out[n.id] = '';
    else if (n.id === 'email') {
      if (!EMAIL_RE.test(v)) return 'Adresse email de contact invalide.';
      out[n.id] = 'mailto:' + v;
    } else {
      const url = /^https?:\/\//i.test(v) ? v : 'https://' + v;
      if (!isSafeUrl(url)) return 'Adresse ' + n.label + ' invalide.';
      out[n.id] = url;
    }
  }
  return out;
}

/** Profil complet à écrire, ou le message qui explique le refus. */
export function profileFrom(input: Record<string, unknown>): Profile | string {
  const name = str(input.name, 40);
  const handle = str(input.handle, 30).toLowerCase();
  if (!name) return 'Indique le nom à afficher sur ta page.';
  if (!/^[a-z0-9._-]{2,30}$/.test(handle)) return 'Utilise 2 à 30 caractères : minuscules, chiffres, point ou tiret, sans espace.';
  if (!oneOf(THEMES, input.theme)) return 'Thème inconnu : clair ou sombre.';
  if (!oneOf(LINK_SHAPES, input.link_shape)) return 'Forme de lien inconnue : pilule, arrondi ou carre.';
  const socials = socialsFrom(input.socials);
  if (typeof socials === 'string') return socials;
  const avatar_url = normalizeUrl(str(input.avatar_url, 2048));
  if (avatar_url && !isSafeImageUrl(avatar_url)) return 'Photo : adresse https:// d’une image. Exemple : https://monsite.fr/photo.jpg';
  const show_credit = input.show_credit ?? true;
  if (typeof show_credit !== 'boolean') return 'show_credit doit valoir true ou false.';
  return { name, handle, bio: str(input.bio, 160), location: str(input.location, 40), socials, theme: input.theme, link_shape: input.link_shape, avatar_url, show_credit };
}
