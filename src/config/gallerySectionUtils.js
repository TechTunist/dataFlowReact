/** URL hash slugs for chart-gallery section anchors. */

export const GALLERY_SECTION_SLUGS = {
  'Free Charts': 'free-charts',
  'Premium Charts': 'premium-charts',
  Stocks: 'stocks',
  Price: 'price',
  Risk: 'risk',
  OnChain: 'onchain',
  Indicators: 'indicators',
  Macro: 'macro',
  'Advanced Models': 'advanced-models',
  Tools: 'tools',
};

export function gallerySectionHref(sectionKey) {
  const slug = GALLERY_SECTION_SLUGS[sectionKey];
  return slug ? `/chart-gallery#${slug}` : '/chart-gallery';
}

export function gallerySectionId(sectionKey) {
  return GALLERY_SECTION_SLUGS[sectionKey] || null;
}