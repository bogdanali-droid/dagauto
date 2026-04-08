import { defineMiddleware } from 'astro:middleware';
import { getSessionToken, verifySessionToken } from './lib/auth';
import { getUserByUsername } from './lib/db';

export const onRequest = defineMiddleware(async (context, next) => {
  const { DB, SESSION_SECRET } = context.locals.runtime.env;
  const secret = SESSION_SECRET || 'dev-secret-change-in-prod';

  // Protect admin routes (except login/logout)
  const isAdminRoute = context.url.pathname.startsWith('/admin');
  const isLoginPage = context.url.pathname === '/admin/login';
  const isLogoutRoute = context.url.pathname === '/admin/logout';

  if (isAdminRoute && !isLoginPage && !isLogoutRoute) {
    const token = getSessionToken(context.request);
    if (!token) return context.redirect('/admin/login');

    const userId = await verifySessionToken(token, secret);
    if (!userId) return context.redirect('/admin/login');

    // Attach user to locals
    const user = await DB.prepare('SELECT id, username FROM users WHERE id = ?').bind(userId).first<{ id: number; username: string }>();
    if (!user) return context.redirect('/admin/login');

    context.locals.user = user;
  }

  return next();
});
