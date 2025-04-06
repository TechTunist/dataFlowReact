import React, { useEffect, useState, useContext } from 'react';
import GaugeChart from 'react-gauge-chart';
import { tokens } from "../theme";
import { useTheme } from "@mui/material";
import useIsMobile from '../hooks/useIsMobile';
import { DataContext } from '../DataContext';

function CryptoFearAndGreedIndex({ isDashboard }) {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const isMobile = useIsMobile();
    const { fetchFearAndGreedData, fearAndGreedData } = useContext(DataContext);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // First, let's add fearAndGreedData to the DataContext if it's not there already
    // Note: You'll need to add this to your DataContext.js file separately

    useEffect(() => {
        const fetchData = async () => {
            if (fearAndGreedData.length > 0) return; // Skip if data already exists
            
            setIsLoading(true);
            setError(null);
            try {
                await fetchFearAndGreedData();
            } catch (err) {
                setError('Failed to fetch Fear and Greed data. Please try again later.');
                console.error('Error fetching Fear and Greed data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [fetchFearAndGreedData, fearAndGreedData.length]);

    // Convert timestamp to date format
    const convertTimestampToDate = (timestamp) => {
        const date = new Date(timestamp * 1000);
        return date.toISOString().split('T')[0];
    };

    // Format the data from context
    const formattedData = fearAndGreedData.map(item => ({
        value: parseInt(item.value),
        value_classification: item.value_classification,
        time: convertTimestampToDate(item.timestamp)
    }));

    const value = formattedData.length ? formattedData[formattedData.length - 1].value / 100 : 0;
    const value_classification = formattedData.length ? formattedData[formattedData.length - 1].value_classification : '';

    const gaugeColors = ["#4BC0C8", "#33D1FF", "#66A3FF", "#9996FF", "#CC89FF", "#FF7DFF", "#FF61C3", "#FF4590", "#FF295D", "#FF0033", "#FF0033"];

    const getColorByPercent = (percent) => {
        const index = Math.min(Math.floor((percent) * gaugeColors.length), gaugeColors.length - 1);
        return gaugeColors[index];
    };

    const textColor = getColorByPercent(value - 0.05);

    const gaugeChartStyle = {
        width: isDashboard ? '80%' : '90%',
        maxWidth: isMobile ? '600px' : '800px',
    };

    const headerStyle = {
        marginTop: '5px',
        color: textColor,
        fontSize: isMobile ? '1rem' : '1.5rem',
    };

    return (
        <div style={{ height: '100%' }}>
            {!isDashboard && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0px',
                    height: '30px'
                }}>
                    <div>
                        {isLoading && <span style={{ color: colors.grey[100] }}>Loading...</span>}
                        {error && <span style={{ color: colors.redAccent[500] }}>{error}</span>}
                    </div>
                </div>
            )}

            <div className="chart-container" style={{
                position: 'relative',
                height: 'calc(100% - 40px)',
                width: '100%',
                border: '2px solid #a9a9a9',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
            }}>
                <div style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    paddingTop: '20px'
                }}>
                    <div style={gaugeChartStyle}>
                        <GaugeChart
                            id="gauge-chart3"
                            nrOfLevels={10}
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
            
            {!isDashboard && formattedData.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                    <span style={{ color: colors.grey[100] }}>
                        Last Updated: {formattedData[formattedData.length - 1].time}
                    </span>
                </div>
            )}
            
            {!isDashboard && (
                <p className='chart-info' style={{ marginTop: '20px', textAlign: 'left', width: '100%' }}>
                    The Fear and Greed index is a metric that measures the sentiment of the market by analyzing various sources of data, including surveys, social media, volatility, market momentum, and volume among others.
                    <br /> The information has been provided here: <a href="https://alternative.me/crypto/fear-and-greed-index/">https://alternative.me/crypto/fear-and-greed-index/</a>
                </p>
            )}
        </div>
    );
}

export default CryptoFearAndGreedIndex;