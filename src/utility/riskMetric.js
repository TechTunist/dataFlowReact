export const calculateRiskMetric = (data) => {
  // Adjustable parameters to control the new factor's impact
  const exponentialGrowthRate = 400; // Lower values increase growth speed after 600 days
  const priceAmplifierLow = 50000; // Denominator for price between $50k-$100k (higher = less effect)
  const priceAmplifierHigh = 70000; // Denominator for price above $100k (higher = less effect)
  const factorWeight = 5; // Reduced weight of new factor (was 5) to soften the drop
  const decayRate = 2.5; // How many "remembered" streak days are lost per real day below MA (lower = slower decay)

  // Step 1: Calculate the 50-week (374-day) moving average
  const movingAverage = data.map((item, index) => {
    const start = Math.max(index - 373, 0);
    const subset = data.slice(start, index + 1);
    const avg = subset.reduce((sum, curr) => sum + parseFloat(curr.value), 0) / subset.length;
    return { ...item, MA: avg };
  });

  // Step 2: Calculate consecutive days above/below MA and the new factor with persistent memory
  let consecutiveDaysAboveMA = 0;
  let consecutiveDaysBelowMA = 0;
  let persistentStreak = 0; // This will decay slowly when price is below MA

  const movingAverageWithFactor = movingAverage.map((item, index) => {
    const isAboveMA = item.value >= item.MA;

    if (isAboveMA) {
      consecutiveDaysAboveMA++;
      consecutiveDaysBelowMA = 0;
    } else {
      consecutiveDaysBelowMA++;
      consecutiveDaysAboveMA = 0; // Live streak resets immediately when below
      // Removed the aggressive reset after 10 days below - no longer needed
    }

    // Update persistent streak: sync when above, decay when below
    if (isAboveMA) {
      persistentStreak = consecutiveDaysAboveMA;
    } else {
      persistentStreak = Math.max(0, persistentStreak - decayRate);
    }

    // Calculate the new factor using the persistent streak
    const baseFactor = persistentStreak >= 600
      ? Math.exp((persistentStreak - 600) / exponentialGrowthRate) - 1
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

    return {
      ...item,
      NewFactor: newFactor,
      ConsecutiveDaysAboveMA: consecutiveDaysAboveMA,
      PersistentStreak: persistentStreak, // Optional: for debugging/visualisation
    };
  });

  // Step 3: Calculate the logarithmic difference (Preavg)
  const movingAverageWithPreavg = movingAverageWithFactor.map((item, index) => {
    const preavg = index > 0 ? (Math.log(item.value) - Math.log(item.MA)) * Math.pow(index, 0.395) : 0;
    return { ...item, Preavg: preavg };
  });

  // Step 4: Normalize the Preavg values (for the original component)
  const preavgValues = movingAverageWithPreavg.map(item => item.Preavg);
  const preavgMin = Math.min(...preavgValues);
  const preavgMax = Math.max(...preavgValues);

  // Guard against division by zero if all Preavg values are identical
  const denominator = preavgMax - preavgMin === 0 ? 1 : preavgMax - preavgMin;

  // Step 5: Combine Preavg with the new factor and normalize
  const normalizedRisk = movingAverageWithPreavg.map(item => {
    // Combine the original risk (based on Preavg) with the new persistent factor
    const combinedRisk = item.Preavg + item.NewFactor * factorWeight;

    return {
      ...item,
      Risk: (combinedRisk - preavgMin) / denominator,
    };
  });

  return normalizedRisk;
};