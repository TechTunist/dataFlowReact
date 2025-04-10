import React, { useEffect, useState, useContext, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import '../styling/bitcoinChart.css';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';
import { Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const BitcoinRiskBandDuration = ({ isDashboard = false, riskData: propRiskData }) => {
  const theme = useTheme();
  const colors = useMemo(() => tokens(theme.palette.mode), [theme.palette.mode]);
  const isMobile = useIsMobile();
  const { btcData, fetchBtcData } = useContext(DataContext);

  const [riskBandDurations, setRiskBandDurations] = useState([]);
  const [currentRiskLevel, setCurrentRiskLevel] = useState(null);
  const [riskBandMode, setRiskBandMode] = useState('0.1'); // Default to 0.1 increments

  const calculateRiskMetric = (data) => {
    const movingAverage = data.map((item, index) => {
      const start = Math.max(index - 373, 0);
      const subset = data.slice(start, index + 1);
      const avg = subset.reduce((sum, curr) => sum + parseFloat(curr.value), 0) / subset.length;
      return { ...item, MA: avg };
    });

    const movingAverageWithPreavg = movingAverage.map((item, index) => {
      const preavg = index > 0 ? (Math.log(item.value) - Math.log(item.MA)) * Math.pow(index, 0.395) : 0;
      return { ...item, Preavg: preavg };
    });

    const preavgValues = movingAverageWithPreavg.map(item => item.Preavg);
    const preavgMin = Math.min(...preavgValues);
    const preavgMax = Math.max(...preavgValues);

    const normalizedRisk = movingAverageWithPreavg.map(item => ({
      ...item,
      Risk: (item.Preavg - preavgMin) / (preavgMax - preavgMin),
    }));

    return normalizedRisk;
  };

  const chartData = useMemo(() => {
    const formattedData = btcData.map(item => ({
      time: new Date(item.time),
      value: parseFloat(item.value),
    }));
    return propRiskData || (formattedData.length > 0 ? calculateRiskMetric(formattedData) : []);
  }, [propRiskData, btcData]);

  const [layout, setLayout] = useState({
    title: isDashboard ? '' : 'Bitcoin Price Risk Band Durations',
    autosize: true,
    margin: { l: 50, r: 50, b: 50, t: 50, pad: 4 },
    plot_bgcolor: colors.primary[700],
    paper_bgcolor: colors.primary[700],
    font: { color: colors.primary[100] },
    xaxis: { title: isDashboard || isMobile ? '' : 'Risk Bands', autorange: true },
    yaxis: { title: 'Percentage of Time (%)', autorange: true },
    showlegend: false,
  });

  const calculateRiskBandDurations = (data, bandSize) => {
    const numBands = Math.ceil(1.0 / bandSize);
    const bandCounts = Array(numBands).fill(0);

    for (let i = 0; i < data.length; i++) {
      const risk = data[i].Risk;
      const bandIndex = Math.min(Math.floor(risk / bandSize), numBands - 1);
      bandCounts[bandIndex]++;
    }

    const totalDays = bandCounts.reduce((sum, count) => sum + count, 0);
    return bandCounts.map((count, index) => {
      const bandStart = (index * bandSize).toFixed(2);
      const bandEnd = Math.min((index + 1) * bandSize, 1.0).toFixed(2);
      return {
        band: `${bandStart} - ${bandEnd}`,
        percentage: (count / totalDays * 100).toFixed(2),
        days: count,
      };
    });
  };

  useEffect(() => {
    fetchBtcData();
  }, [fetchBtcData]);

  useEffect(() => {
    if (chartData.length === 0) return;

    const bandSize = parseFloat(riskBandMode);
    const durations = calculateRiskBandDurations(chartData, bandSize);
    setRiskBandDurations(durations);
    setCurrentRiskLevel(chartData[chartData.length - 1].Risk.toFixed(2));
  }, [chartData, riskBandMode]);

  useEffect(() => {
    setLayout(prevLayout => ({
      ...prevLayout,
      title: isDashboard ? '' : 'Bitcoin Price Risk Band Durations',
      plot_bgcolor: colors.primary[700],
      paper_bgcolor: colors.primary[700],
      font: { color: colors.primary[100] },
      xaxis: { ...prevLayout.xaxis, title: isDashboard || isMobile ? '' : 'Risk Bands' },
    }));
  }, [colors, isDashboard, isMobile]);

  const resetChartView = () => {
    setLayout(prevLayout => ({
      ...prevLayout,
      xaxis: { ...prevLayout.xaxis, autorange: true },
      yaxis: { ...prevLayout.yaxis, autorange: true },
    }));
  };

  const handleRelayout = (event) => {
    if (event['xaxis.range[0]'] || event['yaxis.range[0]']) {
      setLayout(prevLayout => ({
        ...prevLayout,
        xaxis: {
          ...prevLayout.xaxis,
          range: [event['xaxis.range[0]'], event['xaxis.range[1]']],
          autorange: false,
        },
        yaxis: {
          ...prevLayout.yaxis,
          range: [event['yaxis.range[0]'], event['yaxis.range[1]']],
          autorange: false,
        },
      }));
    }
  };

  const handleRiskBandModeChange = (event) => {
    setRiskBandMode(event.target.value);
  };

  const getBandColor = (index, numBands) => {
    const midPoint = Math.floor(numBands / 2);
    const redShades = [colors.redAccent[800], colors.redAccent[700], colors.redAccent[500], colors.redAccent[300], colors.redAccent[100]];
    const blueShades = [colors.blueAccent[100], colors.blueAccent[300], colors.blueAccent[500], colors.blueAccent[700], colors.blueAccent[800]];
    const maxShades = Math.min(redShades.length, blueShades.length);

    if (index === midPoint && numBands % 2 === 1) {
      return colors.grey[100]; // Near-white for odd-numbered midpoint
    }

    if (index < midPoint) {
      // Red side
      const shadeIndex = Math.floor((index / midPoint) * maxShades);
      return redShades[Math.min(shadeIndex, redShades.length - 1)];
    } else {
      // Blue side
      const adjustedIndex = index - (numBands % 2 === 1 ? midPoint + 1 : midPoint);
      const shadeIndex = Math.floor((adjustedIndex / (numBands - midPoint)) * maxShades);
      return blueShades[Math.min(shadeIndex, blueShades.length - 1)];
    }
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      {!isDashboard && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '20px',
            marginTop: '20px',
          }}
        >
          <FormControl sx={{ minWidth: '200px' }}>
            <InputLabel
              id="risk-band-mode-label"
              shrink
              sx={{
                color: colors.grey[100],
                '&.Mui-focused': { color: colors.greenAccent[500] },
                top: 0,
                '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' },
              }}
            >
              Risk Band Size
            </InputLabel>
            <Select
              value={riskBandMode}
              onChange={handleRiskBandModeChange}
              labelId="risk-band-mode-label"
              label="Risk Band Size"
              sx={{
                color: colors.grey[100],
                backgroundColor: colors.primary[500],
                borderRadius: "8px",
                '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.grey[300] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.greenAccent[500] },
                '& .MuiSelect-select': { py: 1.5, pl: 2 },
              }}
            >
              <MenuItem value="0.05">0.05 (Half Bands)</MenuItem>
              <MenuItem value="0.1">0.1 (Single Bands)</MenuItem>
              <MenuItem value="0.2">0.2 (Double Bands)</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}

      {!isDashboard && (
        <div className='chart-top-div'>
          <div className="risk-filter">
            {/* Placeholder for future interactivity toggles */}
          </div>
          <div>
            {/* Placeholder for styling */}
          </div>
          <div>
            <button onClick={resetChartView} className="button-reset">
              Reset Chart
            </button>
          </div>
        </div>
      )}

      <div
        className="chart-container"
        style={{
          height: 'calc(100% - 40px)',
          width: '100%',
          border: '2px solid #a9a9a9',
        }}
      >
        <Plot
          data={[
            {
              type: 'bar',
              x: riskBandDurations.map(risk => risk.band),
              y: riskBandDurations.map(risk => parseFloat(risk.percentage)),
              hoverinfo: 'text+x',
              hovertemplate: 'Risk Band: %{x}<br>Time in: %{y}%<br>Total Days: %{customdata} days<extra></extra>',
              customdata: riskBandDurations.map(risk => risk.days),
              marker: {
                color: riskBandDurations.map((_, index) => 
                  getBandColor(index, riskBandDurations.length)
                ),
              },
            },
          ]}
          layout={layout}
          config={{
            displayModeBar: false,
            responsive: true,
          }}
          useResizeHandler={true}
          style={{ width: "100%", height: "100%" }}
          onRelayout={handleRelayout}
        />
      </div>

      {!isDashboard && (
        <div style={{ display: 'inline-block', marginTop: '10px', fontSize: '1.2rem' }}>
          Current Risk Level: <b>{currentRiskLevel !== null ? currentRiskLevel : 'Loading...'}</b>
        </div>
      )}

      <div className='under-chart'>
        {!isDashboard && <LastUpdated storageKey="btcData" />}
        {!isDashboard && <BitcoinFees />}
      </div>

      {!isDashboard && (
        <div>
          <p className='chart-info'>
            This chart shows the total amount of time Bitcoin has spent in each risk band over its entire existence, 
            adjustable by risk band size (0.05, 0.1, or 0.2 increments). This helps to understand the distribution 
            of time spent across different risk levels. The risk metric assesses Bitcoin's investment risk over time 
            by comparing its daily prices to a 374-day moving average, calculating the normalized logarithmic difference.
          </p>
        </div>
      )}
    </div>
  );
};

export default BitcoinRiskBandDuration;