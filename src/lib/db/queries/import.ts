import 'server-only';
import type { Profile } from '@/lib/types';
import { getDb } from '../client';
import { categoryIdByName, createCategory } from './categories';
import { createLink, type LinkRow } from './links';
import { updateProfile } from './profile';

export type ImportContent = {
  profile: Profile | null;
  categories: { name: string; links: Omit<LinkRow, 'categoryId'>[] }[];
};
export type ImportReport = { categories_created: number; categories_reused: number; links_created: number };

/**
 * Ajoute au contenu existant, tout ou rien : profil, catégories (réutilisées si le nom
 * existe déjà, à la casse près), puis leurs liens à la fin de chaque catégorie.
 * Les entrées sont déjà validées : la base reste le dernier verrou.
 */
export function importContent(input: ImportContent): Promise<ImportReport> {
  return getDb().transaction(async (tx) => {
    const report: ImportReport = { categories_created: 0, categories_reused: 0, links_created: 0 };
    if (input.profile) await updateProfile(input.profile, tx);
    for (const c of input.categories) {
      let id = await categoryIdByName(c.name, tx);
      if (id) report.categories_reused++;
      else {
        id = await createCategory(c.name, tx);
        report.categories_created++;
      }
      for (const l of c.links) {
        await createLink({ ...l, categoryId: id }, {}, tx);
        report.links_created++;
      }
    }
    return report;
  });
}
