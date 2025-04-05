import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material';
import { tokens } from "../theme";
import '../styling/LastUpdated.css';
import pako from 'pako';
import RefreshIcon from '@mui/icons-material/Refresh';

const LastUpdated = ({ storageKey }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [lastUpdated, setLastUpdated] = useState(''); // Empty string by default
    const [refresh, setRefresh] = useState(0);
    const [isClicked, setIsClicked] = useState(false);

    // Helper to check if a string is base64
    const isBase64 = (str) => {
        if (!str || typeof str !== 'string') return false;
        try {
            return /^[A-Za-z0-9+/=]+$/.test(str) && atob(str) && true;
        } catch {
            return false;
        }
    };

    // Decompression function (only used if data is compressed)
    const decompressData = (compressedString) => {
        if (!compressedString) return null;
        if (isBase64(compressedString)) {
            try {
                const compressed = Uint8Array.from(atob(compressedString), c => c.charCodeAt(0));
                return pako.ungzip(compressed, { to: 'string' });
            } catch (error) {
                console.error('Decompression failed:', error);
                return null;
            }
        }
        return compressedString; // Return as-is if not base64
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
            try {
                parsedData = JSON.parse(decompressed);
                // Handle both compressed ({ version: 'compressed', data: [...] }) and uncompressed formats
                const dataArray = parsedData.version === 'compressed' ? parsedData.data : (parsedData.data || parsedData);
                if (dataArray.length) {
                    const lastDataPoint = dataArray[dataArray.length - 1];
                    setLastUpdated(new Date(lastDataPoint.time).toLocaleDateString());
                } else {
                    setLastUpdated('');
                }
            } catch (error) {
                console.error('Error parsing storage data:', error);
                setLastUpdated('');
            }
        } else {
            setLastUpdated('');
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
                    marginRight: '10px', // Space between text and icon (if icon were present)
                    display: 'inline-flex',
                    alignItems: 'center'
                }}
            >
                Last Updated: {lastUpdated || '(click to refresh)'}
                <RefreshIcon/>
            </p>
        </div>
    );
};

export default LastUpdated;