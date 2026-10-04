import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Contrôle rapide de /admin : sans cookie de session, direction /connexion. La vraie
 * vérification (session valide ET propriétaire) a lieu dans le layout et dans chaque action.
 * Pose aussi le cookie indicateur `cb-owner`, sans aucune donnée, que la page publique lit pour
 * afficher « Modifier ma page » sans appeler le serveur. La page publique ne passe pas ici.
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = '/connexion';
    url.search = '';
    return NextResponse.redirect(url);
  }
  const response = NextResponse.next();
  response.cookies.set('cb-owner', '1', { path: '/', sameSite: 'lax', secure: request.nextUrl.protocol === 'https:', maxAge: 60 * 60 * 24 * 30 });
  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
