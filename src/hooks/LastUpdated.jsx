import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material';
import { tokens } from "../theme";
import RefreshIcon from '@mui/icons-material/Refresh';
import '../styling/LastUpdated.css';

const LastUpdated = ({ storageKey }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const [lastUpdated, setLastUpdated] = useState('');
    const [refresh, setRefresh] = useState(0);
    const [isClicked, setIsClicked] = useState(false);

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
    }, [storageKey, refresh]); // Depend on storageKey and refresh to update when they change

    const refreshComponent = () => {
        setRefresh(prev => prev + 1); // Change state to trigger re-render
        setIsClicked(true);
        setTimeout(() => setIsClicked(false), 300); // Reset animation state after 300ms
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
