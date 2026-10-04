/* Routes de /api/v1, une entrée par méthode. */

const ref = (name: string) => ({ $ref: '#/components/schemas/' + name });
const ok = (schema: object, description = 'OK') => ({ description, content: { 'application/json': { schema } } });
const list = (name: string) => ({ type: 'array', items: ref(name) });
const jsonBody = (schema: object) => ({ required: true, content: { 'application/json': { schema } } });
const fail = (...codes: ('BadRequest' | 'NotFound' | 'Conflict' | 'Unprocessable')[]) =>
  Object.fromEntries([['401', { $ref: '#/components/responses/Unauthorized' }], ...codes.map((c) => [{ BadRequest: '400', NotFound: '404', Conflict: '409', Unprocessable: '422' }[c], { $ref: '#/components/responses/' + c }])]);
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };

export const paths = {
  '/page': {
    get: { operationId: 'getPage', tags: ['Page'], summary: 'Tout le contenu', description: 'Profil, catégories et liens, masqués compris.', responses: { 200: ok({ type: 'object', properties: { profile: ref('Profile'), categories: list('Category'), links: list('Link') } }), ...fail() } },
  },
  '/import': {
    post: {
      operationId: 'importContent',
      tags: ['Page'],
      summary: 'Remplir la page en un appel',
      description: 'Ajoute profil, catégories et liens, **tout ou rien** : une seule entrée invalide et rien n’est écrit. Le contenu existant est gardé.',
      requestBody: jsonBody(ref('ImportInput')),
      responses: { 201: ok(ref('ImportReport'), 'Importé'), ...fail('BadRequest', 'Unprocessable') },
    },
  },
  '/profile': {
    get: { operationId: 'getProfile', tags: ['Profil'], summary: 'Lire le profil', responses: { 200: ok(ref('Profile')), ...fail() } },
    patch: { operationId: 'updateProfile', tags: ['Profil'], summary: 'Modifier le profil', description: 'Seuls les champs envoyés changent ; `socials` est fusionné réseau par réseau.', requestBody: jsonBody(ref('Profile')), responses: { 200: ok(ref('Profile')), ...fail('BadRequest', 'Unprocessable') } },
  },
  '/categories': {
    get: { operationId: 'listCategories', tags: ['Catégories'], summary: 'Lister les catégories', responses: { 200: ok(list('Category')), ...fail() } },
    post: {
      operationId: 'createCategory',
      tags: ['Catégories'],
      summary: 'Créer une catégorie',
      description: 'Ajoutée en dernière position. Nom unique, à la casse près.',
      requestBody: jsonBody({ type: 'object', required: ['name'], properties: { name: { type: 'string', maxLength: 24, example: 'Podcast' } } }),
      responses: { 201: ok(ref('Category'), 'Créée'), ...fail('BadRequest', 'Unprocessable') },
    },
  },
  '/categories/{id}': {
    patch: {
      operationId: 'renameCategory',
      tags: ['Catégories'],
      summary: 'Renommer une catégorie',
      parameters: [idParam],
      requestBody: jsonBody({ type: 'object', required: ['name'], properties: { name: { type: 'string', maxLength: 24 } } }),
      responses: { 200: ok(ref('Category')), ...fail('BadRequest', 'NotFound', 'Unprocessable') },
    },
    delete: {
      operationId: 'deleteCategory',
      tags: ['Catégories'],
      summary: 'Supprimer une catégorie',
      description: 'Une catégorie qui contient des liens demande `move_to` : ses liens y sont déplacés, tout ou rien.',
      parameters: [idParam, { name: 'move_to', in: 'query', schema: { type: 'string', format: 'uuid' } }],
      responses: { 204: { description: 'Supprimée' }, ...fail('NotFound', 'Conflict', 'Unprocessable') },
    },
  },
  '/categories/order': {
    put: { operationId: 'reorderCategories', tags: ['Catégories'], summary: 'Réordonner des catégories', requestBody: jsonBody(ref('Ids')), responses: { 200: ok(list('Category')), ...fail('BadRequest', 'Unprocessable') } },
  },
  '/links': {
    get: {
      operationId: 'listLinks',
      tags: ['Liens'],
      summary: 'Lister les liens',
      parameters: [{ name: 'category_id', in: 'query', schema: { type: 'string', format: 'uuid' } }],
      responses: { 200: ok(list('Link')), ...fail('Unprocessable') },
    },
    post: { operationId: 'createLink', tags: ['Liens'], summary: 'Créer un lien', description: 'Ajouté à la fin de sa catégorie.', requestBody: jsonBody(ref('LinkInput')), responses: { 201: ok(ref('Link'), 'Créé'), ...fail('BadRequest', 'Unprocessable') } },
  },
  '/links/{id}': {
    get: { operationId: 'getLink', tags: ['Liens'], summary: 'Lire un lien', parameters: [idParam], responses: { 200: ok(ref('Link')), ...fail('NotFound') } },
    patch: {
      operationId: 'updateLink',
      tags: ['Liens'],
      summary: 'Modifier un lien',
      description: 'Seuls les champs envoyés changent. `{ "visible": false }` masque le lien.',
      parameters: [idParam],
      requestBody: jsonBody(ref('LinkPatch')),
      responses: { 200: ok(ref('Link')), ...fail('BadRequest', 'NotFound', 'Unprocessable') },
    },
    delete: { operationId: 'deleteLink', tags: ['Liens'], summary: 'Supprimer un lien', description: 'Ses statistiques de clics sont supprimées avec lui.', parameters: [idParam], responses: { 204: { description: 'Supprimé' }, ...fail('NotFound') } },
  },
  '/links/order': {
    put: { operationId: 'reorderLinks', tags: ['Liens'], summary: 'Réordonner des liens', description: 'Envoie par exemple les liens d’une catégorie dans leur nouvel ordre.', requestBody: jsonBody(ref('Ids')), responses: { 200: ok(list('Link')), ...fail('BadRequest', 'Unprocessable') } },
  },
};
