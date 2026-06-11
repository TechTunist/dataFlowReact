import {
  availableMacroSeries,
  availableCryptoSeries,
  availableIndicatorSeries,
} from '../components/workbench/availableSeries';

export const SMOOTHING_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 7, label: '7-Day SMA' },
  { value: 14, label: '14-Day SMA' },
  { value: 28, label: '28-Day SMA' },
  { value: 90, label: '90-Day SMA' },
];

export const OVERLAY_NONE = 'NONE';

export function getOverlaySeriesOptions(excludeIds = []) {
  const excluded = new Set(excludeIds);
  const groups = [
    {
      label: 'Crypto',
      options: Object.entries(availableCryptoSeries)
        .filter(([id]) => !excluded.has(id))
        .map(([id, info]) => ({ id, label: info.label, type: 'crypto' })),
    },
    {
      label: 'Macro',
      options: Object.entries(availableMacroSeries)
        .filter(([id]) => !excluded.has(id))
        .map(([id, info]) => ({ id, label: info.label, type: 'macro' })),
    },
    {
      label: 'Indicators',
      options: Object.entries(availableIndicatorSeries)
        .filter(([id]) => !excluded.has(id))
        .map(([id, info]) => ({ id, label: info.label, type: 'indicator' })),
    },
  ];
  return groups.filter((group) => group.options.length > 0);
}

export function getSeriesMeta(seriesId) {
  if (availableMacroSeries[seriesId]) {
    return { ...availableMacroSeries[seriesId], type: 'macro' };
  }
  if (availableCryptoSeries[seriesId]) {
    return { ...availableCryptoSeries[seriesId], type: 'crypto' };
  }
  if (availableIndicatorSeries[seriesId]) {
    return { ...availableIndicatorSeries[seriesId], type: 'indicator' };
  }
  return null;
}

export function normalizeTimePoint(time) {
  if (!time) return null;
  if (typeof time === 'string' && time.length <= 4) return `${time}-01-01`;
  return time;
}

export function cleanSeriesData(rawData, { scaleMode = 0, valueKey = 'value' } = {}) {
  if (!rawData || rawData.length === 0) return [];
  return rawData
    .map((item) => {
      const value = item[valueKey] ?? item.value;
      const time = normalizeTimePoint(item.time || item.date);
      return { time, value: value != null ? Number(value) : null };
    })
    .filter((item) => {
      if (item.value == null || Number.isNaN(item.value)) return false;
      if (scaleMode === 1 && item.value <= 0) return false;
      if (!item.time) return false;
      return true;
    })
    .sort((a, b) => new Date(a.time) - new Date(b.time));
}

export function applySmoothing(data, period) {
  if (!data || data.length === 0 || !period || period <= 1) return data;
  if (data.length < period) return data;

  const smoothed = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].value;
    }
    smoothed.push({ time: data[i].time, value: sum / period });
  }
  return smoothed;
}

export function filterOverlayFromPrimary(overlayData, primaryData) {
  if (!overlayData.length || !primaryData.length) return overlayData;
  const minTime = new Date(primaryData[0].time).getTime();
  return overlayData.filter((item) => new Date(item.time).getTime() >= minTime);
}

export function defaultOverlayFormatter(seriesId, value) {
  if (value == null || Number.isNaN(value)) return 'N/A';
  const meta = getSeriesMeta(seriesId);
  if (!meta) return value.toLocaleString();

  if (meta.type === 'crypto') {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  if (meta.type === 'indicator') {
    if (seriesId.includes('DOMINANCE') || seriesId === 'FEAR_GREED' || seriesId === 'ALT_SEASON_INDEX') {
      return `${value.toFixed(1)}`;
    }
    if (seriesId.includes('RISK')) {
      return value.toFixed(2);
    }
    if (seriesId === 'TOTAL_MARKET_CAP') {
      return value.toLocaleString();
    }
  }
  if (meta.type === 'macro') {
    if (['UNRATE', 'DFF', 'DGS10', 'T10Y2Y', 'T5YIE', 'TEDRATE', 'IRLTLT01DEM156N', 'A191RL1Q225SBEA', 'INFLATION', 'INTEREST', 'UNEMPLOYMENT'].includes(seriesId)) {
      return `${value.toFixed(2)}%`;
    }
    if (seriesId === 'DCOILWTICO') {
      return `$${value.toFixed(2)}`;
    }
    if (['DEXUSEU', 'DEXUSUK', 'DEXCAUS'].includes(seriesId)) {
      return value.toFixed(4);
    }
    if (seriesId === 'DEXJPUS') {
      return value.toFixed(2);
    }
    if (seriesId === 'VIXCLS') {
      return value.toFixed(2);
    }
  }
  return value.toLocaleString();
}

export function getOverlaySeriesLabel(seriesId) {
  if (seriesId === OVERLAY_NONE) return 'None';
  return getSeriesMeta(seriesId)?.label || seriesId;
}