import type { NewsletterSettingsView } from '@/lib/db/queries/newsletter-settings';

export type LinkType = 'link' | 'featured' | 'product';
export type Theme = 'clair' | 'sombre';
export type LinkShape = 'pilule' | 'arrondi' | 'carre';

export type Profile = {
  name: string;
  handle: string;
  bio: string;
  location: string;
  socials: Record<string, string>;
  theme: Theme;
  link_shape: LinkShape;
  /** Photo par URL `https:` ; vide : l'initiale du nom. */
  avatar_url: string;
  /** Logo en haut à gauche, pour le thème clair et le thème sombre (URL `https:`) ; vide : logo de CircleLink. */
  logo_url: string;
  logo_dark_url: string;
};

export type Category = {
  id: string;
  name: string;
  position: number;
};

export type LinkItem = {
  id: string;
  type: LinkType;
  category_id: string;
  title: string;
  url: string;
  description: string;
  price: string;
  visible: boolean;
  position: number;
};

export type PageData = {
  profile: Profile;
  categories: Category[];
  links: LinkItem[];
  /** Newsletter activée dans l'espace, service connecté : bloc « Recevoir les nouveautés » affiché. */
  newsletter: boolean;
};

/** Clé API du compte, sans sa valeur : seul le début est affichable. */
export type ApiKeyInfo = { prefix: string; created_at: string; last_used_at: string | null };

export type AdminData = PageData & {
  email: string;
  clicks: Record<string, number>;
  sources: { source: string; clicks: number }[];
  /** File d'attente newsletter : inscriptions pas encore transmises au service, et perdues. */
  queue: { pending: number; lost: number };
  apiKey: ApiKeyInfo | null;
  /** Connecteur newsletter, sans la clé (constitution VII.3). */
  newsletterSettings: NewsletterSettingsView;
};

export type ActionResult = { ok: true } | { ok: false; error: string };
