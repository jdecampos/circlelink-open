import { NETWORKS } from '@/lib/links';

/* Schémas des objets de l'API, et réponses communes. */

const uuid = { type: 'string', format: 'uuid' } as const;
const linkType = { type: 'string', enum: ['link', 'featured', 'product'], default: 'link', description: '`link` : bouton simple · `featured` : mis en avant, avec description · `product` : avec description et prix' };

const linkProps = {
  category_id: uuid,
  title: { type: 'string', minLength: 1, maxLength: 70, example: 'Ma formation Circle' },
  url: { type: 'string', maxLength: 2048, description: '`https:`, `http:` ou `mailto:` seulement ; `https://` ajouté si le schéma manque.', example: 'example.com/formation' },
  type: linkType,
  description: { type: 'string', maxLength: 140, description: 'Ignorée pour `link`.' },
  price: { type: 'string', maxLength: 20, description: 'Pour `product` seulement.' },
  visible: { type: 'boolean', default: true },
};

export const schemas = {
  Error: { type: 'object', required: ['error'], properties: { error: { type: 'string', example: 'Adresse invalide. Exemple : https://monsite.fr/page' } } },
  Profile: {
    type: 'object',
    properties: {
      name: { type: 'string', maxLength: 40, example: 'Alex' },
      handle: { type: 'string', pattern: '^[a-z0-9._-]{2,30}$', example: 'alex' },
      bio: { type: 'string', maxLength: 160 },
      location: { type: 'string', maxLength: 40, example: 'Lyon · en ligne' },
      socials: {
        type: 'object',
        description: 'Un champ vide masque l’icône. `https://` est ajouté si besoin ; `email` reçoit une adresse.',
        properties: Object.fromEntries(NETWORKS.map((n) => [n.id, { type: 'string', example: n.id === 'email' ? 'contact@example.com' : `https://${n.id}.com/moi` }])),
      },
      theme: { type: 'string', enum: ['clair', 'sombre'] },
      link_shape: { type: 'string', enum: ['pilule', 'arrondi', 'carre'] },
      avatar_url: { type: 'string', maxLength: 2048, description: 'Photo : URL `https:` d’une image ; vide pour afficher l’initiale du nom.', example: 'https://example.com/photo.jpg' },
      logo_url: { type: 'string', maxLength: 2048, description: 'Logo en haut à gauche, thème clair : URL `https:` d’une image ; vide pour le logo de CircleLink.', example: 'https://example.com/logo.svg' },
      logo_dark_url: { type: 'string', maxLength: 2048, description: 'Logo pour le thème sombre ; vide : celui du thème clair, sinon le logo de CircleLink.', example: 'https://example.com/logo-blanc.svg' },
    },
  },
  Category: {
    type: 'object',
    properties: { id: uuid, name: { type: 'string', minLength: 1, maxLength: 24, example: 'Formations' }, position: { type: 'integer' } },
  },
  Link: {
    type: 'object',
    properties: {
      id: uuid,
      type: linkType,
      category_id: uuid,
      title: { type: 'string', example: 'Ma formation Circle' },
      url: { type: 'string', example: 'https://example.com/formation' },
      description: { type: 'string' },
      price: { type: 'string', example: '29 €' },
      visible: { type: 'boolean' },
      position: { type: 'integer', description: 'Ordre sur la page, commun à toutes les catégories.' },
    },
  },
  LinkInput: { type: 'object', required: ['category_id', 'title', 'url'], properties: linkProps },
  LinkPatch: { type: 'object', description: 'Seuls les champs envoyés changent.', properties: linkProps },
  ImportLink: { type: 'object', required: ['title', 'url'], properties: Object.fromEntries(Object.entries(linkProps).filter(([k]) => k !== 'category_id')) },
  Ids: { type: 'object', required: ['ids'], properties: { ids: { type: 'array', items: uuid, description: 'Les éléments listés échangent leurs places entre eux, dans cet ordre. Les autres ne bougent pas.' } } },
  ImportInput: {
    type: 'object',
    properties: {
      profile: { $ref: '#/components/schemas/Profile' },
      categories: {
        type: 'array',
        maxItems: 50,
        items: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', description: 'Réutilisée si une catégorie porte déjà ce nom (à la casse près).', example: 'Formations' },
            links: { type: 'array', description: '500 liens au plus pour tout l’import.', items: { $ref: '#/components/schemas/ImportLink' } },
          },
        },
      },
    },
    example: {
      profile: { name: 'Alex', handle: 'alex', bio: 'Je t’aide à lancer ta communauté.' },
      categories: [
        { name: 'Formations', links: [{ type: 'product', title: 'Formation complète', url: 'https://example.com/formation', description: '6 h de vidéo', price: '149 €' }] },
        { name: 'Contact', links: [{ title: 'M’écrire', url: 'mailto:contact@example.com' }] },
      ],
    },
  },
  ImportReport: { type: 'object', properties: { categories_created: { type: 'integer' }, categories_reused: { type: 'integer' }, links_created: { type: 'integer' } } },
};

const err = (description: string) => ({ description, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } });
export const responses = {
  BadRequest: err('Corps illisible : JSON attendu.'),
  Unauthorized: err('Clé API absente, invalide ou révoquée.'),
  NotFound: err('Identifiant inconnu.'),
  Conflict: err('La catégorie contient des liens : précise `move_to`.'),
  Unprocessable: err('Donnée refusée ; le message nomme la cause.'),
};
