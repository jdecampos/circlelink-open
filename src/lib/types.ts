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
  /** Mention « Propulsé par CircleLink » en pied de page. */
  show_credit: boolean;
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
  /** Mautic configuré : bloc « Recevoir les nouveautés » affiché. */
  newsletter: boolean;
};

/** Clé API du compte, sans sa valeur : seul le début est affichable. */
export type ApiKeyInfo = { prefix: string; created_at: string; last_used_at: string | null };

export type AdminData = PageData & {
  email: string;
  clicks: Record<string, number>;
  sources: { source: string; clicks: number }[];
  /** File d'attente newsletter : inscriptions pas encore transmises à Mautic, et perdues. */
  queue: { pending: number; lost: number };
  apiKey: ApiKeyInfo | null;
};

export type ActionResult = { ok: true } | { ok: false; error: string };
