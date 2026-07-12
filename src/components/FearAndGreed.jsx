import React, { useEffect, useState, useMemo } from 'react';
import GaugeChart from 'react-gauge-chart';
import { tokens } from '../theme';
import { useTheme } from '@mui/material';
import useIsMobile from '../hooks/useIsMobile';
import LastUpdated from '../hooks/LastUpdated';
import BitcoinFees from './BitcoinTransactionFees';
import ChartInfoSections from './ChartInfoSections';
import { useChartData, useChartDataActions } from '../hooks/useChartData';

function CryptoFearAndGreedIndex({ isDashboard }) {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const isMobile = useIsMobile();
    const { latestFearAndGreed, isLatestFearAndGreedFetched, latestFearAndGreedLastUpdated } = useChartData();
    const { fetchLatestFearAndGreed } = useChartDataActions();
    const [isLoading, setIsLoading] = useState(!isLatestFearAndGreedFetched);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            // Always attempt fetch (or cache-hit) for latest; removed stale guard so widget gets current value
            // after daily F&G update. fetchWithCache handles 1h freshness.
            setIsLoading(true);
            setError(null);
            try {
                await fetchLatestFearAndGreed();
            } catch (err) {
                if (isMounted) {
                    setError('Failed to fetch Fear and Greed data. Please try again later.');
                    // console.error('Error fetching Fear and Greed data:', err);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchData();

        // Periodic refresh so widget doesn't stay on old calculated value after daily update
        const interval = setInterval(() => {
            if (isMounted) fetchLatestFearAndGreed();
        }, 15 * 60 * 1000); // every 15 min

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [fetchLatestFearAndGreed, isLatestFearAndGreedFetched]);

    const value = useMemo(
        () => (latestFearAndGreed ? latestFearAndGreed.value / 100 : 0),
        [latestFearAndGreed]
    );

    const value_classification = useMemo(
        () => (latestFearAndGreed ? latestFearAndGreed.value_classification : ''),
        [latestFearAndGreed]
    );

    const gaugeColors = [
        '#4BC0C8', '#33D1FF', '#66A3FF', '#9996FF', '#CC89FF',
        '#FF7DFF', '#FF61C3', '#FF4590', '#FF295D', '#FF0033', '#FF0033',
    ];

    const getColorByPercent = (percent) => {
        const index = Math.min(Math.floor(percent * gaugeColors.length), gaugeColors.length - 1);
        return gaugeColors[index];
    };

    const textColor = useMemo(() => getColorByPercent(value - 0.05), [value]);

    const gaugeChartStyle = {
        width: isDashboard ? '70%' : '90%',
        maxWidth: isMobile ? (isDashboard ? '550px' : '650px') : (isDashboard ? '720px' : '1050px'),
        minWidth: isMobile ? '300px' : '550px',
    };

    const headerStyle = {
        marginTop: '-15px',
        color: textColor,
        fontSize: isMobile ? '1.5rem' : isDashboard ? '1.5rem' : '2.5rem',
    };

    const MemoizedGaugeChart = React.memo(GaugeChart);

    return (
        <div style={{ height: '100%' }}>
            {!isDashboard && (
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0px',
                        height: '30px',
                    }}
                >
                    <div>
                        {isLoading && <span style={{ color: colors.grey[100] }}>Loading...</span>}
                        {error && <span style={{ color: colors.redAccent[500] }}>{error}</span>}
                    </div>
                </div>
            )}

            <div
                className="chart-container"
                style={{
                    position: 'relative',
                    height: isDashboard ? '100%' : 'calc(100% - 40px)',
                    width: '100%',
                    border: '2px solid #a9a9a9',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: '20px' }}>
                    <div style={gaugeChartStyle}>
                        <MemoizedGaugeChart
                            id="gauge-chart3"
                            nrOfLevels={5}
                            colors={["#4BC0C8", "#FF0033"]}
                            arcWidth={0.3}
                            percent={value}
                            needleColor="#4BC0C8"
                            needleBaseColor="#4BC0C8"
                            textColor={textColor}
                        />
                    </div>
                </div>
                <h1 style={headerStyle}>{value_classification}</h1>
            </div>

            <div className="under-chart">
        {!isDashboard && latestFearAndGreed && (
          <LastUpdated customDate={latestFearAndGreed.time} />
        )}
        
        {!isDashboard && <BitcoinFees />}
      </div>

            {!isDashboard && (
                <ChartInfoSections
                    sx={{ marginTop: '20px', textAlign: 'left', width: '100%' }}
                    sections={[
                        {
                            title: 'What it is',
                            content:
                                'The Fear and Greed index measures crypto market sentiment by analyzing surveys, social media, volatility, market momentum, volume, and other data sources.',
                        },
                        {
                            title: 'How to interpret',
                            content: (
                                <>
                                    Source:{' '}
                                    <a href="https://alternative.me/crypto/fear-and-greed-index/">
                                        https://alternative.me/crypto/fear-and-greed-index/
                                    </a>
                                </>
                            ),
                        },
                    ]}
                />
            )}
        </div>
    );
}

export default CryptoFearAndGreedIndex;