import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material';
import { tokens } from "../theme";
import RefreshIcon from '@mui/icons-material/Refresh';
import '../styling/LastUpdated.css';
import pako from 'pako';

const LastUpdated = ({ storageKey }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [lastUpdated, setLastUpdated] = useState('');
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
            setLastUpdated('');
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
        setRefresh(prev => prev + 1);
        setIsClicked(true);
        setTimeout(() => setIsClicked(false), 300);
    };

    return (
        <div>
            {lastUpdated && (
                <p style={{ color: colors.greenAccent[500], marginBottom: '0', display: 'inline-flex', alignItems: 'center' }}>
                    Last Updated: {lastUpdated}
                    <RefreshIcon
                        onClick={refreshComponent}
                        className={isClicked ? 'scale' : ''}
                        style={{
                            marginLeft: '10px',
                            color: colors.greenAccent[500],
                            cursor: 'pointer',
                            transition: 'transform 0.3s',
                            transform: isClicked ? 'scale(1.2)' : 'scale(1)'
                        }}
                    />
                </p>
            )}
        </div>
    );
};

export default LastUpdated;