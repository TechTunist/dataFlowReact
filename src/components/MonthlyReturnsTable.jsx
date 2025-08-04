// src/components/BitcoinMonthlyReturnsTable.js
import React, { useContext, useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme, Box } from "@mui/material";
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

  // Fetch data on mount, even if btcData exists, to ensure freshness
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await fetchBtcData(); // Always fetch to ensure latest data
      } catch (err) {
        setError('Error fetching data. Please try again later.');
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fetchBtcData]); // Removed btcData.length dependency to force refresh

  // Process data to calculate monthly returns
  const monthlyReturnsData = useMemo(() => {
    console.log('btcData:', btcData); // Debug: Log raw btcData
    if (btcData.length === 0) {
      return {
        years: [],
        months: [],
        returns: [],
        colors: [],
        monthColumns: [],
        monthColors: [],
      };
    }

    const dataByYearMonth = btcData.reduce((acc, item) => {
      const date = new Date(item.time);
      if (isNaN(date.getTime())) {
        console.error('Invalid date in btcData:', item.time);
        return acc;
      }
      const year = date.getFullYear();
      const month = date.getMonth();
      if (!acc[year]) acc[year] = {};
      if (!acc[year][month]) acc[year][month] = [];
      acc[year][month].push({ date, value: item.value });
      return acc;
    }, {});
    console.log('dataByYearMonth:', dataByYearMonth); // Debug: Log grouped data

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const years = [];
    for (let y = 2010; y <= currentYear; y++) {
      years.push(y.toString());
    }
    years.sort((a, b) => b - a);

    const months = isMobile
      ? ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const returns = [];
    const cellColors = [];

    years.forEach(year => {
      const yearReturns = [];
      const yearColors = [];
      for (let month = 0; month < 12; month++) {
        // Skip pre-Bitcoin months (before August 2010)
        if (parseInt(year) === 2010 && month < 7) {
          yearReturns.push(null);
          yearColors.push(colors.primary[700]);
          continue;
        }
        // Skip future months beyond current
        if (parseInt(year) === currentYear && month > currentMonth) {
          yearReturns.push(null);
          yearColors.push(colors.primary[700]);
          continue;
        }

        const monthData = dataByYearMonth[year] && dataByYearMonth[year][month];
        if (!monthData || monthData.length === 0) {
          console.warn(`No data for ${year}-${month + 1}`); // Debug: Log missing months
          yearReturns.push(null);
          yearColors.push(colors.primary[700]);
          continue;
        }

        monthData.sort((a, b) => a.date - b.date);
        const firstDay = monthData[0];
        const lastDay = monthData[monthData.length - 1];
        const firstPrice = firstDay.value;
        const lastPrice = lastDay.value;
        const monthlyReturn = firstPrice !== 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
        const displayValue =
          parseInt(year) === currentYear && month === currentMonth
            ? `${monthlyReturn.toFixed(1)}*`
            : monthlyReturn.toFixed(1);
        yearReturns.push(displayValue);
        yearColors.push(
          monthlyReturn > 0
            ? '#28822d'
            : monthlyReturn < 0
            ? '#9c4f4f'
            : colors.primary[700]
        );
      }
      returns.push(yearReturns);
      cellColors.push(yearColors);
    });

    const monthColumns = months.map((_, monthIndex) =>
      returns.map(row => {
        const val = row[monthIndex];
        return val !== null ? (val.includes('*') ? val.replace('*', '%*') : `${val}%`) : '';
      })
    );
    const monthColors = months.map((_, monthIndex) =>
      cellColors.map(row => row[monthIndex])
    );

    return {
      years,
      months,
      returns,
      colors: cellColors,
      monthColumns,
      monthColors,
    };
  }, [btcData, colors]);

  const { years, months, monthColumns, monthColors } = monthlyReturnsData;

  // Plotly table data
  const tableData = [
    {
      type: 'table',
      header: {
        values: [''],
        align: 'center',
        line: { width: 0 },
        fill: { color: colors.primary[700] },
        font: { color: colors.primary[100], size: 16 },
        height: 40,
      },
      cells: {
        values: [years],
        align: 'center',
        line: { width: 0 },
        fill: { color: colors.primary[700] },
        font: { color: colors.primary[100], size: isMobile ? 8 : 12 },
        height: 30,
      },
      domain: { x: [0, 0.05], y: [0, 1] },
    },
    {
      type: 'table',
      header: {
        values: months,
        align: 'center',
        line: { width: 0 },
        fill: { color: colors.primary[700] },
        font: { color: colors.primary[100], size: 14 },
        height: 40,
      },
      cells: {
        values: monthColumns,
        align: 'center',
        line: { width: 1, color: colors.grey[300] },
        fill: { color: monthColors },
        font: { color: colors.primary[100], size: isMobile ? 10 : 13 },
        height: 30,
      },
      domain: { x: [0.05, 1], y: [0, 1] },
    },
  ];

  const layout = {
    title: isDashboard ? '' : {
      font: { color: colors.primary[700], size: 18 },
      x: 0.5,
      xanchor: 'center',
      y: 0.95,
      yanchor: 'top',
    },
    margin: { l: 10, r: 20, b: 10, t: isDashboard ? 10 : 50 },
    plot_bgcolor: colors.primary[700],
    paper_bgcolor: colors.primary[700],
    font: { color: colors.primary[100] },
    autosize: true,
  };

  return (
    <div style={{ height: '100%' }}>
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
      <div
        className="chart-container"
        style={{
          height: isDashboard ? '100%' : 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
          minHeight: '600px',
        }}
      >
        <Plot
          data={tableData}
          layout={layout}
          config={{
            staticPlot: isDashboard,
            displayModeBar: false,
            responsive: true,
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
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