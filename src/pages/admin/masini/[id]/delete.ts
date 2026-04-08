import type { APIRoute } from 'astro';
import { deleteCar } from '../../../../lib/db';

export const POST: APIRoute = async ({ params, locals }) => {
  const { DB } = locals.runtime.env;
  const id = Number(params.id);
  await deleteCar(DB, id);
  return Response.redirect(new URL('/admin/masini?deleted=1', 'http://localhost'), 302);
};
