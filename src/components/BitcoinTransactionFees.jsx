import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material';
import { tokens } from "../theme";

const BitcoinFees = () => {
    const [fees, setFees] = useState(null);
    const [btcPrice, setBtcPrice] = useState(null);
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

    const getTransactionFees = async () => {
        try {
            const response = await fetch('https://api.blockchain.info/mempool/fees');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            return data; // Adjusted to return the entire data
        } catch (error) {
            console.error('Error fetching transaction fees:', error);
            return null;
        }
    };

    const getBitcoinPrice = async () => {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            return data.bitcoin.usd;
        } catch (error) {
            console.error('Error fetching Bitcoin price:', error);
            return null;
        }
    };

    useEffect(() => {
        const fetchFeesAndPrice = async () => {
            const cachedFees = localStorage.getItem('btcFees');
            const cachedPrice = localStorage.getItem('btcPrice');
            const cacheTime = localStorage.getItem('cacheTime');

            const now = new Date().getTime();
            const cacheExpiry = 10 * 60 * 1000; // 10 minutes

            if (cachedFees && cachedPrice && cacheTime && (now - cacheTime) < cacheExpiry) {
                setFees(JSON.parse(cachedFees));
                setBtcPrice(JSON.parse(cachedPrice));
            } else {
                const feeData = await getTransactionFees();
                const priceData = await getBitcoinPrice();
                if (feeData && priceData) {
                    localStorage.setItem('btcFees', JSON.stringify(feeData));
                    localStorage.setItem('btcPrice', JSON.stringify(priceData));
                    localStorage.setItem('cacheTime', now);
                    setFees(feeData);
                    setBtcPrice(priceData);
                }
            }
        };
        fetchFeesAndPrice();
    }, []);

    const calculateFeeInUsd = (satsPerByte) => {
        const averageTransactionSize = 225; // bytes
        const feeInSats = satsPerByte * averageTransactionSize;
        const feeInBtc = feeInSats / 1e8;
        return feeInBtc * btcPrice;
    };

    if (!fees || !btcPrice) {
        return <div>Loading...</div>;
    }

    const averageFee = (calculateFeeInUsd(fees.regular) + calculateFeeInUsd(fees.priority)) / 2;

    return (
        <div>
            <p style={{ marginBottom: '0', color: colors.greenAccent[500]}}>BTC Transaction Fee provided by <a href="https://www.coingecko.com/en/api" target="_blank" rel="noopener noreferrer">CoinGecko</a>: ~${averageFee.toFixed(2)}</p>
        </div>
    );
};

export default BitcoinFees;
