/**
 * Generate sitemap.xml from SEO_PAGES so prerender routes stay in sync.
 */
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const { SEO_PAGES } = await import('../src/seo/staticPageContent.js');

const SITE_URL = 'https://www.cryptological.app';

const PRIORITY = {
  '/': 1.0,
  '/bitcoin-analytics': 0.9,
  '/on-chain-metrics': 0.9,
  '/crypto-charts-tools': 0.9,
  '/100-day-window': 0.9,
  '/chart-gallery': 0.8,
  '/bitcoin-whitepaper': 0.8,
};

const CHANGEFREQ = {
  '/bitcoin-whitepaper': 'monthly',
};

const uniquePaths = [...new Set(Object.values(SEO_PAGES).map((p) => p.path))];

const urls = uniquePaths
  .map((path) => {
    const loc = path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`;
    const priority = PRIORITY[path] ?? 0.8;
    const changefreq = CHANGEFREQ[path] ?? 'weekly';
    return `  <url>
    <loc>${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`;
  })
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

const targets = [
  join(rootDir, 'public', 'sitemap.xml'),
  join(rootDir, 'build', 'sitemap.xml'),
];

for (const target of targets) {
  try {
    writeFileSync(target, xml, 'utf8');
    console.log(`  ✓ ${target.replace(rootDir, '')}`);
  } catch (err) {
    if (target.includes('build')) {
      console.warn(`  ⚠ Skipped ${target} (${err.message})`);
    } else {
      throw err;
    }
  }
}

console.log(`Sitemap generated (${uniquePaths.length} URLs).`);