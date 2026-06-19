/**
 * Post-build: inject crawlable static HTML into index.html for each public SEO route.
 * Crawlers read hidden prerender copy in #root; users see only the boot loader until React mounts.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildDir = join(__dirname, '..', 'build');

// Load SEO content (plain JS export — no transpile needed)
const { SEO_PAGES, PRERENDER_PATHS } = await import('../src/seo/staticPageContent.js');

const SITE_URL = 'https://www.cryptological.app';

// Inlined so the boot screen is styled before the JS/CSS bundles load.
const CRITICAL_BOOT_CSS = `<style>
      html, body { margin: 0; background-color: #040509; }
      .app-boot-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        color: #a3a3a3;
        font-family: "Source Sans Pro", sans-serif;
        gap: 1.25rem;
      }
      .app-boot-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(76, 206, 172, 0.2);
        border-top-color: #4cceac;
        border-radius: 50%;
        animation: app-boot-spin 0.9s linear infinite;
      }
      @keyframes app-boot-spin { to { transform: rotate(360deg); } }
      #seo-static-content {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    </style>`;

// Visible to users before React hydrates; replaced when the app mounts.
const BOOT_PLACEHOLDER = `
    <div id="app-boot-placeholder" class="app-boot-placeholder" aria-live="polite">
      <div class="app-boot-spinner" role="progressbar" aria-label="Loading"></div>
      <p>Loading...</p>
    </div>`;

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildStaticBody(page) {
  const sections = page.sections
    .map(
      (s) => `
    <section>
      <h2>${escapeHtml(s.h2)}</h2>
      ${s.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n      ')}
    </section>`
    )
    .join('\n');

  const nav = page.links
    .map((l) => `<a href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a>`)
    .join(' · ');

  // Visually hidden for users (CSS in index.html) but present in HTML source for crawlers.
  return `
    <main id="seo-static-content" aria-hidden="true">
      <header>
        <p><strong>Cryptological</strong> — Bitcoin &amp; crypto analytics</p>
        <h1>${escapeHtml(page.h1)}</h1>
      </header>
      ${sections}
      <nav aria-label="Related pages"><p>${nav}</p></nav>
      <p><a href="/login-signup?mode=signup">Sign up free</a> · <a href="/chart-gallery">Chart gallery</a></p>
    </main>`;
}

function buildRootContent(page) {
  return `${BOOT_PLACEHOLDER}${buildStaticBody(page)}`;
}

function applyMeta(template, page, path) {
  const canonical = path === '/' ? SITE_URL : `${SITE_URL}${page.path}`;
  const title = page.title.includes('Cryptological') ? page.title : `${page.title} | Cryptological`;

  let html = template;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escapeHtml(page.description)}"/>`
  );

  if (page.keywords) {
    if (html.includes('name="keywords"')) {
      html = html.replace(
        /<meta name="keywords" content="[^"]*"\s*\/?>/,
        `<meta name="keywords" content="${escapeHtml(page.keywords)}"/>`
      );
    } else {
      html = html.replace(
        /<meta name="description"[^>]*\/?>/,
        (match) => `${match}\n    <meta name="keywords" content="${escapeHtml(page.keywords)}"/>`
      );
    }
  }

  if (html.includes('rel="canonical"')) {
    html = html.replace(
      /<link rel="canonical" href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${canonical}"/>`
    );
  } else {
    html = html.replace('</head>', `  <link rel="canonical" href="${canonical}"/>\n</head>`);
  }

  const ogReplacements = [
    ['property="og:title"', 'content', escapeHtml(title)],
    ['property="og:description"', 'content', escapeHtml(page.description)],
    ['property="og:url"', 'content', canonical],
  ];

  for (const [attr, valueAttr, value] of ogReplacements) {
    const pattern = new RegExp(`<meta ${attr} ${valueAttr}="[^"]*"\\s*/?>`, 'g');
    if (html.match(pattern)) {
      html = html.replace(pattern, `<meta ${attr} ${valueAttr}="${value}"/>`);
    } else {
      html = html.replace('</head>', `  <meta ${attr} ${valueAttr}="${value}"/>\n</head>`);
    }
  }

  const twitterReplacements = [
    ['name="twitter:title"', escapeHtml(title)],
    ['name="twitter:description"', escapeHtml(page.description)],
  ];

  for (const [attr, value] of twitterReplacements) {
    const pattern = new RegExp(`<meta ${attr} content="[^"]*"\\s*/?>`, 'g');
    if (html.match(pattern)) {
      html = html.replace(pattern, `<meta ${attr} content="${value}"/>`);
    }
  }

  if (!html.includes('app-boot-critical-css')) {
    html = html.replace('</head>', `${CRITICAL_BOOT_CSS}\n</head>`);
  }

  html = html.replace(
    /<div id="root">[\s\S]*<\/div>(?=\s*<\/body>)/,
    `<div id="root">${buildRootContent(page)}</div>`
  );

  return html;
}

function writeForPath(template, page, routePath) {
  const html = applyMeta(template, page, routePath);
  if (routePath === '/') {
    writeFileSync(join(buildDir, 'index.html'), html, 'utf8');
    console.log('  ✓ / (index.html)');
    return;
  }
  const dir = join(buildDir, routePath.replace(/^\//, ''));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html, 'utf8');
  console.log(`  ✓ ${routePath}`);
}

const template = readFileSync(join(buildDir, 'index.html'), 'utf8');
const splashPage = SEO_PAGES.splash;

console.log('Generating crawlable static HTML for public routes...');

for (const routePath of PRERENDER_PATHS) {
  const page =
    routePath === '/'
      ? splashPage
      : Object.values(SEO_PAGES).find((p) => p.path === routePath);

  if (!page) {
    console.warn(`  ⚠ No SEO content for ${routePath}, skipping`);
    continue;
  }
  writeForPath(template, page, routePath);
}

console.log('SEO static HTML generation complete.');