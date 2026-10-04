/** Nom du logiciel : affiché quand le profil n'a pas encore de nom, et dans « Propulsé par ». */
export const PRODUCT_NAME = 'CircleLink';

/** Dépôt public du projet (lien « Propulsé par CircleLink »). */
export const REPO_URL = 'https://github.com/jdecampos/circlelink-open';

/** Nom affiché dans les titres, l'admin et les emails : celui du profil, à défaut le produit. */
export const displayName = (profileName: string | null | undefined) => profileName?.trim() || PRODUCT_NAME;
