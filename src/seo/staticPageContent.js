/**
 * Shared copy for public SEO pages.
 * Used by React components AND post-build static HTML injection (scripts/generate-seo-html.mjs).
 */

export const SEO_PAGES = {
  splash: {
    path: '/',
    title: 'Cryptological, Bitcoin & Crypto Analytics Dashboard',
    description:
      'Professional Bitcoin and cryptocurrency analytics with on-chain metrics, risk indicators, market cycles, and macro data. Free signup, explore charts like Glassnode and LookIntoBitcoin in one platform.',
    keywords:
      'cryptological, bitcoin analytics, crypto dashboard, on-chain metrics, bitcoin charts, crypto risk metric, glassnode alternative',
    h1: 'Cryptological, Decrypt The Confusing',
    sections: [
      {
        h2: 'Bitcoin and crypto analytics in one place',
        paragraphs: [
          'Cryptological brings together Bitcoin price charts, on-chain indicators, risk metrics, altcoin data, and US macro overlays, so you can understand market cycles without juggling a dozen different tools.',
          'Compare cycle positioning, track fear and greed, monitor dominance and total market cap, and overlay Federal Reserve data on crypto charts. Built for holders, traders, and researchers who want data-driven context.',
        ],
      },
      {
        h2: 'How Cryptological compares to other crypto data tools',
        paragraphs: [
          'Looking for a Look Into The Cryptoverse alternative, Glassnode-style on-chain depth, or Bitbo-style cycle charts? Cryptological combines charting, risk modelling, and macro context in a single subscription platform with a generous free tier.',
          'Unlike single-purpose sites, you get a customizable dashboard, 80+ chart templates, a workbench for custom series, and premium indicators including MVRV Z-Score, Puell Multiple, and market heat index.',
        ],
      },
    ],
    links: [
      { href: '/bitcoin-analytics', label: 'Bitcoin analytics overview' },
      { href: '/on-chain-metrics', label: 'On-chain metrics guide' },
      { href: '/crypto-charts-tools', label: 'Crypto charting tools' },
      { href: '/chart-gallery', label: 'Browse all charts' },
      { href: '/bitcoin-whitepaper', label: 'Why Bitcoin? Plain-English guide' },
      { href: '/100-day-window', label: 'The 100-Day Window explained' },
      { href: '/login-signup?mode=signup', label: 'Sign up free' },
    ],
  },
  'bitcoin-analytics': {
    path: '/bitcoin-analytics',
    title: 'Bitcoin Analytics Platform, Charts, Risk & On-Chain Data',
    description:
      'Explore Bitcoin analytics with logarithmic regression, MVRV, Puell Multiple, fear & greed, dominance, and cycle comparison tools. Cryptological, professional BTC data for investors.',
    keywords:
      'bitcoin analytics, btc charts, bitcoin risk metric, mvrv z-score, puell multiple, bitcoin cycle analysis, crypto analytics platform',
    h1: 'Bitcoin Analytics, Charts, Risk Metrics & Market Cycles',
    sections: [
      {
        h2: 'Everything you need to analyse Bitcoin',
        paragraphs: [
          'Cryptological provides institutional-grade Bitcoin analytics accessible to individual investors. Track price against logarithmic regression bands, measure holder risk with proprietary risk metrics, and compare the current cycle to 2013, 2017, and 2021.',
          'Premium members unlock MVRV Z-Score, Puell Multiple, transaction MVRV, historical volatility, tail curvature quantiles, and the Market Heat Index, a composite view of market conditions.',
        ],
      },
      {
        h2: 'Bitcoin charts available on Cryptological',
        paragraphs: [
          'Free tier includes total crypto market cap, Bitcoin dominance, fear & greed index, US inflation, interest rates, initial claims, logarithmic regression, and time-in-risk-bands analysis.',
          'Paid plans add Bitcoin bubble indicator (20-week extension), Pi Cycle top, monthly returns tables, running ROI, on-chain historical risk, and dynamic DCA simulation backtests.',
        ],
      },
      {
        h2: 'Why traders choose Cryptological over standalone chart sites',
        paragraphs: [
          'Sites like LookIntoBitcoin and Bitbo excel at individual indicators. Cryptological unifies those workflows: favourite charts on your dashboard, consistent dark-theme UI, and macro overlays on any series.',
          'Sign up free, no card required, and start with the charts that matter most to your strategy.',
        ],
      },
    ],
    links: [
      { href: '/on-chain-metrics', label: 'On-chain metrics' },
      { href: '/chart-gallery', label: 'Full chart gallery' },
      { href: '/', label: 'Home' },
      { href: '/login-signup?mode=signup', label: 'Create free account' },
    ],
  },
  'on-chain-metrics': {
    path: '/on-chain-metrics',
    title: 'Bitcoin On-Chain Metrics, MVRV, Puell, Tx Data & More',
    description:
      'Monitor Bitcoin on-chain metrics: MVRV Z-Score, Puell Multiple, transaction counts, fees, and composite risk indicators. Real-time crypto on-chain analytics on Cryptological.',
    keywords:
      'bitcoin on-chain metrics, on-chain analytics, mvrv, puell multiple, bitcoin network data, glassnode alternative, crypto on-chain dashboard',
    h1: 'Bitcoin On-Chain Metrics & Network Analytics',
    sections: [
      {
        h2: 'On-chain data for smarter Bitcoin decisions',
        paragraphs: [
          'On-chain metrics reveal what is happening beneath the price chart, miner revenue, holder behaviour, network activity, and valuation extremes. Cryptological aggregates key Bitcoin network indicators updated daily from trusted sources.',
          'Use MVRV Z-Score to spot overheated markets, Puell Multiple for miner profitability cycles, and transaction-based indicators to gauge network usage and potential cycle turns.',
        ],
      },
      {
        h2: 'On-chain charts on Cryptological',
        paragraphs: [
          'Puell Multiple, Bitcoin Transaction MVRV, transaction fee analysis, on-chain historical risk, Bitcoin address activity proxies, and the Tx Macro combined view.',
          'Combine on-chain series with price, dominance, or S&P 500 overlays in the Workbench, a premium feature for custom multi-series analysis.',
        ],
      },
      {
        h2: 'A practical alternative to expensive on-chain terminals',
        paragraphs: [
          'Enterprise on-chain platforms can cost hundreds per month. Cryptological delivers curated on-chain charts alongside price, macro, and risk tools at a fraction of the cost, with a free tier to get started.',
        ],
      },
    ],
    links: [
      { href: '/bitcoin-analytics', label: 'Bitcoin analytics' },
      { href: '/crypto-charts-tools', label: 'All charting tools' },
      { href: '/chart-gallery', label: 'Chart gallery' },
      { href: '/login-signup?mode=signup', label: 'Sign up free' },
    ],
  },
  'crypto-charts-tools': {
    path: '/crypto-charts-tools',
    title: 'Crypto Charting Tools, Altcoins, Macro, Risk & Indicators',
    description:
      '80+ crypto charts: Bitcoin, Ethereum, altcoins, FRED macro series, fear & greed, dominance, total market cap, and custom workbench. Cryptological crypto charting for serious investors.',
    keywords:
      'crypto charts, cryptocurrency charting tools, altcoin charts, bitcoin macro overlay, crypto indicators, tradingview alternative crypto, crypto data platform',
    h1: 'Crypto Charting Tools, 80+ Indicators & Macro Overlays',
    sections: [
      {
        h2: 'More than a Bitcoin chart website',
        paragraphs: [
          'Cryptological covers the full crypto market: Bitcoin and Ethereum price with technical indicators, altcoin season index, total / total2 / total3 market cap, sector-style stock overlays (MSTR, COIN, miners), and 30+ US macro FRED series.',
          'Each chart supports logarithmic and linear scales, moving averages, RSI, and optional asset overlays, designed for cycle analysis, not just day-trading.',
        ],
      },
      {
        h2: 'Macro + crypto in one view',
        paragraphs: [
          'Overlay unemployment, CPI, Fed funds rate, 10-year yield, VIX, or recession shading on Bitcoin charts. Understand how traditional finance and crypto interact, a differentiator versus pure on-chain or pure price tools.',
        ],
      },
      {
        h2: 'Built for investors comparing LookIntoBitcoin, Glassnode & Bitbo',
        paragraphs: [
          'If you use multiple free chart sites today, Cryptological replaces the tab sprawl with one authenticated dashboard, favourites, and consistent methodology across risk and on-chain models.',
          'Preview the full chart library on our public gallery, then create a free account to open interactive charts.',
        ],
      },
    ],
    links: [
      { href: '/chart-gallery', label: 'Preview chart gallery' },
      { href: '/bitcoin-analytics', label: 'Bitcoin analytics' },
      { href: '/on-chain-metrics', label: 'On-chain metrics' },
      { href: '/login-signup?mode=signup', label: 'Get started free' },
    ],
  },
  '100-day-window': {
    path: '/100-day-window',
    title: 'The 100-Day Window, Bitcoin Cycle Bottom Countdown Explained',
    description:
      'What does "days left til cycle bottom" mean? Learn how Cryptological tracks the post-peak window using historical Bitcoin bear-market averages, free public guide, no account required.',
    keywords:
      'bitcoin cycle bottom, 100 day window, bitcoin bear market, market cycles, cycle countdown, cryptological',
    h1: 'The 100-Day Window',
    sections: [
      {
        h2: 'Bitcoin cycle countdown, explained plainly',
        paragraphs: [
          'After each major bull-market top, Bitcoin has historically spent roughly a year in drawdown before the next cycle low. Cryptological tracks days remaining against that average, measured from the October 2025 peak.',
          'This is a historical compass, not a price prediction. Past cycles varied in length; the counter helps patient holders prepare during the quietest phases.',
        ],
      },
      {
        h2: 'How the countdown is calculated',
        paragraphs: [
          'Three methods cluster around late October 2026: all three top→bottom phases average 382 days (~23 Oct), bottom-to-bottom spacing averages 1435 days (~26 Oct), and the last two bears average 370 days (~11 Oct). Cryptological uses the 370-day line deliberately, to bias preparation ahead of the window. Days left equals 370 minus days elapsed since the 6 October 2025 peak.',
        ],
      },
      {
        h2: 'Newsletter #1 and the October 2025 moment',
        paragraphs: [
          'Cryptological Newsletter #1 (29 August 2025) included a Market Overview screenshot where cycle-length indicators, based on historical averages, were already clustering around October 2025. A short YouTube walkthrough from 9 October 2025 explains when an indicator briefly read 0 days left til cycle bottom, days after the 6 October top. Educational context only, not financial advice.',
          'A free weekend with full chart access is planned so visitors can explore the same cycle tools during the current post-peak window. Past cycles varied; historical patterns do not predict future prices.',
        ],
      },
    ],
    links: [
      { href: '/', label: 'Cryptological home' },
      { href: '/bitcoin-whitepaper', label: 'Why Bitcoin?' },
      { href: '/chart-gallery', label: 'Explore charts' },
      { href: '/login-signup?mode=signup', label: 'Sign up free' },
    ],
  },
  'bitcoin-whitepaper': {
    path: '/bitcoin-whitepaper',
    title: 'Why Bitcoin?, The Whitepaper Explained in Plain English',
    description:
      'Understand why Bitcoin exists: Satoshi Nakamoto\'s whitepaper explained for beginners. Peer-to-peer electronic cash, proof-of-work, and why it matters, free guide from Cryptological.',
    keywords:
      'why bitcoin, bitcoin whitepaper explained, satoshi nakamoto, peer to peer electronic cash, learn bitcoin',
    h1: 'Why Bitcoin Exists, The Whitepaper in Plain English',
    sections: [
      {
        h2: 'Free public guide, no account required',
        paragraphs: [
          'In October 2008, Satoshi Nakamoto published a nine-page paper describing electronic cash that does not require trusting a financial institution. This guide explains that vision for anyone curious about money, power, and cryptographic networks.',
        ],
      },
    ],
    links: [
      { href: '/', label: 'Cryptological home' },
      { href: '/bitcoin-analytics', label: 'Bitcoin analytics tools' },
      { href: '/chart-gallery', label: 'Explore charts' },
    ],
  },
  'chart-gallery': {
    path: '/chart-gallery',
    title: 'Crypto Chart Gallery, Preview 80+ Bitcoin & Macro Charts',
    description:
      'Browse Cryptological\'s full chart library: Bitcoin price, risk metrics, on-chain indicators, altcoins, stocks, and US macro data. Preview free, sign up to access interactive charts.',
    keywords:
      'crypto chart gallery, bitcoin charts list, cryptocurrency indicators, free crypto charts preview',
    h1: 'Explore the Cryptological Chart Gallery',
    sections: [
      {
        h2: 'Preview every chart before you sign up',
        paragraphs: [
          'See thumbnails of all free and premium charts on Cryptological, from Bitcoin logarithmic regression and fear & greed to FRED macro series and the Market Heat Index.',
          'Create a free account to open interactive charts, build a custom dashboard, and favourite the metrics you check every morning.',
        ],
      },
    ],
    links: [
      { href: '/login-signup?mode=signup', label: 'Sign up free' },
      { href: '/bitcoin-analytics', label: 'Bitcoin analytics' },
      { href: '/', label: 'Home' },
    ],
  },
};

export const PRERENDER_PATHS = [
  ...new Set(Object.values(SEO_PAGES).map((p) => p.path)),
];