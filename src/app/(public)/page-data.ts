import 'server-only';
import { cache } from 'react';
import { getPublicPage } from '@/lib/data';

/** Une seule lecture du cache par rendu (layout + page + metadata). */
export const getPage = cache(getPublicPage);
