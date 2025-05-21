import React, { useEffect, useState, useContext, useMemo } from 'react';
import GaugeChart from 'react-gauge-chart';
import { tokens } from '../theme';
import { useTheme } from '@mui/material';
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';

function CryptoFearAndGreedIndex({ isDashboard }) {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const isMobile = useIsMobile();
    const { fetchLatestFearAndGreed, latestFearAndGreed, isLatestFearAndGreedFetched, latestFearAndGreedLastUpdated } = useContext(DataContext);
    const [isLoading, setIsLoading] = useState(!isLatestFearAndGreedFetched);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            if (isLatestFearAndGreedFetched || latestFearAndGreed) {
                console.log('Latest Fear and Greed data already fetched or available, skipping fetch');
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);
            try {
                await fetchLatestFearAndGreed();
            } catch (err) {
                if (isMounted) {
                    setError('Failed to fetch Fear and Greed data. Please try again later.');
                    console.error('Error fetching Fear and Greed data:', err);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            isMounted = false;
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
        maxWidth: isMobile ? (isDashboard ? '550px' : '650px') : (isDashboard ? '720px' : '1250px'),
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

            {!isDashboard && latestFearAndGreed && (
                <div style={{ marginTop: '10px' }}>
                    <span style={{ color: colors.grey[100] }}>
                        Last Updated: {latestFearAndGreedLastUpdated}
                    </span>
                </div>
            )}

            {!isDashboard && (
                <p className="chart-info" style={{ marginTop: '20px', textAlign: 'left', width: '100%' }}>
                    The Fear and Greed index is a metric that measures the sentiment of the market by analyzing various sources of data, including surveys, social media, volatility, market momentum, and volume among others.
                    <br />
                    The information has been provided here:{' '}
                    <a href="https://alternative.me/crypto/fear-and-greed-index/">
                        https://alternative.me/crypto/fear-and-greed-index/
                    </a>
                </p>
            )}
        </div>
    );
}

export default CryptoFearAndGreedIndex;