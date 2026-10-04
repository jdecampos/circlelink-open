import { paths } from './paths';
import { responses, schemas } from './schemas';

/**
 * Document OpenAPI 3.1 de /api/v1, servi par /api/v1/openapi.json et lu par Scalar (/api/docs).
 * Serveur relatif : la documentation de staging appelle staging, celle de production la production.
 */
export function openApiDocument() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'CircleLink API',
      version: '1.0.0',
      description:
        'Remplis et modifie ta page de liens depuis un script ou un outil d’automatisation.\n\n' +
        'Génère ta clé dans **Admin → Apparence → Clé API**, puis envoie-la dans l’en-tête `Authorization: Bearer cl_…`. ' +
        'Chaque écriture apparaît sur ta page à la visite suivante.\n\n' +
        'Les erreurs renvoient `{ "error": "…" }`, avec un message en français qui nomme la cause.',
    },
    servers: [{ url: '/api/v1', description: 'Ce site' }],
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Page', description: 'Tout le contenu, et l’import en un appel.' },
      { name: 'Profil', description: 'Nom, bio, réseaux sociaux et apparence.' },
      { name: 'Catégories', description: 'Les onglets de la page.' },
      { name: 'Liens', description: 'Les boutons de la page, rangés par catégorie.' },
    ],
    paths,
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', description: 'Clé API générée dans Admin → Apparence (`cl_…`).' } },
      schemas,
      responses,
    },
  };
}
