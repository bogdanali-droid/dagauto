import { defineMiddleware } from 'astro:middleware';
import { getSessionToken, verifySessionToken } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;

  // Only run auth check for admin routes (except login/logout)
  const isAdminRoute = pathname.startsWith('/admin');
  const isLoginPage = pathname === '/admin/login';
  const isLogoutRoute = pathname === '/admin/logout';

  if (!isAdminRoute || isLoginPage || isLogoutRoute) {
    return next();
  }

  // From here on: protected admin routes only
  try {
    const env = context.locals.runtime?.env;
    if (!env) return context.redirect('/admin/login');

    const secret = env.SESSION_SECRET || 'dev-secret-change-in-prod';
    const token = getSessionToken(context.request);
    if (!token) return context.redirect('/admin/login');

    const userId = await verifySessionToken(token, secret);
    if (!userId) return context.redirect('/admin/login');

    const user = await env.DB.prepare('SELECT id, username FROM users WHERE id = ?')
      .bind(userId)
      .first<{ id: number; username: string }>();
    if (!user) return context.redirect('/admin/login');

    context.locals.user = user;
  } catch (e) {
    console.error('Middleware error:', e);
    return context.redirect('/admin/login');
  }

  return next();
});
