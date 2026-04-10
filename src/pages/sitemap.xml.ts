import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  const siteUrl = 'https://dagauto.ro';
  const DB = (locals as any).runtime?.env?.DB;

  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/parc-auto', priority: '0.9', changefreq: 'daily' },
    { url: '/de-ce-noi', priority: '0.8', changefreq: 'monthly' },
    { url: '/contact', priority: '0.8', changefreq: 'monthly' },
    { url: '/blog', priority: '0.7', changefreq: 'weekly' },
    { url: '/test-drive', priority: '0.7', changefreq: 'monthly' },
    { url: '/cerere-finantare', priority: '0.7', changefreq: 'monthly' },
    { url: '/programeaza-vizita', priority: '0.6', changefreq: 'monthly' },
    { url: '/comanda-speciala', priority: '0.6', changefreq: 'monthly' },
    { url: '/masini-second-hand-buzau', priority: '0.8', changefreq: 'weekly' },
    { url: '/comparator', priority: '0.5', changefreq: 'monthly' },
    // SEO marca pages
    ...['dacia','volkswagen','bmw','ford','renault','opel','skoda','toyota','hyundai','kia','audi','mercedes'].map(m => ({
      url: `/masini-second-hand/${m}`, priority: '0.7', changefreq: 'weekly',
    })),
  ];

  let carPages: { url: string; priority: string; changefreq: string }[] = [];
  let blogPages: { url: string; priority: string; changefreq: string }[] = [];

  if (DB) {
    try {
      const cars = await DB.prepare(
        "SELECT slug, updated_at FROM cars WHERE status = 'available' ORDER BY created_at DESC LIMIT 500"
      ).all();
      carPages = (cars.results || []).map((car: any) => ({
        url: `/parc-auto/${car.slug}`,
        priority: '0.8',
        changefreq: 'weekly',
      }));

      const posts = await DB.prepare(
        "SELECT slug FROM blog_posts WHERE status = 'published' ORDER BY created_at DESC LIMIT 200"
      ).all();
      blogPages = (posts.results || []).map((post: any) => ({
        url: `/blog/${post.slug}`,
        priority: '0.6',
        changefreq: 'monthly',
      }));
    } catch {}
  }

  const allPages = [...staticPages, ...carPages, ...blogPages];
  const today = new Date().toISOString().split('T')[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(p => `  <url>
    <loc>${siteUrl}${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
