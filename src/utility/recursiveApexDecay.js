/**
 * Recursive Apex Decay (RAD)
 *
 * Projects the next Bitcoin cycle bottom and top from the rate of change
 * (and rate-of-rate of change) of historical cycle apexes (major tops and bottoms).
 *
 * Method:
 * 1. Measure transition multipliers/ratios between successive apexes
 *    (top-to-top, bottom-to-bottom, top-to-bottom retention, bottom-to-top bull mult).
 * 2. Compute successive rates of change of those multipliers.
 * 3. Extrapolate the next rate by adding the observed delta of rates (second-order).
 * 4. Apply the projected multiplier to the latest apex to get B4 / T5.
 *
 * Seed apexes are verified against public daily series (Yahoo BTC-USD highs/lows
 * for 2015-2025; Blockchain.com market-price for 2013). When live btcData is
 * available, prices are refined from local max/min near each seed date.
 *
 * Educational model only. Not financial advice.
 */

/** Canonical cycle apexes (verified seed values). */
export const RAD_SEED_APEXES = [
  {
    id: 'T1',
    type: 'top',
    date: '2013-11-30',
    price: 1134,
    source: 'Blockchain.com market-price avg peak (Nov 2013 cycle)',
  },
  {
    id: 'B1',
    type: 'bottom',
    date: '2015-01-14',
    price: 172,
    source: 'Yahoo BTC-USD daily low ~$171.51; trough day of 2015 cycle',
  },
  {
    id: 'T2',
    type: 'top',
    date: '2017-12-17',
    price: 20089,
    source: 'Yahoo BTC-USD daily high $20,089 (Dec 2017 ATH)',
  },
  {
    id: 'B2',
    type: 'bottom',
    date: '2018-12-15',
    price: 3191,
    source: 'Yahoo BTC-USD daily low $3,191 (Dec 2018 cycle low)',
  },
  {
    id: 'T3',
    type: 'top',
    date: '2021-11-10',
    price: 68790,
    source: 'Yahoo BTC-USD daily high $68,790 (Nov 2021 ATH)',
  },
  {
    id: 'B3',
    type: 'bottom',
    date: '2022-11-21',
    price: 15599,
    source: 'Yahoo BTC-USD daily low $15,599 (Nov 2022 cycle low)',
  },
  {
    id: 'T4',
    type: 'top',
    date: '2025-10-06',
    price: 126198,
    source: 'Yahoo BTC-USD daily high $126,198 (Oct 2025 ATH)',
  },
];

export const RAD_NAME = 'Recursive Apex Decay';
export const RAD_ABBREV = 'RAD';

/** Window (days) used when refining seed dates against live daily series. */
export const RAD_REFINE_WINDOW_DAYS = 3;

/**
 * Floor on log-price sigma so a tiny multi-path spread cannot look more precise than it is.
 * ~15% / ~22% relative at 1σ for bottom / top respectively.
 */
export const RAD_MIN_LOG_SIGMA_B4 = 0.15;
export const RAD_MIN_LOG_SIGMA_T5 = 0.22;
/** Floor on timing σ (days) when historical sample is very tight. */
export const RAD_MIN_DAYS_SIGMA_BEAR = 14;
export const RAD_MIN_DAYS_SIGMA_BULL = 21;

export function daysBetween(start, end) {
  if (!start || !end) return 0;
  const a = new Date(`${String(start).slice(0, 10)}T00:00:00Z`);
  const b = new Date(`${String(end).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export function addDays(isoDate, days) {
  const d = new Date(`${String(isoDate).slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatRadDate(isoDate) {
  if (!isoDate) return 'n/a';
  const d = new Date(`${String(isoDate).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return String(isoDate);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatRadPrice(price, { compact = false } = {}) {
  if (price == null || !Number.isFinite(price)) return 'n/a';
  if (compact) {
    if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(2)}M`;
    if (price >= 10_000) return `$${Math.round(price).toLocaleString('en-US')}`;
    if (price >= 1_000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    return `$${price.toFixed(0)}`;
  }
  if (price >= 1000) {
    return `$${Math.round(price).toLocaleString('en-US')}`;
  }
  return `$${price.toFixed(2)}`;
}

/**
 * Refine seed apexes using a daily { time, value } series (close prices).
 * Within ±window days of each seed, pick local max (tops) or min (bottoms).
 * Seed price is kept if the series has no points in the window (e.g. missing early history).
 */
export function refineApexesFromSeries(series, seeds = RAD_SEED_APEXES, windowDays = RAD_REFINE_WINDOW_DAYS) {
  if (!Array.isArray(series) || series.length === 0) {
    return seeds.map((s) => ({ ...s, refined: false }));
  }

  const points = series
    .map((d) => ({
      time: String(d.time || d.date || '').slice(0, 10),
      value: parseFloat(d.value ?? d.close ?? d.price),
    }))
    .filter((d) => d.time && Number.isFinite(d.value) && d.value > 0)
    .sort((a, b) => a.time.localeCompare(b.time));

  return seeds.map((seed) => {
    const seedDate = seed.date;
    const inWindow = points.filter(
      (p) => Math.abs(daysBetween(seedDate, p.time)) <= windowDays,
    );
    if (inWindow.length === 0) {
      return { ...seed, refined: false };
    }

    const extreme =
      seed.type === 'top'
        ? inWindow.reduce((best, p) => (p.value > best.value ? p : best), inWindow[0])
        : inWindow.reduce((best, p) => (p.value < best.value ? p : best), inWindow[0]);

    // Prefer seed extreme price when the series is daily close and seed is true high/low.
    // Only replace price if series extreme is within a reasonable band of the seed
    // (avoids degrading true highs when we only have closes).
    const seriesPrice = extreme.value;
    const useSeriesPrice =
      seed.type === 'top'
        ? seriesPrice >= seed.price * 0.92
        : seriesPrice <= seed.price * 1.08;

    return {
      ...seed,
      date: extreme.time,
      price: useSeriesPrice
        ? seed.type === 'top'
          ? Math.max(seed.price, seriesPrice)
          : Math.min(seed.price, seriesPrice)
        : seed.price,
      seriesClose: seriesPrice,
      refined: true,
    };
  });
}

/** Successive ratios for a sequence of numbers. */
export function successiveRatios(values) {
  const out = [];
  for (let i = 1; i < values.length; i += 1) {
    const prev = values[i - 1];
    const cur = values[i];
    if (!prev || !Number.isFinite(prev) || !Number.isFinite(cur) || prev === 0) {
      out.push(null);
    } else {
      out.push(cur / prev);
    }
  }
  return out;
}

/** Sample standard deviation (n-1). Returns 0 if fewer than 2 finite values. */
export function sampleStd(values) {
  const xs = (values || []).filter((v) => v != null && Number.isFinite(v));
  if (xs.length < 2) return 0;
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
  const variance = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

/**
 * Log-space price bands around a center from alternative estimates + floor σ.
 * Bands are multiplicative (lognormal): center × exp(±k·σ_log).
 */
export function logPriceBands(center, alternativePrices, minLogSigma = 0.15) {
  if (center == null || !Number.isFinite(center) || center <= 0) {
    return null;
  }
  const alts = (alternativePrices || []).filter(
    (p) => p != null && Number.isFinite(p) && p > 0,
  );
  const logResiduals = alts.map((p) => Math.log(p / center));
  // Include the center residual (0) so a single alt still yields a finite spread
  const sigmaFromAlts = sampleStd([...logResiduals, 0]);
  const sigmaLog = Math.max(minLogSigma, sigmaFromAlts);

  const band = (k) => ({
    low: center * Math.exp(-k * sigmaLog),
    high: center * Math.exp(k * sigmaLog),
  });

  return {
    center,
    sigmaLog,
    sigma1: band(1),
    sigma2: band(2),
    alternatives: alts,
  };
}

/**
 * Date bands around a center ISO date using day-count σ.
 */
export function dateBands(centerDate, daysSigma, minDaysSigma = 14) {
  if (!centerDate) return null;
  const sigma = Math.max(minDaysSigma, daysSigma || 0);
  const roundSigma = Math.round(sigma);
  return {
    center: centerDate,
    daysSigma: roundSigma,
    sigma1: {
      start: addDays(centerDate, -roundSigma),
      end: addDays(centerDate, roundSigma),
    },
    sigma2: {
      start: addDays(centerDate, -2 * roundSigma),
      end: addDays(centerDate, 2 * roundSigma),
    },
  };
}

/**
 * Project the next term of a multiplier sequence using constant second difference
 * on the first-order rates (rate-of-rate arithmetic extrapolation).
 *
 * Given multipliers m0, m1, m2:
 *   rate1 = m1/m0, rate2 = m2/m1
 *   Δrate = rate2 - rate1
 *   rate3 = rate2 + Δrate
 *   m3 = m2 * rate3
 *
 * With only two multipliers, falls back to applying the single observed rate once.
 */
export function projectNextFromMultipliers(multipliers) {
  const m = multipliers.filter((x) => x != null && Number.isFinite(x) && x > 0);
  if (m.length < 1) {
    return {
      projected: null,
      rates: [],
      rateOfRate: null,
      method: 'insufficient',
    };
  }
  if (m.length === 1) {
    return {
      projected: m[0],
      rates: [],
      rateOfRate: null,
      method: 'hold_last',
    };
  }
  if (m.length === 2) {
    const rate = m[1] / m[0];
    return {
      projected: m[1] * rate,
      rates: [rate],
      rateOfRate: null,
      method: 'first_order',
    };
  }

  // Use last three multipliers for second-order projection
  const m0 = m[m.length - 3];
  const m1 = m[m.length - 2];
  const m2 = m[m.length - 1];
  const rate1 = m1 / m0;
  const rate2 = m2 / m1;
  const rateOfRate = rate2 - rate1;
  const rate3 = rate2 + rateOfRate;
  // Keep projected multiplier positive and sane
  const clampedRate = Math.max(0.01, rate3);
  const projected = m2 * clampedRate;

  const allRates = successiveRatios(m);
  return {
    projected,
    rates: allRates,
    rate1,
    rate2,
    rate3: clampedRate,
    rateOfRate,
    method: 'second_order',
  };
}

function pickByType(apexes, type) {
  return apexes.filter((a) => a.type === type);
}

/**
 * Build transition metrics and projections from apex list.
 */
export function computeRadAnalysis(apexes = RAD_SEED_APEXES) {
  const tops = pickByType(apexes, 'top');
  const bottoms = pickByType(apexes, 'bottom');
  const t4 = tops[tops.length - 1];

  // Top → Top multipliers
  const topToTopMults = [];
  const topToTopDays = [];
  for (let i = 1; i < tops.length; i += 1) {
    topToTopMults.push(tops[i].price / tops[i - 1].price);
    topToTopDays.push(daysBetween(tops[i - 1].date, tops[i].date));
  }

  // Bottom → Bottom
  const bottomToBottomMults = [];
  const bottomToBottomDays = [];
  for (let i = 1; i < bottoms.length; i += 1) {
    bottomToBottomMults.push(bottoms[i].price / bottoms[i - 1].price);
    bottomToBottomDays.push(daysBetween(bottoms[i - 1].date, bottoms[i].date));
  }

  // Top → Bottom retention (paired: T1→B1, T2→B2, T3→B3)
  const topToBottom = [];
  const pairs = Math.min(tops.length, bottoms.length);
  for (let i = 0; i < pairs; i += 1) {
    // Bottom after this top: bottoms[i] if tops[i] is before bottoms[i]
    const top = tops[i];
    const bottom = bottoms[i];
    if (!top || !bottom) continue;
    if (daysBetween(top.date, bottom.date) < 0) continue;
    topToBottom.push({
      from: top,
      to: bottom,
      retention: bottom.price / top.price,
      dropPct: (1 - bottom.price / top.price) * 100,
      days: daysBetween(top.date, bottom.date),
    });
  }

  // Bottom → next Top (B1→T2, B2→T3, B3→T4)
  const bottomToTop = [];
  for (let i = 0; i < bottoms.length; i += 1) {
    const bottom = bottoms[i];
    const nextTop = tops[i + 1];
    if (!nextTop) continue;
    bottomToTop.push({
      from: bottom,
      to: nextTop,
      mult: nextTop.price / bottom.price,
      days: daysBetween(bottom.date, nextTop.date),
    });
  }

  const retentionMults = topToBottom.map((x) => x.retention);
  const bullMults = bottomToTop.map((x) => x.mult);

  const retentionProj = projectNextFromMultipliers(retentionMults);
  const bullProj = projectNextFromMultipliers(bullMults);
  const topToTopProj = projectNextFromMultipliers(topToTopMults);
  const bottomToBottomProj =
    bottomToBottomMults.length >= 2
      ? projectNextFromMultipliers(bottomToBottomMults)
      : { projected: null, rates: successiveRatios(bottomToBottomMults), rateOfRate: null, method: 'insufficient' };

  // Timing averages
  const bearDaysList = topToBottom.map((x) => x.days).filter((d) => d > 0);
  const bullDaysList = bottomToTop.map((x) => x.days).filter((d) => d > 0);
  const peakToPeakDays = topToTopDays.filter((d) => d > 0);

  const avg = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);
  // Prefer last-two-cycle bear average (matches Market Cycles / 100-day window caution bias)
  const bearAvgLast2 =
    bearDaysList.length >= 2
      ? avg(bearDaysList.slice(-2))
      : avg(bearDaysList);
  const bearAvgAll = avg(bearDaysList);
  const bullAvgAll = avg(bullDaysList);
  const peakToPeakAvg = avg(peakToPeakDays);

  // Primary projection path: T4 → B4 (retention) → T5 (bull mult)
  let projectedRetention = retentionProj.projected;
  // Clamp retention to (0, 1); bottoms are below tops historically
  if (projectedRetention != null) {
    projectedRetention = Math.min(0.95, Math.max(0.05, projectedRetention));
  }

  let projectedBullMult = bullProj.projected;
  if (projectedBullMult != null) {
    projectedBullMult = Math.max(1.01, projectedBullMult);
  }

  const b4Price =
    t4 && projectedRetention != null ? t4.price * projectedRetention : null;
  const b4Days = bearAvgLast2 != null ? Math.round(bearAvgLast2) : null;
  const b4Date = t4 && b4Days != null ? addDays(t4.date, b4Days) : null;

  const t5FromBottom =
    b4Price != null && projectedBullMult != null
      ? b4Price * projectedBullMult
      : null;
  const bullDays = bullAvgAll != null ? Math.round(bullAvgAll) : null;
  const t5DateFromBottom =
    b4Date && bullDays != null ? addDays(b4Date, bullDays) : null;

  // Cross-check: top-to-top only
  let projectedTopMult = topToTopProj.projected;
  if (projectedTopMult != null) {
    projectedTopMult = Math.max(1.01, projectedTopMult);
  }
  const t5FromTops =
    t4 && projectedTopMult != null ? t4.price * projectedTopMult : null;
  const t5DateFromTops =
    t4 && peakToPeakAvg != null
      ? addDays(t4.date, Math.round(peakToPeakAvg))
      : null;

  // Robust blend: geometric mean of the two T5 paths when both exist
  let t5Blended = null;
  if (t5FromBottom != null && t5FromTops != null) {
    t5Blended = Math.sqrt(t5FromBottom * t5FromTops);
  } else {
    t5Blended = t5FromBottom ?? t5FromTops;
  }

  // Primary displayed T5: bottom→top path (keeps cycle logic), with blend as secondary
  const t5Primary = t5FromBottom ?? t5Blended;
  const t5DatePrimary = t5DateFromBottom ?? t5DateFromTops;

  // Bottom-to-bottom cross-check for B4
  const lastBottom = bottoms[bottoms.length - 1];
  let b4FromBottoms = null;
  let b4DateFromBottoms = null;
  if (lastBottom && bottomToBottomProj.projected != null) {
    b4FromBottoms = lastBottom.price * bottomToBottomProj.projected;
    const b2bDays = avg(bottomToBottomDays);
    if (b2bDays != null) {
      b4DateFromBottoms = addDays(lastBottom.date, Math.round(b2bDays));
    }
  }

  // Cycle rows for layman table
  const cycles = [];
  for (let i = 0; i < pairs; i += 1) {
    const top = tops[i];
    const bottom = bottoms[i];
    const nextTop = tops[i + 1];
    const ttb = topToBottom[i];
    const btt = bottomToTop[i];
    const topGrowth =
      nextTop && top ? nextTop.price / top.price : null;
    cycles.push({
      cycle: i + 1,
      top,
      bottom,
      nextTop: nextTop || null,
      dropPct: ttb?.dropPct ?? null,
      retention: ttb?.retention ?? null,
      bullMult: btt?.mult ?? null,
      topToTopMult: topGrowth,
      bearDays: ttb?.days ?? null,
      bullDays: btt?.days ?? null,
    });
  }

  // Uncertainty: ±1σ is shown in the UI; 2σ is still computed for optional use 
  // Timing: sample SD of historical phase lengths (with floors for small n).
  const bearDaysSigma = Math.max(RAD_MIN_DAYS_SIGMA_BEAR, sampleStd(bearDaysList));
  const bullDaysSigma = Math.max(RAD_MIN_DAYS_SIGMA_BULL, sampleStd(bullDaysList));
  // T5 date is B4 date + bull phase → independent-ish phases: combine in quadrature
  const t5DaysSigmaFromT4 = Math.sqrt(bearDaysSigma ** 2 + bullDaysSigma ** 2);

  // Price: alternative estimators around the primary (multi-path spread in log space).
  // B4 alternatives: second-order (primary), last retention hold, mean retention, first-order rate,
  // and bottom-to-bottom path when available.
  const lastRetention = retentionMults.length
    ? retentionMults[retentionMults.length - 1]
    : null;
  const meanRetention = retentionMults.length ? avg(retentionMults) : null;
  const retRates = successiveRatios(retentionMults).filter((r) => r != null && r > 0);
  const firstOrderRetention =
    lastRetention != null && retRates.length
      ? lastRetention * retRates[retRates.length - 1]
      : null;

  const b4AltPrices = [];
  if (t4) {
    if (lastRetention != null) b4AltPrices.push(t4.price * lastRetention);
    if (meanRetention != null) b4AltPrices.push(t4.price * meanRetention);
    if (firstOrderRetention != null) {
      const fo = Math.min(0.95, Math.max(0.05, firstOrderRetention));
      b4AltPrices.push(t4.price * fo);
    }
  }
  if (b4FromBottoms != null) b4AltPrices.push(b4FromBottoms);

  const b4PriceBands = logPriceBands(b4Price, b4AltPrices, RAD_MIN_LOG_SIGMA_B4);
  const b4DateBands = dateBands(b4Date, bearDaysSigma, RAD_MIN_DAYS_SIGMA_BEAR);

  // T5 alternatives: bottom-path primary, top-to-top path, blend, and first-order bull mult
  const lastBull = bullMults.length ? bullMults[bullMults.length - 1] : null;
  const bullRates = successiveRatios(bullMults).filter((r) => r != null && r > 0);
  const firstOrderBull =
    lastBull != null && bullRates.length
      ? lastBull * bullRates[bullRates.length - 1]
      : null;

  const t5AltPrices = [];
  if (t5FromTops != null) t5AltPrices.push(t5FromTops);
  if (t5Blended != null && t5Blended !== t5Primary) t5AltPrices.push(t5Blended);
  if (b4Price != null && firstOrderBull != null) {
    t5AltPrices.push(b4Price * Math.max(1.01, firstOrderBull));
  }
  if (b4Price != null && lastBull != null) {
    t5AltPrices.push(b4Price * lastBull);
  }
  // Also vary B4 within 1σ and apply primary bull mult (price timing coupling)
  if (b4PriceBands && projectedBullMult != null) {
    t5AltPrices.push(b4PriceBands.sigma1.low * projectedBullMult);
    t5AltPrices.push(b4PriceBands.sigma1.high * projectedBullMult);
  }

  const t5PriceBands = logPriceBands(t5Primary, t5AltPrices, RAD_MIN_LOG_SIGMA_T5);
  const t5DateBands = dateBands(t5DatePrimary, t5DaysSigmaFromT4, RAD_MIN_DAYS_SIGMA_BULL);

  const uncertainty = {
    b4: {
      price: b4PriceBands,
      date: b4DateBands,
      bearDaysSigma: Math.round(bearDaysSigma),
    },
    t5: {
      price: t5PriceBands,
      date: t5DateBands,
      bullDaysSigma: Math.round(bullDaysSigma),
      combinedDaysSigma: Math.round(t5DaysSigmaFromT4),
    },
    note:
      '±1σ bands use sample standard deviation of historical bear/bull lengths for dates, and ' +
      'log-space spread of alternative RAD estimators for prices, with minimum floors so a small ' +
      'sample cannot look more precise than it is. Approximate ranges only, not statistical guarantees.',
  };

  return {
    apexes,
    tops,
    bottoms,
    t4,
    transitions: {
      topToTop: {
        multipliers: topToTopMults,
        days: topToTopDays,
        projection: topToTopProj,
      },
      bottomToBottom: {
        multipliers: bottomToBottomMults,
        days: bottomToBottomDays,
        projection: bottomToBottomProj,
      },
      topToBottom: {
        pairs: topToBottom,
        multipliers: retentionMults,
        projection: { ...retentionProj, projected: projectedRetention },
      },
      bottomToTop: {
        pairs: bottomToTop,
        multipliers: bullMults,
        projection: { ...bullProj, projected: projectedBullMult },
      },
    },
    timing: {
      bearDaysList,
      bullDaysList,
      peakToPeakDays,
      bearAvgLast2,
      bearAvgAll,
      bullAvgAll,
      peakToPeakAvg,
      bottomToBottomAvg: avg(bottomToBottomDays),
      bearDaysSigma,
      bullDaysSigma,
    },
    projection: {
      b4: {
        price: b4Price,
        date: b4Date,
        retention: projectedRetention,
        dropPct: projectedRetention != null ? (1 - projectedRetention) * 100 : null,
        daysFromT4: b4Days,
        method: 'top_to_bottom_second_order',
      },
      t5: {
        price: t5Primary,
        date: t5DatePrimary,
        bullMult: projectedBullMult,
        daysFromB4: bullDays,
        method: 'bottom_to_top_second_order',
        fromBottomPath: t5FromBottom,
        fromTopPath: t5FromTops,
        blended: t5Blended,
        topToTopMult: projectedTopMult,
        dateFromTops: t5DateFromTops,
      },
      crossChecks: {
        b4FromBottoms,
        b4DateFromBottoms,
        t5FromTops,
        t5DateFromTops,
        t5Blended,
      },
    },
    uncertainty,
    cycles,
  };
}

/**
 * Full pipeline: refine seeds with series (optional), then analyse.
 */
export function buildRadModel(btcSeries) {
  const apexes = refineApexesFromSeries(btcSeries, RAD_SEED_APEXES);
  return computeRadAnalysis(apexes);
}

/** Simple plain-English summary lines for the UI. */
export function radLaymanSummary(analysis) {
  const { projection, transitions } = analysis;
  const drop = projection.b4.dropPct;
  const bull = projection.t5.bullMult;
  return {
    headline:
      'Recursive Apex Decay (RAD) projects the next cycle floor and peak from how past tops and bottoms have been changing.',
    bullets: [
      'Each cycle Bitcoin still grows from bottom to top, but the recovery multiple is shrinking (decay).',
      'Crashes from top to bottom are getting less severe (shallower drawdowns).',
      `RAD extends that pattern: next crash about ${drop != null ? `${drop.toFixed(0)}%` : 'n/a'} off the latest top, then about a ${bull != null ? `${bull.toFixed(1)}x` : 'n/a'} recovery to the next top.`,
      'Dates use historical average lengths of bear and bull phases (roughly 4-year full cycles).',
    ],
    retentionTrend: transitions.topToBottom.multipliers,
    bullTrend: transitions.bottomToTop.multipliers,
  };
}
