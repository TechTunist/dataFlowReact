import React, { useContext, useEffect, useMemo, useState, useRef } from 'react';
import { tokens } from "../theme";
import { useTheme, Box, Table, TableBody, TableCell, TableContainer, TableFooter, TableHead, TableRow, Tooltip, Paper } from "@mui/material";
import '../styling/bitcoinChart.css';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import { DataContext } from '../DataContext';
import restrictToPaidSubscription from '../scenes/RestrictToPaid';

const BitcoinMonthlyReturnsTable = ({ isDashboard = false }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useIsMobile();
  const { btcData, fetchBtcData } = useContext(DataContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const tableRef = useRef(null);

  // Fetch data on mount to ensure freshness
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await fetchBtcData();
      } catch (err) {
        setError('Error fetching data. Please try again later.');
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fetchBtcData]);

  // Force re-render on isMobile change to ensure layout updates
  useEffect(() => {
    if (tableRef.current) {
      tableRef.current.style.width = '100%';
    }
  }, [isMobile]);

  // Process data to calculate monthly returns
  const monthlyReturnsData = useMemo(() => {
    if (btcData.length === 0) return { years: [], months: [], returns: [], averages: [] };

    const sortedBtcData = [...btcData].sort((a, b) => new Date(a.time) - new Date(b.time));
    const dataByYearMonth = sortedBtcData.reduce((acc, item) => {
      const date = new Date(item.time);
      const year = date.getFullYear();
      const month = date.getMonth();
      if (!acc[year]) acc[year] = {};
      if (!acc[year][month]) acc[year][month] = [];
      acc[year][month].push({ date, value: item.value });
      return acc;
    }, {});

    const getPreviousMonthClose = (year, month) => {
      let prevYear = year;
      let prevMonth = month - 1;
      if (prevMonth < 0) {
        prevMonth = 11;
        prevYear--;
      }
      const prevMonthData = dataByYearMonth[prevYear]?.[prevMonth];
      if (prevMonthData && prevMonthData.length > 0) {
        prevMonthData.sort((a, b) => a.date - b.date);
        return prevMonthData[prevMonthData.length - 1].value;
      }
      return null;
    };

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const years = [];
    for (let y = 2010; y <= currentYear; y++) years.push(y.toString());
    years.sort((a, b) => b - a);

    const months = isMobile
      ? ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const returns = [];
    years.forEach(year => {
      const yearReturns = [];
      for (let month = 0; month < 12; month++) {
        if (parseInt(year) === 2010 && month < 7) {
          yearReturns.push(null);
          continue;
        }
        if (parseInt(year) === currentYear && month > currentMonth) {
          yearReturns.push(null);
          continue;
        }
        const monthData = dataByYearMonth[year]?.[month];
        if (!monthData || monthData.length === 0) {
          yearReturns.push(null);
          continue;
        }
        monthData.sort((a, b) => a.date - b.date);
        const lastPrice = monthData[monthData.length - 1].value;
        let firstPrice = getPreviousMonthClose(parseInt(year), month);
        if (firstPrice === null) {
          firstPrice = monthData[0].value;
        }
        const monthlyReturn = firstPrice !== 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
        const displayValue =
          parseInt(year) === currentYear && month === currentMonth
            ? `${monthlyReturn.toFixed(1)}*`
            : monthlyReturn.toFixed(1);
        yearReturns.push(displayValue);
      }
      returns.push(yearReturns);
    });

    const averages = [];
    for (let month = 0; month < 12; month++) {
      let sum = 0;
      let count = 0;
      for (let y = 0; y < returns.length; y++) {
        const valStr = returns[y][month];
        if (valStr !== null) {
          const val = parseFloat(valStr.replace('*', ''));
          if (!isNaN(val)) {
            sum += val;
            count++;
          }
        }
      }
      averages.push(count > 0 ? (sum / count).toFixed(1) : null);
    }

    return { years, months, returns, averages };
  }, [btcData, isMobile]);

  const { years, months, returns, averages } = monthlyReturnsData;

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {!isDashboard && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '10px',
            marginTop: '50px',
          }}
        >
          {isLoading && <span style={{ color: colors.grey[100], marginBottom: '10px' }}>Loading...</span>}
          {error && <span style={{ color: colors.redAccent[500], marginBottom: '10px' }}>{error}</span>}
        </Box>
      )}
      <TableContainer
        component={Paper}
        ref={tableRef}
        sx={{
          maxHeight: isMobile ? 400 : 'none',
          overflow: 'auto',
          border: '2px solid #a9a9a9',
          minHeight: isDashboard ? '100%' : 600,
          width: '100%',
          '& .MuiTableCell-root': {
            padding: isMobile ? '4px' : '8px',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            textAlign: 'center',
            whiteSpace: 'nowrap',
          },
        }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ backgroundColor: colors.primary[700], color: colors.primary[100], minWidth: isMobile ? 60 : 80 }}>
                Year
              </TableCell>
              {months.map((month) => (
                <TableCell
                  key={month}
                  sx={{
                    backgroundColor: colors.primary[700],
                    color: colors.primary[100],
                    minWidth: isMobile ? 40 : 60,
                    width: `${100 / (months.length + 1)}%`,
                  }}
                >
                  {month}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {years.map((year, yIdx) => (
              <TableRow key={year}>
                <TableCell sx={{ backgroundColor: colors.primary[700], color: colors.primary[100] }}>{year}</TableCell>
                {months.map((month, mIdx) => {
                  const value = returns[yIdx][mIdx];
                  if (value === null) return <TableCell key={mIdx} />;
                  const num = parseFloat(value.replace('*', ''));
                  const bgColor = num > 0 ? '#28822d' : num < 0 ? '#9c4f4f' : colors.primary[700];
                  const tooltipTitle = `Return for ${months[mIdx]} ${year}: ${value}%${value.includes('*') ? ' (ongoing)' : ''}`;
                  return (
                    <Tooltip
                      key={mIdx}
                      title={tooltipTitle}
                      enterDelay={300}
                      PopperProps={{
                        sx: {
                          '& .MuiTooltip-tooltip': {
                            fontSize: '1rem',
                            padding: '8px 12px',
                          },
                        },
                      }}
                    >
                      <TableCell sx={{ backgroundColor: bgColor }}>
                        <span>{value}</span>
                      </TableCell>
                    </Tooltip>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            {/* Separator row */}
            <TableRow>
              <TableCell colSpan={months.length + 1} sx={{ height: '8px', backgroundColor: colors.primary[700], padding: 0 }} />
            </TableRow>
            {/* Average row */}
            <TableRow>
              <TableCell sx={{ backgroundColor: colors.primary[700], color: colors.primary[100] }}>Average</TableCell>
              {averages.map((avg, idx) => {
                if (avg === null) return <TableCell key={idx} />;
                const num = parseFloat(avg);
                const bgColor = num > 0 ? '#28822d' : num < 0 ? '#9c4f4f' : colors.primary[700];
                const tooltipTitle = `Average return for ${months[idx]}: ${avg}%`;
                return (
                  <Tooltip
                    key={idx}
                    title={tooltipTitle}
                    enterDelay={300}
                    PopperProps={{
                      sx: {
                        '& .MuiTooltip-tooltip': {
                          fontSize: '1rem',
                          padding: '8px 12px',
                        },
                      },
                    }}
                  >
                    <TableCell sx={{ backgroundColor: bgColor }}>
                      {`${avg}%`}
                    </TableCell>
                  </Tooltip>
                );
              })}
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
      <div className="under-chart">
        {!isDashboard && <LastUpdated storageKey="btcData" />}
        {!isDashboard && <BitcoinFees />}
      </div>
      {!isDashboard && (
        <p className="chart-info">
          This table displays Bitcoin's monthly returns as a percentage change from the first to the last day of each month. Positive returns are highlighted in green, negative returns in red. Returns for the current month (marked with an asterisk *) are not finalized as the month is ongoing. Data starts from August 2010, as Bitcoin price data begins on July 18, 2010.
        </p>
      )}
    </div>
  );
};

export default restrictToPaidSubscription(BitcoinMonthlyReturnsTable);