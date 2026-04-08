import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  const results: Record<string, unknown> = {};
  try {
    const DB = locals.runtime?.env?.DB;
    if (!DB) return new Response(JSON.stringify({ error: 'No DB binding' }), { status: 500 });

    results.cars_count = await DB.prepare('SELECT COUNT(*) as total FROM cars').first();
    results.blog_count = await DB.prepare('SELECT COUNT(*) as total FROM blog_posts').first();
    results.submissions_count = await DB.prepare('SELECT COUNT(*) as total FROM form_submissions').first();
    results.recent_cars = await DB.prepare('SELECT id, title FROM cars ORDER BY id DESC LIMIT 3').all();
    results.ok = true;
  } catch (e: any) {
    results.error = e?.message || String(e);
    results.stack = e?.stack;
  }
  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
};
