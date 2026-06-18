import React from 'react';
import { Helmet } from 'react-helmet-async';
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
} from '../seo/seoConfig';

const SeoHead = ({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '',
  keywords = DEFAULT_KEYWORDS,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  noindex = false,
  jsonLd = null,
}) => {
  const canonical = `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

  return (
    <Helmet>
      <html lang="en" />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {process.env.REACT_APP_GOOGLE_SITE_VERIFICATION && (
        <meta
          name="google-site-verification"
          content={process.env.REACT_APP_GOOGLE_SITE_VERIFICATION}
        />
      )}

      {jsonLd &&
        (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).map((item) => (
          <script key={item['@type']} type="application/ld+json">
            {JSON.stringify(item)}
          </script>
        ))}
    </Helmet>
  );
};

export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: DEFAULT_OG_IMAGE,
  description: DEFAULT_DESCRIPTION,
  sameAs: [],
};

export const webSiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  description: DEFAULT_DESCRIPTION,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/chart-gallery?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

export const softwareApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  url: SITE_URL,
  description: DEFAULT_DESCRIPTION,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free tier with basic charts; premium plans for advanced analytics',
  },
};

export default SeoHead;