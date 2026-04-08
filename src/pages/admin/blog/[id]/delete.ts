import type { APIRoute } from 'astro';
import { deleteBlogPost } from '../../../../lib/db';

export const POST: APIRoute = async ({ params, locals }) => {
  const { DB } = locals.runtime.env;
  const id = Number(params.id);
  await deleteBlogPost(DB, id);
  return Response.redirect(new URL('/admin/blog?deleted=1', 'http://localhost'), 302);
};
