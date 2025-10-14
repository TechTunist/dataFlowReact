export const calculateRiskMetric = (data) => {
  // Adjustable parameters to control the new factor's impact
  const exponentialGrowthRate = 400; // Lower values increase growth speed after 600 days
  const priceAmplifierLow = 50000; // Denominator for price between $50k-$100k (higher = less effect)
  const priceAmplifierHigh = 70000; // Denominator for price above $100k (higher = less effect)
  const factorWeight = 5; // Weight of new factor in combined risk

  // Step 1: Calculate the 50-week (374-day) moving average
  const movingAverage = data.map((item, index) => {
    const start = Math.max(index - 373, 0);
    const subset = data.slice(start, index + 1);
    const avg = subset.reduce((sum, curr) => sum + parseFloat(curr.value), 0) / subset.length;
    return { ...item, MA: avg };
  });

  // Step 2: Calculate consecutive days above/below MA and the new factor
  let consecutiveDaysAboveMA = 0;
  let consecutiveDaysBelowMA = 0;
  const movingAverageWithFactor = movingAverage.map((item, index) => {
    const isAboveMA = item.value >= item.MA;

    if (isAboveMA) {
      consecutiveDaysAboveMA++;
      consecutiveDaysBelowMA = 0;
    } else {
      consecutiveDaysBelowMA++;
      if (consecutiveDaysBelowMA > 10) {
        consecutiveDaysAboveMA = 0; // Reset only after 10 consecutive days below
      }
    }

    // Calculate the new factor: exponential growth after 600 days
    const baseFactor = consecutiveDaysAboveMA >= 600
      ? Math.exp((consecutiveDaysAboveMA - 600) / exponentialGrowthRate) - 1
      : 0;

    // Amplify based on price
    const price = parseFloat(item.value);
    let priceAmplifier = 1;
    if (price > 100000) {
      priceAmplifier = 1 + (price - 100000) / priceAmplifierHigh;
    } else if (price > 50000) {
      priceAmplifier = 1 + (price - 50000) / priceAmplifierLow;
    }

    const newFactor = baseFactor * priceAmplifier;

    return { ...item, NewFactor: newFactor, ConsecutiveDaysAboveMA: consecutiveDaysAboveMA };
  });

  // Step 3: Calculate the logarithmic difference (Preavg)
  const movingAverageWithPreavg = movingAverageWithFactor.map((item, index) => {
    const preavg = index > 0 ? (Math.log(item.value) - Math.log(item.MA)) * Math.pow(index, 0.395) : 0;
    return { ...item, Preavg: preavg };
  });

  // Step 4: Normalize the Preavg values
  const preavgValues = movingAverageWithPreavg.map(item => item.Preavg);
  const preavgMin = Math.min(...preavgValues);
  const preavgMax = Math.max(...preavgValues);

  // Step 5: Combine Preavg with the new factor and normalize
  const normalizedRisk = movingAverageWithPreavg.map(item => {
    // Combine the original risk (based on Preavg) with the new factor
    const combinedRisk = item.Preavg + item.NewFactor * factorWeight;
    return {
      ...item,
      Risk: (combinedRisk - preavgMin) / (preavgMax - preavgMin),
    };
  });

  return normalizedRisk;
};