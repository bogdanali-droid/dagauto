import type { APIRoute } from 'astro';

// One-time DB migration for B2B feature
// Run once: /api/b2b-migrate-db?key=migrate2024dagauto
export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  if (url.searchParams.get('key') !== 'migrate2024dagauto') {
    return new Response('Unauthorized', { status: 401 });
  }

  const DB = locals.runtime?.env?.DB;
  if (!DB) return new Response('No DB', { status: 503 });

  const steps: string[] = [];

  try {
    await DB.prepare(`
      CREATE TABLE IF NOT EXISTS b2b_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        company TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
    steps.push('b2b_users table: OK');

    try {
      await DB.prepare(`ALTER TABLE cars ADD COLUMN b2b_user_id INTEGER`).run();
      steps.push('cars.b2b_user_id: added');
    } catch { steps.push('cars.b2b_user_id: already exists'); }

    try {
      await DB.prepare(`ALTER TABLE cars ADD COLUMN original_price INTEGER`).run();
      steps.push('cars.original_price: added');
    } catch { steps.push('cars.original_price: already exists'); }

    try {
      await DB.prepare(`ALTER TABLE cars ADD COLUMN markup_pct INTEGER DEFAULT 15`).run();
      steps.push('cars.markup_pct: added');
    } catch { steps.push('cars.markup_pct: already exists'); }

    return new Response(JSON.stringify({ success: true, steps }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, steps }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
