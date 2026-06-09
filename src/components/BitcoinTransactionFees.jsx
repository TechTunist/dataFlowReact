import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material';
import { tokens } from "../theme";
import { EXTERNAL } from '../config/api';
import logger from '../utils/logger';

const BitcoinFees = () => {
    const [fees, setFees] = useState(null);
    const [btcPrice, setBtcPrice] = useState(null);
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

    const getTransactionFees = async () => {
        try {
            const response = await fetch(EXTERNAL.blockchainMempoolFees());
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            logger.error('Error fetching transaction fees:', error);
            return null;
        }
    };

    const getBitcoinPrice = async () => {
        try {
            const response = await fetch(EXTERNAL.coinGeckoBtcPrice());
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            return data.bitcoin.usd;
        } catch (error) {
            logger.error('Error fetching Bitcoin price:', error);
            return null;
        }
    };

    useEffect(() => {
        const fetchFeesAndPrice = async () => {
            // This widget uses lightweight localStorage caching (10 min TTL)
            // because the data is very small and external (blockchain.info + CoinGecko).
            // For our own API data we use the main IndexedDB system in idbUtils.
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
        return <div style={{ opacity: 0.7 }}>Loading fees...</div>;
    }

    const averageFee = (calculateFeeInUsd(fees.regular) + calculateFeeInUsd(fees.priority)) / 2;

    return (
        <div className="under-chart-fee" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <p style={{ marginBottom: 0, color: colors.greenAccent[500], fontSize: '0.95rem' }}>
                BTC Transaction Fee: ~${averageFee.toFixed(2)}
            </p>
        </div>
    );
};

export default BitcoinFees;
