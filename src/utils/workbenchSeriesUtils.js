import { calculateRiskMetric } from '../utility/riskMetric';
import {
  computeMarketHeatPipeline,
  TX_MVRV_SMOOTHING,
} from '../utility/marketHeatUtils';
import { calculateRunningRoiRiskSeries } from '../utility/runningRoiUtils';

export function extractNestedSeries(payload, seriesField = 'series') {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return payload[seriesField] || [];
}

export function resolveIndicatorRawData(info, dataContext) {
  if (!info || !dataContext) return [];

  if (info.computed === 'btcRisk') {
    const btc = dataContext.btcData || [];
    return btc.length ? calculateRiskMetric(btc) : [];
  }

  if (info.computed === 'marketHeat') {
    const { plottedData } = computeMarketHeatPipeline({
      btcData: dataContext.btcData || [],
      mvrvData: dataContext.mvrvData || [],
      fearAndGreedData: dataContext.fearAndGreedData || [],
      altcoinSeasonTimeseriesData: dataContext.altcoinSeasonTimeseriesData || [],
      txMvrvRatioDataBySmoothing: dataContext.txMvrvRatioDataBySmoothing || {},
      smaPeriod: info.marketHeatSmaPeriod || '28d',
      stretchToFullRange: false,
      txMvrvSmoothing: info.txMvrvSmoothing || TX_MVRV_SMOOTHING,
    });
    return plottedData || [];
  }

  if (info.computed === 'runningRoiRisk') {
    const btc = dataContext.btcData || [];
    return btc.length ? calculateRunningRoiRiskSeries(btc) : [];
  }

  if (info.nestedKey && info.dataKey) {
    const container = dataContext[info.dataKey];
    const payload = container?.[info.nestedKey];
    return extractNestedSeries(payload, info.seriesField);
  }

  if (info.seriesField && info.dataKey) {
    const payload = dataContext[info.dataKey];
    return extractNestedSeries(payload, info.seriesField);
  }

  return dataContext?.[info.dataKey] || [];
}

export function isIndicatorDataLoaded(info, dataContext) {
  const data = resolveIndicatorRawData(info, dataContext);
  return Array.isArray(data) && data.length > 0;
}

export async function fetchIndicatorDependencies(info, dataContext) {
  if (!info || !dataContext) return;

  const fetches = [];

  const queue = (fn, ...args) => {
    if (typeof fn === 'function') {
      fetches.push(fn(...args));
    }
  };

  if (info.computed === 'btcRisk' || info.computed === 'runningRoiRisk') {
    queue(dataContext.fetchBtcData);
    return Promise.all(fetches);
  }

  if (info.computed === 'marketHeat') {
    queue(dataContext.fetchBtcData);
    queue(dataContext.fetchMvrvData);
    queue(dataContext.fetchFearAndGreedData);
    queue(dataContext.fetchAltcoinSeasonTimeseriesData);
    queue(
      dataContext.fetchTxMvrvRatioData,
      info.txMvrvSmoothing || TX_MVRV_SMOOTHING,
    );
    return Promise.all(fetches);
  }

  if (info.fetchFunction) {
    const fn = dataContext[info.fetchFunction];
    if (info.fetchArgs?.length) {
      queue(fn, ...info.fetchArgs);
    } else {
      queue(fn);
    }
  }

  return Promise.all(fetches);
}