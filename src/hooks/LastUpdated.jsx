import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material';
import { tokens } from "../theme";


const LastUpdated = ({ storageKey }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [lastUpdated, setLastUpdated] = useState('');

    useEffect(() => {
        // Attempt to retrieve the specific data from localStorage
        const dataJson = localStorage.getItem(storageKey);
        if (dataJson) {
            try {
                const data = JSON.parse(dataJson);
                // Ensure data is an array and has length
                if (Array.isArray(data) && data.length) {
                    const lastDataPoint = data[data.length - 1];
                    if (lastDataPoint && lastDataPoint.time) {
                        setLastUpdated(new Date(lastDataPoint.time).toLocaleDateString());
                    }
                }
            } catch (error) {
                console.error('Error parsing localStorage data:', error);
            }
        }
    }, [storageKey]); // Depend on storageKey to update when it changes

    return (
        <div style={{ color: colors.greenAccent[500]}}>
            {lastUpdated ? <p>Last Updated: {lastUpdated}</p> : <p>Data not available</p>}
        </div>
    );
};

export default LastUpdated;
