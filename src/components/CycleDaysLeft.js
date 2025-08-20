import React, { useMemo } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { tokens } from '../theme';
import { useData } from '../DataContext';

const CycleDaysLeft = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { btcData } = useData();

  // Define cycle dates
  const cycleDates = useMemo(() => ({
    bottom: {
      'Cycle 2': { start: '2015-01-15', end: '2017-12-17' },
      'Cycle 3': { start: '2018-12-15', end: '2021-11-08' },
      'Cycle 4': { start: '2022-11-21', end: null },
    },
    halving: {
      'Cycle 2': { start: '2016-07-09', end: '2017-12-17' },
      'Cycle 3': { start: '2020-05-11', end: '2021-11-08' },
      'Cycle 4': { start: '2024-04-19', end: null },
    },
    peak: {
      'Cycle 1': { start: '2013-11-30', end: '2017-12-17' },
      'Cycle 2': { start: '2017-12-17', end: '2021-11-10' },
      'Cycle 3': { start: '2021-11-10', end: null },
    },
  }), []);

  // Calculate days between two dates
  const calculateDays = (start, end) => {
    if (!start || !end) return null;
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
  };

  // Calculate average cycle lengths
  const averageCycleLengths = useMemo(() => {
    const averages = {
      bottom: 0,
      halving: 0,
      peak: 0,
    };

    // From Cycle Low (Cycle 2 and 3)
    const bottomDays = [
      calculateDays(cycleDates.bottom['Cycle 2'].start, cycleDates.bottom['Cycle 2'].end),
      calculateDays(cycleDates.bottom['Cycle 3'].start, cycleDates.bottom['Cycle 3'].end),
    ].filter(days => days !== null);
    averages.bottom = bottomDays.length > 0 ? Math.round(bottomDays.reduce((sum, days) => sum + days, 0) / bottomDays.length) : 0;

    // From Halving (Cycle 2 and 3)
    const halvingDays = [
      calculateDays(cycleDates.halving['Cycle 2'].start, cycleDates.halving['Cycle 2'].end),
      calculateDays(cycleDates.halving['Cycle 3'].start, cycleDates.halving['Cycle 3'].end),
    ].filter(days => days !== null);
    averages.halving = halvingDays.length > 0 ? Math.round(halvingDays.reduce((sum, days) => sum + days, 0) / halvingDays.length) : 0;

    // From Cycle Peak (Cycle 1 and 2)
    const peakDays = [
      calculateDays(cycleDates.peak['Cycle 1'].start, cycleDates.peak['Cycle 1'].end),
      calculateDays(cycleDates.peak['Cycle 2'].start, cycleDates.peak['Cycle 2'].end),
    ].filter(days => days !== null);
    averages.peak = peakDays.length > 0 ? Math.round(peakDays.reduce((sum, days) => sum + days, 0) / peakDays.length) : 0;

    return averages;
  }, [cycleDates]);

  // Calculate days elapsed and days left for current cycle
  const daysLeftData = useMemo(() => {
    const currentDate = btcData.length > 0 ? new Date(btcData[btcData.length - 1].time) : new Date();
    const data = {
      bottom: { elapsed: 0, left: 0 },
      halving: { elapsed: 0, left: 0 },
      peak: { elapsed: 0, left: 0 },
    };

    // From Cycle Low (Cycle 4)
    data.bottom.elapsed = calculateDays(cycleDates.bottom['Cycle 4'].start, currentDate.toISOString().split('T')[0]) || 0;
    data.bottom.left = Math.max(0, averageCycleLengths.bottom - data.bottom.elapsed);

    // From Halving (Cycle 4)
    data.halving.elapsed = calculateDays(cycleDates.halving['Cycle 4'].start, currentDate.toISOString().split('T')[0]) || 0;
    data.halving.left = Math.max(0, averageCycleLengths.halving - data.halving.elapsed);

    // From Cycle Peak (Cycle 3)
    data.peak.elapsed = calculateDays(cycleDates.peak['Cycle 3'].start, currentDate.toISOString().split('T')[0]) || 0;
    data.peak.left = Math.max(0, averageCycleLengths.peak - data.peak.elapsed);

    return data;
  }, [averageCycleLengths, btcData, cycleDates]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: '20px',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '10px',
        marginTop: '10px',
      }}
    >
      <Box
        sx={{
          backgroundColor: colors.primary[500],
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center',
          minWidth: '150px',
          border: `1px solid ${colors.grey[300]}`,
        }}
      >
        <Typography variant="h6" color={colors.grey[100]}>
          Days Left (From Low)
        </Typography>
        <Typography variant="h4" color={colors.greenAccent[500]}>
          {daysLeftData.bottom.left}
        </Typography>
        <Typography variant="body2" color={colors.grey[300]}>
          Avg: {averageCycleLengths.bottom} days
        </Typography>
      </Box>
      <Box
        sx={{
          backgroundColor: colors.primary[500],
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center',
          minWidth: '150px',
          border: `1px solid ${colors.grey[300]}`,
        }}
      >
        <Typography variant="h6" color={colors.grey[100]}>
          Days Left (From Halving)
        </Typography>
        <Typography variant="h4" color={colors.greenAccent[500]}>
          {daysLeftData.halving.left}
        </Typography>
        <Typography variant="body2" color={colors.grey[300]}>
          Avg: {averageCycleLengths.halving} days
        </Typography>
      </Box>
      <Box
        sx={{
          backgroundColor: colors.primary[500],
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center',
          minWidth: '150px',
          border: `1px solid ${colors.grey[300]}`,
        }}
      >
        <Typography variant="h6" color={colors.grey[100]}>
          Days Left (From Peak)
        </Typography>
        <Typography variant="h4" color={colors.greenAccent[500]}>
          {daysLeftData.peak.left}
        </Typography>
        <Typography variant="body2" color={colors.grey[300]}>
          Avg: {averageCycleLengths.peak} days
        </Typography>
      </Box>
    </Box>
  );
};

export default CycleDaysLeft;