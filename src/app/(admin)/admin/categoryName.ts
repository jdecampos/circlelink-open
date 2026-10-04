import type { Category } from '@/lib/types';

export function catNameError(name: string, categories: Category[], exceptId?: string) {
  const v = name.trim();
  if (!v) return 'Donne un nom à la catégorie.';
  if (v.length > 24) return '24 caractères maximum.';
  if (categories.some((c) => c.id !== exceptId && c.name.toLowerCase() === v.toLowerCase())) return 'Une catégorie porte déjà ce nom.';
  return '';
}
