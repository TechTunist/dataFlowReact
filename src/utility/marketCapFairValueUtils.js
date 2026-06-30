export const MARKET_CAP_FAIR_VALUE_TYPES = {
  btc: {
    label: 'Bitcoin',
    seriesLabel: 'Bitcoin Price',
    valueNoun: 'price',
    fairValueMid: { scale: 0.033, shiftDays: -350, curveAdjustment: 0.984 },
    extendDays: 730,
  },
  total: {
    label: 'Total',
    seriesLabel: 'Total Market Cap',
    valueNoun: 'market cap',
    fairValueMid: { scale: 0.01, shiftDays: -370, curveAdjustment: 0.993 },
    extendWeeks: 156,
  },
  total2: {
    label: 'Total 2',
    seriesLabel: 'Total 2 Market Cap',
    valueNoun: 'market cap',
    fairValueMid: { scale: 0.007, shiftDays: -400, curveAdjustment: 0.999 },
    extendWeeks: 156,
  },
  total3: {
    label: 'Total 3',
    seriesLabel: 'Total 3 Market Cap',
    valueNoun: 'market cap',
    fairValueMid: { scale: 0.012, shiftDays: -370, curveAdjustment: 0.994 },
    extendWeeks: 156,
  },
};

export function dedupeSortSeries(data) {
  const seen = new Set();
  return (data || [])
    .filter((item) => {
      const time = item.time || item.date;
      if (!time) return false;
      const key = typeof time === 'string' ? time : time.toString();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(a.time || a.date) - new Date(b.time || b.date));
}

function calculateLogarithmicRegression(data) {
  const n = data.length;
  const sumLogX = data.reduce((sum, _, index) => sum + Math.log(index + 1), 0);
  const sumY = data.reduce((sum, point) => sum + Math.log(point.value), 0);
  const sumLogXSquared = data.reduce((sum, _, index) => sum + Math.log(index + 1) ** 2, 0);
  const sumLogXLogY = data.reduce(
    (sum, point, index) => sum + Math.log(index + 1) * Math.log(point.value),
    0
  );
  const slope = (n * sumLogXLogY - sumLogX * sumY) / (n * sumLogXSquared - sumLogX ** 2);
  const intercept = (sumY - slope * sumLogX) / n;
  return { slope, intercept };
}

function extendSeries(data, config) {
  const lastDate = new Date(data[data.length - 1].time);
  const extendedData = [...data];

  if (config.extendDays) {
    for (let i = 1; i <= config.extendDays; i++) {
      const nextDate = new Date(lastDate);
      nextDate.setDate(lastDate.getDate() + i);
      extendedData.push({ time: nextDate.toISOString().split('T')[0], value: null });
    }
    return extendedData;
  }

  for (let i = 1; i <= config.extendWeeks; i++) {
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + i * 7);
    extendedData.push({ time: nextDate.toISOString().split('T')[0], value: null });
  }
  return extendedData;
}

function computeFairValueMidLine(data, typeKey) {
  const config = MARKET_CAP_FAIR_VALUE_TYPES[typeKey];
  const extendedData = extendSeries(data, config);
  const { slope, intercept } = calculateLogarithmicRegression(data);
  const { scale, shiftDays, curveAdjustment } = config.fairValueMid;

  return extendedData.map(({ time }, index) => {
    const x = Math.log(index + 1 - shiftDays + 1);
    const adjustedX = Math.pow(x, curveAdjustment);
    const delta = intercept - 11.5;
    const adjustedSlope = slope + 2;
    const value = Math.exp(adjustedSlope * adjustedX + delta) * scale;
    return { time, value };
  });
}

/** Returns [{ time, value }] where value is percentage of fair value (100 = fair). */
export function computeFairValueDifferenceSeries(data, typeKey) {
  if (!data || data.length === 0) return [];

  const fairValueMid = computeFairValueMidLine(data, typeKey);
  const fairValueByTime = new Map(
    fairValueMid
      .filter((point) => point.value != null && Number.isFinite(point.value) && point.value > 0)
      .map((point) => [point.time, point.value])
  );

  return data
    .filter((point) => point.value != null && Number.isFinite(point.value) && point.value > 0)
    .map((point) => {
      const fairValue = fairValueByTime.get(point.time);
      if (!fairValue) return null;
      return {
        time: point.time,
        value: (point.value / fairValue) * 100,
      };
    })
    .filter(Boolean);
}