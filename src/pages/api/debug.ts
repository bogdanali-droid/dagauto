import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime?.env;
  return new Response(JSON.stringify({
    runtime_available: !!locals.runtime,
    env_keys: env ? Object.keys(env) : [],
    DB_available: !!(env?.DB),
    IMAGES_available: !!(env?.IMAGES),
    SESSION_SECRET_available: !!(env?.SESSION_SECRET),
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
};
