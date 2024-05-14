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
            const data = JSON.parse(dataJson);
            // Assume data is an array of objects and each object has a 'time' property
            if (data.length) {
                const lastDataPoint = data[data.length - 1];
                setLastUpdated(new Date(lastDataPoint.time).toLocaleDateString());
            }
        }
    }, [storageKey]); // Depend on storageKey to update when it changes

    return (
        <div>
            {lastUpdated && <p style={{color: colors.greenAccent[500], marginBottom: '0'}}>Last Updated: {lastUpdated}</p>}
        </div>
    );
};

export default LastUpdated;