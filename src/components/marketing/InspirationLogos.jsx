import React from 'react';
import { Box, Container, Grid, Typography } from '@mui/material';

const INSPIRATION_BRANDS = [
  { name: 'Into The Cryptoverse', logo: '/assets/inspiration-logos/intothecryptoverse.png' },
  { name: 'Bitcoin Magazine Pro', logo: '/assets/inspiration-logos/bitcoinmagazinepro.png' },
  { name: 'Coin Bureau', logo: '/assets/inspiration-logos/coin-bureau.png' },
  { name: 'CoinGecko', logo: '/assets/inspiration-logos/coingecko.png' },
  { name: 'Cointelegraph', logo: '/assets/inspiration-logos/cointelegraph.png' },
  { name: 'Coin Metrics', logo: '/assets/inspiration-logos/coinmetrics-io.png' },
  { name: 'CoinMarketCap', logo: '/assets/inspiration-logos/coinmarketcap.png' },
];

const InspirationLogos = ({ colors }) => (
  <Container maxWidth="lg" sx={{ py: 10, textAlign: 'center' }}>
    <Typography
      variant="h2"
      sx={{
        color: colors.grey[100],
        fontWeight: 'bold',
        mb: 2,
        fontSize: { xs: '2rem', md: '2.5rem' },
      }}
    >
      Built for workflows you already know
    </Typography>
    <Typography
      variant="body1"
      sx={{ color: colors.grey[400], maxWidth: 720, mx: 'auto', mb: 5, lineHeight: 1.7 }}
    >
      Cryptological unifies the kind of cycle charts, on-chain context, and market dashboards serious
      holders follow across the ecosystem — in one place, with a generous free tier.
    </Typography>
    <Grid container spacing={3} justifyContent="center" alignItems="center">
      {INSPIRATION_BRANDS.map((brand) => (
        <Grid item xs={4} sm={3} md={2} key={brand.name}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              opacity: 0.85,
            }}
          >
            <Box
              component="img"
              src={brand.logo}
              alt=""
              sx={{
                height: 40,
                width: 40,
                objectFit: 'contain',
                filter: 'grayscale(30%)',
              }}
            />
            <Typography
              variant="caption"
              sx={{ color: colors.grey[500], fontSize: '0.65rem', lineHeight: 1.2 }}
            >
              {brand.name}
            </Typography>
          </Box>
        </Grid>
      ))}
    </Grid>
    <Typography variant="caption" sx={{ color: colors.grey[600], mt: 4, display: 'block' }}>
      Independent product — not affiliated with or endorsed by the brands above.
    </Typography>
  </Container>
);

export default InspirationLogos;