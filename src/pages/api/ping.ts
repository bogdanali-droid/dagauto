import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({
    ok: true,
    version: 'v3',
    ts: Date.now()
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
