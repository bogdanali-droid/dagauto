import type { APIRoute } from 'astro';
import { clearB2BCookie } from '../../lib/b2b-auth';

export const GET: APIRoute = async () => {
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/b2b',
      'Set-Cookie': clearB2BCookie(),
    },
  });
};
