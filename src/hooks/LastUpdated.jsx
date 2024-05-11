import React, { useState, useEffect } from 'react';

const LastUpdated = ({ storageKey }) => {
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
            {lastUpdated && <p>Last Updated: {lastUpdated}</p>}
        </div>
    );
};

export default LastUpdated;
