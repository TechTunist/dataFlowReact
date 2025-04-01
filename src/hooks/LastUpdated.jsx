import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material';
import { tokens } from "../theme";
import RefreshIcon from '@mui/icons-material/Refresh';
import '../styling/LastUpdated.css';
import pako from 'pako';

const LastUpdated = ({ storageKey }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [lastUpdated, setLastUpdated] = useState(''); // Empty string by default
    const [refresh, setRefresh] = useState(0);
    const [isClicked, setIsClicked] = useState(false);

    // Decompression function
    const decompressData = (compressedString) => {
        try {
            const compressed = Uint8Array.from(atob(compressedString), c => c.charCodeAt(0));
            return pako.ungzip(compressed, { to: 'string' });
        } catch (error) {
            return null; // Return null if decompression fails
        }
    };

    // Process data (compressed or uncompressed)
    const processStorageData = (dataJson) => {
        if (!dataJson) {
            setLastUpdated(''); // No data, set empty string
            return;
        }

        let parsedData;
        const decompressed = decompressData(dataJson);

        if (decompressed !== null) {
            // Data is compressed
            parsedData = JSON.parse(decompressed);
            if (parsedData.version === 'compressed' && parsedData.data?.length) {
                const lastDataPoint = parsedData.data[parsedData.data.length - 1];
                setLastUpdated(new Date(lastDataPoint.time).toLocaleDateString());
            } else {
                setLastUpdated('');
            }
        } else {
            // Data is uncompressed (old format)
            try {
                parsedData = JSON.parse(dataJson);
                if (Array.isArray(parsedData) && parsedData.length) {
                    const lastDataPoint = parsedData[parsedData.length - 1];
                    setLastUpdated(new Date(lastDataPoint.time).toLocaleDateString());
                } else {
                    setLastUpdated('');
                }
            } catch (error) {
                console.error('Error parsing uncompressed data:', error);
                setLastUpdated('');
            }
        }
    };

    useEffect(() => {
        const dataJson = localStorage.getItem(storageKey);
        processStorageData(dataJson);
    }, [storageKey, refresh]);

    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === storageKey) {
                setRefresh(prev => prev + 1);
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [storageKey]);

    const refreshComponent = () => {
        setRefresh(prev => prev + 1); // Trigger useEffect to re-check localStorage
        setIsClicked(true);
        setTimeout(() => setIsClicked(false), 300);
    };

    return (
        <div
            onClick={refreshComponent}
            className={isClicked ? 'scale' : ''}
            style={{
                cursor: 'pointer', // Indicate the whole area is clickable
                display: 'inline-flex',
                alignItems: 'center',
                transition: 'transform 0.3s',
                transform: isClicked ? 'scale(1.05)' : 'scale(1)'
            }}
        >
            <p
                style={{
                    color: colors.greenAccent[500],
                    marginBottom: '0',
                    marginRight: '10px', // Space between text and icon
                }}
            >
                Last Updated: {lastUpdated || '(click to refresh)'}
            </p>
            {/* <RefreshIcon
                    onClick={refreshComponent}
                    className={isClicked ? 'scale' : ''}
                    style={{
                        marginLeft: '10px',
                        color: colors.greenAccent[500],
                        cursor: 'pointer',
                        transition: 'transform 0.3s',
                        transform: isClicked ? 'scale(1.2)' : 'scale(1)'
                    }}
                /> */}
        </div>
    );
};

export default LastUpdated;