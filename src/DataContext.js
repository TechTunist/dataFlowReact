// src/DataContext.js
import React, { createContext, useState, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { initDB, cacheData, getCachedData, clearCache, isCacheFresh, getFreshCachedData, DEFAULT_CACHE_TTL, pruneOldCache } from './utility/idbUtils';
import {
  detectTimeSeriesIntegrityIssues,
  resolveCachedLatestDate,
  resolveCachedSeriesPoints,
  shouldInvalidateDailyCache,
} from './utility/cacheIntegrity';
import { apiUrl } from './config/api';
import logger from './utils/logger';
import {
  initializeDataService,
  getBtcPriceSeries,
  getEthPriceSeries,
  getMvrvSeries,
  getMarketCapSeries,
  getDominanceSeries,
  getAltcoinPriceSeries,
  getFearAndGreedSeries,
  getLatestFearAndGreed,
  getDifferenceSeries,
  getTotal2Series,
  getTotal3Series,
  getSp500DivUnrateSeries,
  getAltcoinSeasonSeries,
  getAltcoinSeasonTimeseriesSeries,
  getMacroDataSeries,
  getInflationSeries,
  getInitialClaimsSeries,
  getInterestSeries,
  getUnemploymentSeries,
  getFedBalanceSeries,
  getTxCountSeries,
  getTxCountCombinedSeries,
  getTxMvrvSeries,
  getTxMvrvRatioSeries,
  getFloorEchoSeries,
  getRiskSeries,
  getFredSeries,
  loadOnchainMetrics,
  loadBtcYieldRecessionIndicator,
  enrichTxMvrvDataset as enrichTxMvrvDatasetFromService,
  RISK_METRIC_CACHE,
} from './data'; // Data layer — fetch bodies delegate here
import { waitForPreloadIfNeeded } from './utils/waitForPreloadIfNeeded'; // Phase 1: extracted preload guard helper
import { getAuthHeaders } from './utils/clerkAuth';
import { isPremiumCacheId } from './utils/premiumCache';
import { canUsePremiumCache, notifySubscriptionRequired } from './utils/subscriptionRevocation';
import { calendarTodayISO } from './utils/stockQuoteDate';
import { effectiveDailyReferenceDate } from './utils/dailyReferenceDate';

export const DataContext = createContext();

/**
 * Stable fetch/refresh actions only. Prefer this when a component only triggers loads
 * and should not re-render when unrelated series data updates.
 * Full useData() remains the primary API (data + actions, backward compatible).
 */
export const DataActionsContext = createContext({});

/**
 * Centralized per-cacheId freshness policy.
 * Primary mechanism: TTL (avoids the old "always re-hit on day rollover or lagged data" problem).
 * useDateCheck kept as a *strong* hit booster for daily series (if we literally have a point dated today, serve it even if entry ts is old).
 * This is the core of making IndexedDB actually prevent unnecessary API/DB roundtrips.
 */
const CACHE_CONFIG = {
  // Core daily series (prices, dominance, mcap, tx etc): 6h TTL is plenty; dateCheck as booster
  btcData: { ttl: 6 * 60 * 60 * 1000, useDateCheck: true },
  mvrvData: { ttl: 12 * 60 * 60 * 1000, useDateCheck: false }, // was using 7d in delegation; longer TTL + no strict date is better
  ethData: { ttl: 6 * 60 * 60 * 1000, useDateCheck: true },
  dominanceData: { ttl: 6 * 60 * 60 * 1000, useDateCheck: true },
  marketCapData: { ttl: 6 * 60 * 60 * 1000, useDateCheck: true },
  differenceData: { ttl: 6 * 60 * 60 * 1000, useDateCheck: true },
  total2Data: { ttl: 6 * 60 * 60 * 1000, useDateCheck: true },
  total3Data: { ttl: 6 * 60 * 60 * 1000, useDateCheck: true },
  txCountData: { ttl: 6 * 60 * 60 * 1000, useDateCheck: true },
  txCountCombinedData: { ttl: 6 * 60 * 60 * 1000, useDateCheck: true },
  txMvrvData: { ttl: 6 * 60 * 60 * 1000, useDateCheck: true },
  txMvrvData_v2: { ttl: 6 * 60 * 60 * 1000, useDateCheck: true },
  altcoinData_SOL: { ttl: 6 * 60 * 60 * 1000, useDateCheck: true }, // example; dynamic ones use default
  // Macro / slower: longer
  macroData: { ttl: 12 * 60 * 60 * 1000, useDateCheck: false },
  inflationData: { ttl: 24 * 60 * 60 * 1000, useDateCheck: false },
  initialClaimsData: { ttl: 12 * 60 * 60 * 1000, useDateCheck: false },
  interestData: { ttl: 12 * 60 * 60 * 1000, useDateCheck: false },
  unemploymentData: { ttl: 24 * 60 * 60 * 1000, useDateCheck: false },
  fedBalanceData: { ttl: 24 * 60 * 60 * 1000, useDateCheck: false },
  // Sentiment / faster moving
  fearAndGreedData: { ttl: 4 * 60 * 60 * 1000, useDateCheck: false },
  latestFearAndGreed: { ttl: 60 * 60 * 1000, useDateCheck: false },
  // Risk / onchain (heavy; cache hard)
  mvrvRiskData: { ttl: 24 * 60 * 60 * 1000, useDateCheck: false },
  puellRiskData: { ttl: 24 * 60 * 60 * 1000, useDateCheck: false },
  minerCapThermoCapRiskData: { ttl: 24 * 60 * 60 * 1000, useDateCheck: false },
  feeRiskData: { ttl: 24 * 60 * 60 * 1000, useDateCheck: false },
  soplRiskData: { ttl: 24 * 60 * 60 * 1000, useDateCheck: false },
  floorEchoData: { ttl: 6 * 60 * 60 * 1000, useDateCheck: true },
  onchainMetricsData: { ttl: 12 * 60 * 60 * 1000, useDateCheck: false },

  // Others
  altcoinSeasonData: { ttl: 6 * 60 * 60 * 1000, useDateCheck: true },
  altcoinSeasonTimeseriesData: { ttl: 6 * 60 * 60 * 1000, useDateCheck: true },
  sp500DivUnrateData: { ttl: 24 * 60 * 60 * 1000, useDateCheck: true },
  // FRED etc: long
  'fredSeriesData_SP500': { ttl: 24 * 60 * 60 * 1000, useDateCheck: false },
  // Default for anything not listed (including dynamic altcoin_* and fred_*)
  _default: { ttl: DEFAULT_CACHE_TTL, useDateCheck: false },
};

function getCacheConfig(cacheId) {
  // Support dynamic like fredSeriesData_XXX or altcoinData_XXX
  if (CACHE_CONFIG[cacheId]) return CACHE_CONFIG[cacheId];
  if (cacheId && cacheId.startsWith('fredSeriesData_')) return CACHE_CONFIG['fredSeriesData_SP500'] || CACHE_CONFIG._default;
  if (cacheId && cacheId.startsWith('altcoinData_')) return { ttl: 6 * 60 * 60 * 1000, useDateCheck: true };
  if (cacheId && (cacheId.startsWith('txMvrvRatioData_v2_') || cacheId.startsWith('txMvrvRatioData_'))) {
    return { ttl: 6 * 60 * 60 * 1000, useDateCheck: true };
  }
  if (cacheId && cacheId.startsWith('fredSeriesData_')) return { ttl: 24 * 60 * 60 * 1000, useDateCheck: false };
  return CACHE_CONFIG._default;
}

// Simple module-level inflight guard (Phase 4) to reduce duplicate concurrent nets for the same cacheId
// (complements the per-render isFetched guards which can have closure/timing races).
const inflightFetches = new Set();

/**
 * Phase 2 helper: Background refresh for stale-while-revalidate pattern.
 * Fetches fresh data and updates state + cache without blocking the UI.
 */
const fetchFreshAndUpdate = async ({
  cacheId,
  apiUrl,
  formatData,
  setData,
  setLastUpdated,
  setIsFetched,
  currentTimestamp,
}) => {
  try {
    // Use centralized auth helper (robust retries + waits inside). This ensures
    // authenticated requests succeed so cacheData can populate IndexedDB for all
    // paths (including those reaching bg reval).
    const headers = await getAuthHeaders({ maxRetries: 2, delayMs: 300 });

    const response = await fetch(apiUrl, { headers });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        logger.warn(`[Auth] Background refresh got ${response.status} on ${cacheId}`);
        if (response.status === 403) {
          notifySubscriptionRequired();
        }
        return; // graceful, use whatever is in state/cache
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const formattedData = formatData(data);
    const isArray = Array.isArray(formattedData);
    const latestFetchedDate = isArray && formattedData.length > 0
      ? formattedData[formattedData.length - 1].time
      : formattedData.time || null;

    setData(formattedData);
    if (latestFetchedDate && setLastUpdated) {
      const displayDate = cacheId === 'btcData'
        ? effectiveDailyReferenceDate(latestFetchedDate)
        : latestFetchedDate;
      setLastUpdated(displayDate);
    }
    await cacheData(cacheId, formattedData, currentTimestamp || Date.now());
  } catch (err) {
    logger.error(`Background refresh error for ${cacheId}`, err);
  }
};

const fetchWithCache = async ({
  cacheId,
  apiUrl,
  formatData,
  setData,
  setLastUpdated,
  setIsFetched,
  cacheDuration, // now ignored in favor of CACHE_CONFIG (Phase 3 fix)
  useDateCheck,  // now merged from config
  staleWhileRevalidate = true,
}) => {
  if (typeof indexedDB === 'undefined') {
    return false;
  }

  const cfg = getCacheConfig(cacheId);
  const effectiveTTL = cacheDuration || cfg.ttl || DEFAULT_CACHE_TTL;
  const effectiveUseDateCheck = (typeof useDateCheck === 'boolean') ? useDateCheck : cfg.useDateCheck;

  try {
    if (inflightFetches.has(cacheId)) {
      // Another caller (or preload vs chart) is already fetching this; let it finish + populate cache/state.
      return true;
    }
    inflightFetches.add(cacheId);

    setIsFetched(true);
    const currentDate = calendarTodayISO();
    const currentTimestamp = Date.now();

    const cached = await getCachedData(cacheId);
    const premiumCacheBlocked = isPremiumCacheId(cacheId) && !canUsePremiumCache();

    if (cached && cached.data && !premiumCacheBlocked) {
      let cachedData = Array.isArray(cached.data) ? cached.data : [cached.data];
      if (cachedData.length > 0) {
        cachedData = [...cachedData].sort((a, b) => {
          const timeA = new Date(a.time).getTime();
          const timeB = new Date(b.time).getTime();
          return timeA - timeB;
        });

        const firstRecord = cachedData[0];
        const lastRecord = cachedData[cachedData.length - 1];
        let firstCachedDate = firstRecord.time;
        let latestCachedDate = lastRecord.time;

        if (!latestCachedDate && lastRecord.timestamp) {
          latestCachedDate = new Date(parseInt(lastRecord.timestamp, 10) * 1000).toISOString().split('T')[0];
        }
        if (!firstCachedDate && firstRecord.timestamp) {
          firstCachedDate = new Date(parseInt(firstRecord.timestamp, 10) * 1000).toISOString().split('T')[0];
        }
        latestCachedDate = resolveCachedLatestDate(cacheId, cached.data, latestCachedDate);

        // Phase 3: TTL is now primary (via getFreshCachedData + isCacheFresh).
        // useDateCheck (from config or caller) acts as a *strong* early hit if we literally cover "today".
        // This + longer/consistent TTLs stops the "re-hit API every load or every new day" behavior.
        let shouldReuseCache = false;
        // Always prefer a fresh-by-TTL check first (prevents unnecessary bg nets for lagged dailies)
        if (isCacheFresh(cached, effectiveTTL)) {
          shouldReuseCache = true;
        } else if (effectiveUseDateCheck && latestCachedDate && latestCachedDate >= currentDate) {
          // Strong date booster: even if entry ts old, if data includes today we treat as fresh
          shouldReuseCache = true;
        }

        // Address data freshness on sprint: for useDateCheck series (core dailies), if cached latest < today,
        // force a fresh fetch instead of serving stale "yesterday" data (even if within TTL).
        // This makes sprint branch behave like main deployment for current-day data visibility.
        if (effectiveUseDateCheck && latestCachedDate && latestCachedDate < currentDate) {
          shouldReuseCache = false;
        }

        // Gaps or long flat runs in the middle of the series (e.g. Polygon Oct–Jun corruption).
        // Latest date alone is not enough, invalidate and refetch without clearing IDB manually.
        if (shouldReuseCache && shouldInvalidateDailyCache(cachedData, effectiveUseDateCheck, cacheId)) {
          const integrity = detectTimeSeriesIntegrityIssues(
            resolveCachedSeriesPoints(cacheId, cached.data),
            { daily: true },
          );
          logger.log(`[Cache] INTEGRITY miss for ${cacheId}: ${integrity.reasons.join(', ')}`);
          shouldReuseCache = false;
        }

        if (shouldReuseCache) {
          logger.log(`[Cache] HIT (fresh) for ${cacheId}`);
          setData(Array.isArray(cached.data) ? cachedData : cached.data);
          if (setLastUpdated) {
            const displayDate = cacheId === 'btcData'
              ? effectiveDailyReferenceDate(latestCachedDate)
              : latestCachedDate;
            setLastUpdated(displayDate);
          }
          return true;
        }

        // Stale-while-revalidate: serve instantly, but only bg-revalidate if the *entry* is older than half TTL
        // (reduces pointless re-fetches compared to always-reval on any !date-hit).
        // Skip serving corrupt/incomplete series, force a blocking refetch instead.
        const cacheIntegrityBad = shouldInvalidateDailyCache(
          Array.isArray(cached.data) ? cachedData : cached.data,
          effectiveUseDateCheck,
          cacheId,
        );
        if (staleWhileRevalidate && cached && cached.data && !cacheIntegrityBad) {
          const shouldRevalidate = !isCacheFresh(cached, Math.floor(effectiveTTL / 2));
          logger.log(`[Cache] HIT (stale, revalidating in background) for ${cacheId}`);
          setData(Array.isArray(cached.data) ? cachedData : cached.data);
          if (setLastUpdated) {
            const displayDate = cacheId === 'btcData'
              ? effectiveDailyReferenceDate(latestCachedDate)
              : latestCachedDate;
            setLastUpdated(displayDate);
          }
          if (shouldRevalidate) {
            fetchFreshAndUpdate({
              cacheId,
              apiUrl,
              formatData,
              setData,
              setLastUpdated,
              setIsFetched,
              currentTimestamp,
            }).catch(err => logger.error(`Background refresh failed for ${cacheId}`, err));
          }
          return true;
        }
      }
    }

    const maxRetries = 2;
    let attempts = 0;
    let response;

    // Attach Clerk JWT via centralized helper (robust + retries inside).
    // Critical for protected endpoints so that successful fetches reach cacheData
    // and populate IndexedDB (the root cause of the "always hit API" bug).
    const headers = await getAuthHeaders({ maxRetries: 2, delayMs: 350 });

    while (attempts < maxRetries) {
      try {
        response = await fetch(apiUrl, { headers });
        if (response.ok) break;
        if (response.status === 401 || response.status === 403) {
          // 401/403 can happen for:
          // - token not ready yet (Clerk session / getAuthHeaders race on initial load)
          // - dev without bypass
          // - free-tier user hitting a premium-only endpoint (e.g. mvrv, altcoin-season, sp500-div-unrate when MarketOverview or other paid pages are involved)
          // The backend PremiumDataGateMiddleware returns 403 with code 'subscription_required' for the latter.
          // We treat them as non-retriable here; callers (esp. preload vs on-demand premium components) should handle gracefully.
          logger.warn(`[Auth] ${response.status} on ${apiUrl}, token not yet available, dev bypass inactive, or subscription gate (free user on premium data)`);
          if (response.status === 403) {
            notifySubscriptionRequired();
          }
          // Do not retry auth/subscription errors aggressively; let caller use cache or fail gracefully
          throw new Error(`HTTP ${response.status} (auth)`);
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      } catch (err) {
        attempts++;
        // console.warn(`Attempt ${attempts} failed for ${apiUrl}:`, err);
        if (attempts === maxRetries) throw err;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const data = await response.json();
    const formattedData = formatData(data);
    const isArray = Array.isArray(formattedData);
    const latestFetchedDate = isArray && formattedData.length > 0 
      ? formattedData[formattedData.length - 1].time 
      : formattedData.time || null;

    if (latestFetchedDate && cached && cached.data) {
      const cachedArr = Array.isArray(cached.data) ? cached.data : [cached.data];
      const sortedCachedData = [...cachedArr].sort((a, b) => new Date(a.time) - new Date(b.time));
      const latestCachedDate = sortedCachedData[sortedCachedData.length - 1]?.time;
      const cachedIntegrityBad = shouldInvalidateDailyCache(sortedCachedData, effectiveUseDateCheck);
      const freshIsShorter = isArray && formattedData.length < sortedCachedData.length;
      // Do not keep IDB copy when API has newer/better series (fixes gap repair without manual cache clear).
      if (
        !cachedIntegrityBad &&
        !freshIsShorter &&
        latestCachedDate &&
        latestFetchedDate <= latestCachedDate
      ) {
        setData(Array.isArray(cached.data) ? cachedArr : cached.data);
        if (setLastUpdated) {
          const displayDate = cacheId === 'btcData'
            ? effectiveDailyReferenceDate(latestCachedDate)
            : latestCachedDate;
          setLastUpdated(displayDate);
        }
        await cacheData(cacheId, cached.data, currentTimestamp);
        return true;
      }
    }

    setData(formattedData);
    if (latestFetchedDate && setLastUpdated) {
      const displayDate = cacheId === 'btcData'
        ? effectiveDailyReferenceDate(latestFetchedDate)
        : latestFetchedDate;
      setLastUpdated(displayDate);
    }
    await cacheData(cacheId, formattedData, currentTimestamp);
    logger.log(`[Cache] MISS (fetched fresh) for ${cacheId}`);
    return true;
  } catch (error) {
    // console.error(`Error fetching or caching data for ${cacheId}:`, error);
    setIsFetched(false);
    return false;
  } finally {
    inflightFetches.delete(cacheId);
  }
};

const refreshData = async ({
  cacheId,
  setData,
  setIsFetched,
  fetchFunction,
}) => {
  try {
    await clearCache(cacheId);
    setIsFetched(false);
    setData([]);
    await fetchFunction();
  } catch (error) {
    // console.error(`Error refreshing data for ${cacheId}:`, error);
  }
};

export const DataProvider = ({ children }) => {
  const [preloadComplete, setPreloadComplete] = useState(false);
  const [btcData, setBtcData] = useState([]);
  const [fedBalanceData, setFedBalanceData] = useState([]);
  const [mvrvData, setMvrvData] = useState([]);
  const [btcLastUpdated, setBtcLastUpdated] = useState(null);
  const [fedLastUpdated, setFedLastUpdated] = useState(null);
  const [mvrvLastUpdated, setMvrvLastUpdated] = useState(null);
  const [isBtcDataFetched, setIsBtcDataFetched] = useState(false);
  const [isFedBalanceDataFetched, setIsFedBalanceDataFetched] = useState(false);
  const [isMvrvDataFetched, setIsMvrvDataFetched] = useState(false);
  const [dominanceData, setDominanceData] = useState([]);
  const [dominanceLastUpdated, setDominanceLastUpdated] = useState(null);
  const [isDominanceDataFetched, setIsDominanceDataFetched] = useState(false);
  const [ethData, setEthData] = useState([]);
  const [isEthDataFetched, setIsEthDataFetched] = useState(false);
  const [ethLastUpdated, setEthLastUpdated] = useState(null);
  const [fearAndGreedData, setFearAndGreedData] = useState([]);
  const [isFearAndGreedDataFetched, setIsFearAndGreedDataFetched] = useState(false);
  const [fearAndGreedLastUpdated, setFearAndGreedLastUpdated] = useState(null);
  const [marketCapData, setMarketCapData] = useState([]);
  const [isMarketCapDataFetched, setIsMarketCapDataFetched] = useState(false);
  const [marketCapLastUpdated, setMarketCapLastUpdated] = useState(null);
  const [macroData, setMacroData] = useState([]);
  const [isMacroDataFetched, setIsMacroDataFetched] = useState(false);
  const [macroLastUpdated, setMacroLastUpdated] = useState(null);
  const [inflationData, setInflationData] = useState([]);
  const [isInflationDataFetched, setIsInflationDataFetched] = useState(false);
  const [inflationLastUpdated, setInflationLastUpdated] = useState(null);
  const [initialClaimsData, setInitialClaimsData] = useState([]);
  const [isInitialClaimsDataFetched, setIsInitialClaimsDataFetched] = useState(false);
  const [initialClaimsLastUpdated, setInitialClaimsLastUpdated] = useState(null);
  const [interestData, setInterestData] = useState([]);
  const [isInterestDataFetched, setIsInterestDataFetched] = useState(false);
  const [interestLastUpdated, setInterestLastUpdated] = useState(null);
  const [unemploymentData, setUnemploymentData] = useState([]);
  const [isUnemploymentDataFetched, setIsUnemploymentDataFetched] = useState(false);
  const [unemploymentLastUpdated, setUnemploymentLastUpdated] = useState(null);
  const [txCountData, setTxCountData] = useState([]);
  const [isTxCountDataFetched, setIsTxCountDataFetched] = useState(false);
  const [txCountLastUpdated, setTxCountLastUpdated] = useState(null);
  const [txCountCombinedData, setTxCountCombinedData] = useState([]);
  const [isTxCountCombinedDataFetched, setIsTxCountCombinedDataFetched] = useState(false);
  const [txCountCombinedLastUpdated, setTxCountCombinedLastUpdated] = useState(null);
  const [txMvrvData, setTxMvrvData] = useState([]);
  const [isTxMvrvDataFetched, setIsTxMvrvDataFetched] = useState(false);
  const [txMvrvLastUpdated, setTxMvrvLastUpdated] = useState(null);
  const [txMvrvRatioDataBySmoothing, setTxMvrvRatioDataBySmoothing] = useState({});
  const [isTxMvrvRatioDataFetched, setIsTxMvrvRatioDataFetched] = useState({});
  const [txMvrvRatioLastUpdated, setTxMvrvRatioLastUpdated] = useState({});
  const [floorEchoData, setFloorEchoData] = useState(null);
  const [isFloorEchoDataFetched, setIsFloorEchoDataFetched] = useState(false);
  const [floorEchoLastUpdated, setFloorEchoLastUpdated] = useState(null);
  const [fredSeriesData, setFredSeriesData] = useState({});
  const [altcoinData, setAltcoinData] = useState({});
  const [altcoinLastUpdated, setAltcoinLastUpdated] = useState({});
  const [isAltcoinDataFetched, setIsAltcoinDataFetched] = useState({});
  const [indicatorData, setIndicatorData] = useState({});
  const [isIndicatorDataFetched, setIsIndicatorDataFetched] = useState({});
  const [latestFearAndGreed, setLatestFearAndGreed] = useState(null);
  const [isLatestFearAndGreedFetched, setIsLatestFearAndGreedFetched] = useState(false);
  const [latestFearAndGreedLastUpdated, setLatestFearAndGreedLastUpdated] = useState(null);
  const [altcoinSeasonData, setAltcoinSeasonData] = useState({});
  const [isAltcoinSeasonDataFetched, setIsAltcoinSeasonDataFetched] = useState(false);
  const [altcoinSeasonLastUpdated, setAltcoinSeasonLastUpdated] = useState(null);
  const [onchainMetricsData, setOnchainMetricsData] = useState([]);
  const [isOnchainMetricsDataFetched, setIsOnchainMetricsDataFetched] = useState(false);
  const [onchainMetricsLastUpdated, setOnchainMetricsLastUpdated] = useState(null);
  const [onchainFetchError, setOnchainFetchError] = useState(null);
  const [mvrvRiskData, setMvrvRiskData] = useState([]);
  const [puellRiskData, setPuellRiskData] = useState([]);
  const [minerCapThermoCapRiskData, setMinerCapThermoCapRiskData] = useState([]);
  const [isMvrvRiskDataFetched, setIsMvrvRiskDataFetched] = useState(false);
  const [isPuellRiskDataFetched, setIsPuellRiskDataFetched] = useState(false);
  const [isMinerCapThermoCapRiskDataFetched, setIsMinerCapThermoCapRiskDataFetched] = useState(false);
  const [mvrvRiskLastUpdated, setMvrvRiskLastUpdated] = useState(null);
  const [puellRiskLastUpdated, setPuellRiskLastUpdated] = useState(null);
  const [minerCapThermoCapRiskLastUpdated, setMinerCapThermoCapRiskLastUpdated] = useState(null);
  const [capRealData, setCapRealData] = useState([]);
  const [revAllTimeData, setRevAllTimeData] = useState([]);

  const [feeRiskData, setFeeRiskData] = useState([]); // New state for fee_risk
  const [soplRiskData, setSoplRiskData] = useState([]); // New state for sopl_risk
  const [isFeeRiskDataFetched, setIsFeeRiskDataFetched] = useState(false); // New fetch status
  const [isSoplRiskDataFetched, setIsSoplRiskDataFetched] = useState(false); // New fetch status
  const [feeRiskLastUpdated, setFeeRiskLastUpdated] = useState(null); // New last updated
  const [soplRiskLastUpdated, setSoplRiskLastUpdated] = useState(null); // New last updated

  const [altcoinSeasonTimeseriesData, setAltcoinSeasonTimeseriesData] = useState([]);
  const [isAltcoinSeasonTimeseriesDataFetched, setIsAltcoinSeasonTimeseriesDataFetched] = useState(false);
  const [altcoinSeasonTimeseriesLastUpdated, setAltcoinSeasonTimeseriesLastUpdated] = useState(null);

  const [differenceData, setDifferenceData] = useState([]); // New state for difference data
  const [isDifferenceDataFetched, setIsDifferenceDataFetched] = useState(false); // New fetch status
  const [differenceLastUpdated, setDifferenceLastUpdated] = useState(null);

  const [total2Data, setTotal2Data] = useState([]);
  const [isTotal2DataFetched, setIsTotal2DataFetched] = useState(false);
  const [total2LastUpdated, setTotal2LastUpdated] = useState(null);
  const [total3Data, setTotal3Data] = useState([]);
  const [isTotal3DataFetched, setIsTotal3DataFetched] = useState(false);
  const [total3LastUpdated, setTotal3LastUpdated] = useState(null);

  // SP500 / div-unrate (migrated from direct bypass in SP500DivUnrateChart to ensure IDB caching + auth)
  const [sp500DivUnrateData, setSp500DivUnrateData] = useState([]);
  const [isSp500DivUnrateDataFetched, setIsSp500DivUnrateDataFetched] = useState(false);
  const [sp500DivUnrateLastUpdated, setSp500DivUnrateLastUpdated] = useState(null);

  // Centralized in src/config/api.js - use apiUrl() helper below

  useEffect(() => {

    let isMounted = true;

    // === DATA PRELOAD STRATEGY (Phase 2 complete - final trim) ===
    // Extremely focused eager parallel preload (only the highest-value *free tier* core):
    //   - btcData, dominanceData, ethData
    //   - fearAndGreedData, marketCapData, latestFearAndGreed
    //
    // Premium datasets (mvrvData, altcoinSeason*, sp500-div-unrate-squared, onchain risk metrics,
    // workbench, most FRED, etc.) are demand-loaded only by their premium pages/components
    // (e.g. MarketOverview which is itself a paid-only view). This prevents 403 Forbidden
    // from the backend PremiumDataGateMiddleware for free users.
    //
    // The forced early fetchFredSeriesData('SP500') remains for dashboard needs.
    //
    // This is the result of many aggressive yet safe incremental cuts during the audit-remediation.
    // See commit history on refactor/audit-remediation.

    const preloadData = async () => {
      await initDB();

      // Phase 2: Occasional cache maintenance (non-blocking)
      pruneOldCache().catch(() => {});

      await fetchFredSeriesData('SP500');

      const cacheConfigs = [
        { id: 'btcData', setData: setBtcData, setLastUpdated: setBtcLastUpdated, setIsFetched: setIsBtcDataFetched, useDateCheck: true },
        { id: 'dominanceData', setData: setDominanceData, setLastUpdated: setDominanceLastUpdated, setIsFetched: setIsDominanceDataFetched, useDateCheck: true },
        { id: 'ethData', setData: setEthData, setLastUpdated: setEthLastUpdated, setIsFetched: setIsEthDataFetched, useDateCheck: true },
        { id: 'fearAndGreedData', setData: setFearAndGreedData, setLastUpdated: setFearAndGreedLastUpdated, setIsFetched: setIsFearAndGreedDataFetched, useDateCheck: false, ttl: 4 * 60 * 60 * 1000 }, // Phase 2: 4h TTL (sentiment changes reasonably fast)
        { id: 'marketCapData', setData: setMarketCapData, setLastUpdated: setMarketCapLastUpdated, setIsFetched: setIsMarketCapDataFetched, useDateCheck: true },
        { id: 'latestFearAndGreed', setData: setLatestFearAndGreed, setLastUpdated: setLatestFearAndGreedLastUpdated, setIsFetched: setIsLatestFearAndGreedFetched, useDateCheck: false, ttl: 60 * 60 * 1000 }, // Phase 2: shorter TTL for volatile "latest" data (1 hour)
        // === AUDIT REMEDIATION (Phase 2 - final core trim) ===
        // mvrvData (and other premium datasets like altcoinSeason, sp500 div-unrate) moved to demand-loaded only.
        // They are used exclusively by premium pages (e.g. MarketOverview) and would cause 403s for free-tier users.
        // The three total market cap variants (difference, total2, total3) are also demand-loaded.
        // Current eager preload is now extremely focused on the highest-value *free-tier* core datasets.
      ];

      // Fetch all data in parallel
      const fetchPromises = cacheConfigs.map(async ({ id, setData, setLastUpdated, setIsFetched }) => {
        try {
          const cfg = getCacheConfig(id);
          const effectiveTTL = cfg.ttl || DEFAULT_CACHE_TTL;
          const effectiveUseDateCheck = cfg.useDateCheck;
          const freshCached = await getFreshCachedData(id, effectiveTTL);

          if (freshCached && freshCached.data) {
            const sortedCachedData = [...freshCached.data].sort((a, b) => new Date(a.time) - new Date(b.time));
            const latestCachedDate = sortedCachedData[sortedCachedData.length - 1].time;
            const currentDate = calendarTodayISO();

            // Phase 3: same unified rule as fetchWithCache (TTL primary + date booster)
            let shouldReuseCache = false;
            if (isCacheFresh(freshCached, effectiveTTL)) {
              shouldReuseCache = true;
            } else if (effectiveUseDateCheck && latestCachedDate && latestCachedDate >= currentDate) {
              shouldReuseCache = true;
            }

            // Address data freshness on sprint: for useDateCheck series, if cached latest < today, force fetch.
            if (effectiveUseDateCheck && latestCachedDate && latestCachedDate < currentDate) {
              shouldReuseCache = false;
            }

            if (shouldReuseCache && shouldInvalidateDailyCache(sortedCachedData, effectiveUseDateCheck)) {
              shouldReuseCache = false;
            }

            if (shouldReuseCache) {
              if (isMounted) {
                setData(sortedCachedData);
                const displayDate = id === 'btcData'
                  ? effectiveDailyReferenceDate(latestCachedDate)
                  : latestCachedDate;
                setLastUpdated(displayDate);
                setIsFetched(true);
              }
              return;
            }
          }
          // Trigger fetch for non-cached or stale data
          const fetchFunc = {
            btcData: fetchBtcData,
            dominanceData: fetchDominanceData,
            ethData: fetchEthData,
            fearAndGreedData: fetchFearAndGreedData,
            marketCapData: fetchMarketCapData,
            latestFearAndGreed: fetchLatestFearAndGreed,
            // Phase 2 note: mvrvData + other premium (altcoin season, sp500 etc.) now purely demand-loaded
            // to avoid 403s for free-tier users (those endpoints are not in FREE_TIER_API_PREFIXES).
          }[id];
          if (fetchFunc && isMounted) await fetchFunc();
        } catch (error) {
          // onchainMetricsData is no longer eagerly preloaded; on-demand charts handle their own errors.
          if (id === 'onchainMetricsData' && isMounted) setOnchainFetchError(error.message);
        }
      });

      await Promise.all(fetchPromises);
      // Risk metrics are now fully demand-loaded (Phase 2), so no special post-preload fetch needed here.
      if (isMounted) setPreloadComplete(true);
    };

    preloadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchDifferenceData = useCallback(async () => {
    if (isDifferenceDataFetched) return;
    await getDifferenceSeries({
      setData: setDifferenceData,
      setLastUpdated: setDifferenceLastUpdated,
      setIsFetched: setIsDifferenceDataFetched,
      useDateCheck: true,
    });
  }, [isDifferenceDataFetched]);

  const refreshDifferenceData = useCallback(async () => {
    await refreshData({
      cacheId: 'differenceData',
      setData: setDifferenceData,
      setIsFetched: setIsDifferenceDataFetched,
      fetchFunction: fetchDifferenceData,
    });
  }, [fetchDifferenceData]);

  const fetchTotal2Data = useCallback(async () => {
    if (isTotal2DataFetched) return;
    await getTotal2Series({
      setData: setTotal2Data,
      setLastUpdated: setTotal2LastUpdated,
      setIsFetched: setIsTotal2DataFetched,
      useDateCheck: true,
    });
  }, [isTotal2DataFetched]);

  const refreshTotal2Data = useCallback(async () => {
    await refreshData({
      cacheId: 'total2Data',
      setData: setTotal2Data,
      setIsFetched: setIsTotal2DataFetched,
      fetchFunction: fetchTotal2Data,
    });
  }, [fetchTotal2Data]);

  const fetchTotal3Data = useCallback(async () => {
    if (isTotal3DataFetched) return;
    await getTotal3Series({
      setData: setTotal3Data,
      setLastUpdated: setTotal3LastUpdated,
      setIsFetched: setIsTotal3DataFetched,
      useDateCheck: true,
    });
  }, [isTotal3DataFetched]);

  const refreshTotal3Data = useCallback(async () => {
    await refreshData({
      cacheId: 'total3Data',
      setData: setTotal3Data,
      setIsFetched: setIsTotal3DataFetched,
      fetchFunction: fetchTotal3Data,
    });
  }, [fetchTotal3Data]);

  const fetchSp500DivUnrateData = useCallback(async () => {
    if (isSp500DivUnrateDataFetched) return;
    await getSp500DivUnrateSeries({
      setData: setSp500DivUnrateData,
      setLastUpdated: setSp500DivUnrateLastUpdated,
      setIsFetched: setIsSp500DivUnrateDataFetched,
      useDateCheck: true,
    });
  }, [isSp500DivUnrateDataFetched]);

  const refreshSp500DivUnrateData = useCallback(async () => {
    await refreshData({
      cacheId: 'sp500DivUnrateData',
      setData: setSp500DivUnrateData,
      setIsFetched: setIsSp500DivUnrateDataFetched,
      fetchFunction: fetchSp500DivUnrateData,
    });
  }, [fetchSp500DivUnrateData]);

    const fetchAltcoinSeasonTimeseriesData = useCallback(async () => {
      if (isAltcoinSeasonTimeseriesDataFetched) return;
      await getAltcoinSeasonTimeseriesSeries({
        setData: setAltcoinSeasonTimeseriesData,
        setLastUpdated: setAltcoinSeasonTimeseriesLastUpdated,
        setIsFetched: setIsAltcoinSeasonTimeseriesDataFetched,
        useDateCheck: true,
      });
    }, [isAltcoinSeasonTimeseriesDataFetched]);
  
    const refreshAltcoinSeasonTimeseriesData = useCallback(async () => {
      await refreshData({
        cacheId: 'altcoinSeasonTimeseriesData',
        setData: setAltcoinSeasonTimeseriesData,
        setIsFetched: setIsAltcoinSeasonTimeseriesDataFetched,
        fetchFunction: fetchAltcoinSeasonTimeseriesData,
      });
    }, [fetchAltcoinSeasonTimeseriesData]);

  const fetchBtcData = useCallback(async () => {
    if (isBtcDataFetched) return;

    // Phase 1: Use shared helper to avoid duplicate work during preload
    if (await waitForPreloadIfNeeded(preloadComplete, () => isBtcDataFetched)) {
      return;
    }

    // Delegated to DataService
    await getBtcPriceSeries({
      setData: setBtcData,
      setLastUpdated: setBtcLastUpdated,
      setIsFetched: setIsBtcDataFetched,
      useDateCheck: true,
    });
  }, [isBtcDataFetched, preloadComplete]);

  const refreshBtcData = useCallback(async () => {
    await refreshData({
      cacheId: 'btcData',
      setData: setBtcData,
      setIsFetched: setIsBtcDataFetched,
      fetchFunction: fetchBtcData,
    });
  }, [fetchBtcData]);

  const fetchLatestFearAndGreed = useCallback(async () => {
    // Volatile single-point: allow re-fetch; fetchWithCache still respects 1h TTL.
    if (await waitForPreloadIfNeeded(preloadComplete, () => isLatestFearAndGreedFetched)) {
      return;
    }
    await getLatestFearAndGreed({
      setData: setLatestFearAndGreed,
      setLastUpdated: setLatestFearAndGreedLastUpdated,
      setIsFetched: setIsLatestFearAndGreedFetched,
      useDateCheck: false,
    });
  }, [isLatestFearAndGreedFetched, preloadComplete]);

  const refreshLatestFearAndGreed = useCallback(async () => {
    await refreshData({
      cacheId: 'latestFearAndGreed',
      setData: setLatestFearAndGreed,
      setIsFetched: setIsLatestFearAndGreedFetched,
      fetchFunction: fetchLatestFearAndGreed,
    });
  }, [fetchLatestFearAndGreed]);

  const fetchOnchainMetricsData = useCallback(async () => {
    if (isOnchainMetricsDataFetched) return;
    setIsOnchainMetricsDataFetched(true);
    setOnchainFetchError(null);

    const result = await loadOnchainMetrics();
    if (result.ok) {
      setOnchainMetricsData(result.data);
      setOnchainMetricsLastUpdated(result.lastUpdated);
    } else {
      setIsOnchainMetricsDataFetched(false);
      setOnchainFetchError(result.error);
    }
  }, [isOnchainMetricsDataFetched]);

  const refreshOnchainMetricsData = useCallback(async () => {
    try {
      await clearCache('onchainMetricsData');
      setOnchainMetricsData([]);
      setIsOnchainMetricsDataFetched(false);
      await fetchOnchainMetricsData();
    } catch (error) {
      setOnchainFetchError(error.message);
    }
  }, [fetchOnchainMetricsData]);

  const fetchFedBalanceData = useCallback(async () => {
    if (isFedBalanceDataFetched) return;
    await getFedBalanceSeries({
      setData: setFedBalanceData,
      setLastUpdated: setFedLastUpdated,
      setIsFetched: setIsFedBalanceDataFetched,
      useDateCheck: false,
      cacheDuration: 7 * 24 * 60 * 60 * 1000,
    });
  }, [isFedBalanceDataFetched]);

  const refreshFedBalanceData = useCallback(async () => {
    await refreshData({
      cacheId: 'fedBalanceData',
      setData: setFedBalanceData,
      setIsFetched: setIsFedBalanceDataFetched,
      fetchFunction: fetchFedBalanceData,
    });
  }, [fetchFedBalanceData]);

  const fetchMvrvData = useCallback(async () => {
    if (isMvrvDataFetched) return;

    // Phase 1: Use shared helper to avoid duplicate work during preload
    if (await waitForPreloadIfNeeded(preloadComplete, () => isMvrvDataFetched)) {
      return;
    }

    // Delegated to DataService
    await getMvrvSeries({
      setData: setMvrvData,
      setLastUpdated: setMvrvLastUpdated,
      setIsFetched: setIsMvrvDataFetched,
      useDateCheck: false,
      cacheDuration: 7 * 24 * 60 * 60 * 1000,
    });
  }, [isMvrvDataFetched, preloadComplete]);

  const refreshMvrvData = useCallback(async () => {
    await refreshData({
      cacheId: 'mvrvData',
      setData: setMvrvData,
      setIsFetched: setIsMvrvDataFetched,
      fetchFunction: fetchMvrvData,
    });
  }, [fetchMvrvData]);

const fetchDominanceData = useCallback(async () => {
  if (isDominanceDataFetched) return;

  // Phase 1: Use shared helper to avoid duplicate work during preload
  if (await waitForPreloadIfNeeded(preloadComplete, () => isDominanceDataFetched)) {
    return;
  }

  // Delegated to DataService
  await getDominanceSeries({
    setData: setDominanceData,
    setLastUpdated: setDominanceLastUpdated,
    setIsFetched: setIsDominanceDataFetched,
    useDateCheck: true,
  });
}, [isDominanceDataFetched, preloadComplete]);

  const refreshDominanceData = useCallback(async () => {
    await refreshData({
      cacheId: 'dominanceData',
      setData: setDominanceData,
      setIsFetched: setIsDominanceDataFetched,
      fetchFunction: fetchDominanceData,
    });
  }, [fetchDominanceData]);

  const fetchEthData = useCallback(async () => {
    if (isEthDataFetched) return;

    // Phase 1: Use shared helper to avoid duplicate work during preload
    if (await waitForPreloadIfNeeded(preloadComplete, () => isEthDataFetched)) {
      return;
    }

    // Delegated to DataService
    await getEthPriceSeries({
      setData: setEthData,
      setLastUpdated: setEthLastUpdated,
      setIsFetched: setIsEthDataFetched,
      useDateCheck: true,
    });
  }, [isEthDataFetched, preloadComplete]);

  const refreshEthData = useCallback(async () => {
    await refreshData({
      cacheId: 'ethData',
      setData: setEthData,
      setIsFetched: setIsEthDataFetched,
      fetchFunction: fetchEthData,
    });
  }, [fetchEthData]);

  const fetchFearAndGreedData = useCallback(async () => {
    // Allow retry when a prior attempt left the series empty (e.g. race / failed preload).
    if (isFearAndGreedDataFetched && fearAndGreedData.length > 0) return;

    if (await waitForPreloadIfNeeded(preloadComplete, () => isFearAndGreedDataFetched && fearAndGreedData.length > 0)) {
      return;
    }
    await getFearAndGreedSeries({
      setData: setFearAndGreedData,
      setLastUpdated: setFearAndGreedLastUpdated,
      setIsFetched: setIsFearAndGreedDataFetched,
      // F&G often plateaus; match CACHE_CONFIG (useDateCheck: false).
      useDateCheck: false,
    });
  }, [isFearAndGreedDataFetched, fearAndGreedData.length, preloadComplete]);

  const refreshFearAndGreedData = useCallback(async () => {
    await refreshData({
      cacheId: 'fearAndGreedData',
      setData: setFearAndGreedData,
      setIsFetched: setIsFearAndGreedDataFetched,
      fetchFunction: fetchFearAndGreedData,
    });
  }, [fetchFearAndGreedData]);

  const fetchMarketCapData = useCallback(async () => {
    if (isMarketCapDataFetched) return;

    // Phase 1: Use shared helper to avoid duplicate work during preload
    if (await waitForPreloadIfNeeded(preloadComplete, () => isMarketCapDataFetched)) {
      return;
    }

    // Delegated to DataService
    await getMarketCapSeries({
      setData: setMarketCapData,
      setLastUpdated: setMarketCapLastUpdated,
      setIsFetched: setIsMarketCapDataFetched,
      useDateCheck: true,
    });
  }, [isMarketCapDataFetched, preloadComplete]);

  const refreshMarketCapData = useCallback(async () => {
    await refreshData({
      cacheId: 'marketCapData',
      setData: setMarketCapData,
      setIsFetched: setIsMarketCapDataFetched,
      fetchFunction: fetchMarketCapData,
    });
  }, [fetchMarketCapData]);

  const fetchMacroData = useCallback(async () => {
    if (isMacroDataFetched) return;
    await getMacroDataSeries({
      setData: setMacroData,
      setLastUpdated: setMacroLastUpdated,
      setIsFetched: setIsMacroDataFetched,
      useDateCheck: true,
    });
  }, [isMacroDataFetched]);

  const refreshMacroData = useCallback(async () => {
    await refreshData({
      cacheId: 'macroData',
      setData: setMacroData,
      setIsFetched: setIsMacroDataFetched,
      fetchFunction: fetchMacroData,
    });
  }, [fetchMacroData]);

  const fetchInflationData = useCallback(async () => {
    if (isInflationDataFetched) return;
    await getInflationSeries({
      setData: setInflationData,
      setLastUpdated: setInflationLastUpdated,
      setIsFetched: setIsInflationDataFetched,
      useDateCheck: true,
    });
  }, [isInflationDataFetched]);

  const refreshInflationData = useCallback(async () => {
    await refreshData({
      cacheId: 'inflationData',
      setData: setInflationData,
      setIsFetched: setIsInflationDataFetched,
      fetchFunction: fetchInflationData,
    });
  }, [fetchInflationData]);

  const fetchInitialClaimsData = useCallback(async () => {
    if (isInitialClaimsDataFetched) return;
    await getInitialClaimsSeries({
      setData: setInitialClaimsData,
      setLastUpdated: setInitialClaimsLastUpdated,
      setIsFetched: setIsInitialClaimsDataFetched,
      useDateCheck: true,
    });
  }, [isInitialClaimsDataFetched]);

  const refreshInitialClaimsData = useCallback(async () => {
    await refreshData({
      cacheId: 'initialClaimsData',
      setData: setInitialClaimsData,
      setIsFetched: setIsInitialClaimsDataFetched,
      fetchFunction: fetchInitialClaimsData,
    });
  }, [fetchInitialClaimsData]);

  const fetchInterestData = useCallback(async () => {
    if (isInterestDataFetched) return;
    await getInterestSeries({
      setData: setInterestData,
      setLastUpdated: setInterestLastUpdated,
      setIsFetched: setIsInterestDataFetched,
      useDateCheck: true,
    });
  }, [isInterestDataFetched]);

  const refreshInterestData = useCallback(async () => {
    await refreshData({
      cacheId: 'interestData',
      setData: setInterestData,
      setIsFetched: setIsInterestDataFetched,
      fetchFunction: fetchInterestData,
    });
  }, [fetchInterestData]);

  const fetchUnemploymentData = useCallback(async () => {
    if (isUnemploymentDataFetched) return;
    await getUnemploymentSeries({
      setData: setUnemploymentData,
      setLastUpdated: setUnemploymentLastUpdated,
      setIsFetched: setIsUnemploymentDataFetched,
      useDateCheck: true,
    });
  }, [isUnemploymentDataFetched]);

  const refreshUnemploymentData = useCallback(async () => {
    await refreshData({
      cacheId: 'unemploymentData',
      setData: setUnemploymentData,
      setIsFetched: setIsUnemploymentDataFetched,
      fetchFunction: fetchUnemploymentData,
    });
  }, [fetchUnemploymentData]);

  const fetchTxCountData = useCallback(async () => {
    if (isTxCountDataFetched) return;

    if (await waitForPreloadIfNeeded(preloadComplete, () => isTxCountDataFetched)) {
      return;
    }
    await getTxCountSeries({
      setData: setTxCountData,
      setLastUpdated: setTxCountLastUpdated,
      setIsFetched: setIsTxCountDataFetched,
      useDateCheck: true,
    });
  }, [isTxCountDataFetched, preloadComplete]);

  const refreshTxCountData = useCallback(async () => {
    await refreshData({
      cacheId: 'txCountData',
      setData: setTxCountData,
      setIsFetched: setIsTxCountDataFetched,
      fetchFunction: fetchTxCountData,
    });
  }, [fetchTxCountData]);

  const fetchTxCountCombinedData = useCallback(async () => {
    if (isTxCountCombinedDataFetched) return;
    await getTxCountCombinedSeries({
      setData: setTxCountCombinedData,
      setLastUpdated: setTxCountCombinedLastUpdated,
      setIsFetched: setIsTxCountCombinedDataFetched,
      useDateCheck: true,
    });
  }, [isTxCountCombinedDataFetched]);

  const refreshTxCountCombinedData = useCallback(async () => {
    await refreshData({
      cacheId: 'txCountCombinedData',
      setData: setTxCountCombinedData,
      setIsFetched: setIsTxCountCombinedDataFetched,
      fetchFunction: fetchTxCountCombinedData,
    });
  }, [fetchTxCountCombinedData]);

  const enrichTxMvrvDataset = useCallback((data) => enrichTxMvrvDatasetFromService(data), []);

  const setEnrichedTxMvrvData = useCallback((data) => {
    setTxMvrvData(enrichTxMvrvDataset(data));
  }, [enrichTxMvrvDataset]);

  const fetchTxMvrvData = useCallback(async () => {
    if (isTxMvrvDataFetched) return;
    // cacheId txMvrvData_v2: bust after realized_cap derivation fix
    await getTxMvrvSeries({
      setData: setEnrichedTxMvrvData,
      setLastUpdated: setTxMvrvLastUpdated,
      setIsFetched: setIsTxMvrvDataFetched,
      useDateCheck: true,
    });
  }, [isTxMvrvDataFetched, setEnrichedTxMvrvData]);

  const refreshTxMvrvData = useCallback(async () => {
    await refreshData({
      cacheId: 'txMvrvData_v2',
      setData: setTxMvrvData,
      setIsFetched: setIsTxMvrvDataFetched,
      fetchFunction: fetchTxMvrvData,
    });
  }, [fetchTxMvrvData]);

  const fetchTxMvrvRatioData = useCallback(async (smoothing = 'sma-7') => {
    if (isTxMvrvRatioDataFetched[smoothing]) return;

    setIsTxMvrvRatioDataFetched((prev) => ({ ...prev, [smoothing]: true }));
    const success = await getTxMvrvRatioSeries(smoothing, {
      setData: (formattedData) =>
        setTxMvrvRatioDataBySmoothing((prev) => ({ ...prev, [smoothing]: formattedData })),
      setLastUpdated: (time) =>
        setTxMvrvRatioLastUpdated((prev) => ({ ...prev, [smoothing]: time })),
      setIsFetched: (fetched) =>
        setIsTxMvrvRatioDataFetched((prev) => ({ ...prev, [smoothing]: fetched })),
      useDateCheck: true,
    });
    if (!success) {
      setIsTxMvrvRatioDataFetched((prev) => ({ ...prev, [smoothing]: false }));
    }
  }, [isTxMvrvRatioDataFetched]);

  const refreshTxMvrvRatioData = useCallback(async (smoothing = 'sma-7') => {
    await refreshData({
      cacheId: `txMvrvRatioData_v2_${smoothing}`,
      setData: () =>
        setTxMvrvRatioDataBySmoothing((prev) => {
          const next = { ...prev };
          delete next[smoothing];
          return next;
        }),
      setIsFetched: () =>
        setIsTxMvrvRatioDataFetched((prev) => ({ ...prev, [smoothing]: false })),
      fetchFunction: () => fetchTxMvrvRatioData(smoothing),
    });
  }, [fetchTxMvrvRatioData]);

  const fetchFloorEchoData = useCallback(async () => {
    if (isFloorEchoDataFetched) return;

    const success = await getFloorEchoSeries({
      setData: setFloorEchoData,
      setLastUpdated: setFloorEchoLastUpdated,
      setIsFetched: setIsFloorEchoDataFetched,
      useDateCheck: true,
    });
    if (!success) {
      setIsFloorEchoDataFetched(false);
    }
  }, [isFloorEchoDataFetched]);

  const refreshFloorEchoData = useCallback(async () => {
    await refreshData({
      cacheId: 'floorEchoData',
      setData: () => setFloorEchoData(null),
      setIsFetched: setIsFloorEchoDataFetched,
      fetchFunction: fetchFloorEchoData,
    });
  }, [fetchFloorEchoData]);

  const fetchAltcoinData = useCallback(async (coin) => {
    if (isAltcoinDataFetched[coin]) return;

    if (await waitForPreloadIfNeeded(preloadComplete, () => isAltcoinDataFetched[coin])) {
      return;
    }
    setIsAltcoinDataFetched((prev) => ({ ...prev, [coin]: true }));
    const success = await getAltcoinPriceSeries(coin, {
      setData: (data) => setAltcoinData((prev) => ({ ...prev, [coin]: data })),
      setLastUpdated: (time) =>
        setAltcoinLastUpdated((prev) => ({ ...prev, [coin]: time })),
      setIsFetched: (fetched) =>
        setIsAltcoinDataFetched((prev) => ({ ...prev, [coin]: fetched })),
      useDateCheck: true,
    });
    if (!success) {
      setIsAltcoinDataFetched((prev) => ({ ...prev, [coin]: false }));
    }
  }, [isAltcoinDataFetched, preloadComplete]);

  const refreshAltcoinData = useCallback(async (coin) => {
    await refreshData({
      cacheId: `altcoinData_${coin}`,
      setData: () => setAltcoinData((prev) => ({ ...prev, [coin]: [] })),
      setIsFetched: () =>
        setIsAltcoinDataFetched((prev) => ({ ...prev, [coin]: false })),
      fetchFunction: () => fetchAltcoinData(coin),
    });
  }, [fetchAltcoinData]);

  const fetchAltcoinSeasonData = useCallback(async () => {
    if (isAltcoinSeasonDataFetched) return;
    await getAltcoinSeasonSeries({
      setData: setAltcoinSeasonData,
      setLastUpdated: setAltcoinSeasonLastUpdated,
      setIsFetched: setIsAltcoinSeasonDataFetched,
      useDateCheck: true,
    });
  }, [isAltcoinSeasonDataFetched]);

  const refreshAltcoinSeasonData = useCallback(async () => {
    await refreshData({
      cacheId: 'altcoinSeasonData',
      setData: setAltcoinSeasonData,
      setIsFetched: setIsAltcoinSeasonDataFetched,
      fetchFunction: fetchAltcoinSeasonData,
    });
  }, [fetchAltcoinSeasonData]);

  const fetchFredSeriesData = useCallback(async (seriesId) => {
    if (fredSeriesData[seriesId]?.length > 0) return;

    if (await waitForPreloadIfNeeded(preloadComplete, () => fredSeriesData[seriesId]?.length > 0)) {
      return;
    }
    await getFredSeries(seriesId, {
      setData: (data) => setFredSeriesData((prev) => ({ ...prev, [seriesId]: data })),
      setLastUpdated: () => {},
      setIsFetched: () => {},
    });
  }, [fredSeriesData, preloadComplete]);

  const refreshFredSeriesData = useCallback(async (seriesId) => {
    await refreshData({
      cacheId: `fredSeriesData_${seriesId}`,
      setData: () => setFredSeriesData((prev) => ({ ...prev, [seriesId]: [] })),
      setIsFetched: () => {},
      fetchFunction: () => fetchFredSeriesData(seriesId),
    });
  }, [fetchFredSeriesData]);

  const fetchIndicatorData = useCallback(async (indicatorId) => {
    if (indicatorId !== 'btc-yield-recession') return;
    if (isIndicatorDataFetched[indicatorId]) return;

    if (await waitForPreloadIfNeeded(preloadComplete, () => isIndicatorDataFetched[indicatorId])) {
      return;
    }

    setIsIndicatorDataFetched((prev) => ({ ...prev, [indicatorId]: true }));
    const result = await loadBtcYieldRecessionIndicator();
    if (result.ok) {
      setIndicatorData((prev) => ({ ...prev, [indicatorId]: result.data }));
    } else {
      setIsIndicatorDataFetched((prev) => ({ ...prev, [indicatorId]: false }));
    }
  }, [isIndicatorDataFetched, preloadComplete]);

  const refreshIndicatorData = useCallback(async (indicatorId) => {
    if (indicatorId !== 'btc-yield-recession') return;
    try {
      await clearCache('indicatorData_btc-yield-recession');
      setIndicatorData((prev) => ({ ...prev, [indicatorId]: [] }));
      setIsIndicatorDataFetched((prev) => ({ ...prev, [indicatorId]: false }));
      await fetchIndicatorData(indicatorId);
    } catch (error) {
      // console.error('Error refreshing indicator data:', error);
    }
  }, [fetchIndicatorData]);

  const fetchRiskMetricsData = useCallback(async () => {
    if (isMvrvRiskDataFetched && isPuellRiskDataFetched && isMinerCapThermoCapRiskDataFetched && isFeeRiskDataFetched && isSoplRiskDataFetched) return;

    const riskMetricDefs = [
      { metric: 'mvrv_zscore', setData: setMvrvRiskData, setIsFetched: setIsMvrvRiskDataFetched, setLastUpdated: setMvrvRiskLastUpdated },
      { metric: 'puell_multiple', setData: setPuellRiskData, setIsFetched: setIsPuellRiskDataFetched, setLastUpdated: setPuellRiskLastUpdated },
      { metric: 'miner_cap_thermo', setData: setMinerCapThermoCapRiskData, setIsFetched: setIsMinerCapThermoCapRiskDataFetched, setLastUpdated: setMinerCapThermoCapRiskLastUpdated },
      { metric: 'fee_risk', setData: setFeeRiskData, setIsFetched: setIsFeeRiskDataFetched, setLastUpdated: setFeeRiskLastUpdated },
      { metric: 'sopl_risk', setData: setSoplRiskData, setIsFetched: setIsSoplRiskDataFetched, setLastUpdated: setSoplRiskLastUpdated },
    ];

    await Promise.all(
      riskMetricDefs.map(({ metric, setData, setIsFetched, setLastUpdated }) =>
        getRiskSeries(metric, {
          cacheId: RISK_METRIC_CACHE[metric],
          setData,
          setLastUpdated,
          setIsFetched,
        })
      )
    );
  }, [
    isMvrvRiskDataFetched,
    isPuellRiskDataFetched,
    isMinerCapThermoCapRiskDataFetched,
    isFeeRiskDataFetched,
    isSoplRiskDataFetched,
  ]);

  const refreshRiskMetricsData = useCallback(async () => {
    try {
      await Promise.all([
        clearCache('mvrvRiskData'),
        clearCache('puellRiskData'),
        clearCache('minerCapThermoCapRiskData'),
        clearCache('feeRiskData'), // New
        clearCache('soplRiskData'), // New
      ]);
      setMvrvRiskData([]);
      setPuellRiskData([]);
      setMinerCapThermoCapRiskData([]);
      setFeeRiskData([]); // New
      setSoplRiskData([]); // New
      setIsMvrvRiskDataFetched(false);
      setIsPuellRiskDataFetched(false);
      setIsMinerCapThermoCapRiskDataFetched(false);
      setIsFeeRiskDataFetched(false); // New
      setIsSoplRiskDataFetched(false); // New
      await fetchRiskMetricsData();
    } catch (error) {
      console.error('Error refreshing risk metrics:', error);
    }
  }, [fetchRiskMetricsData]);

  // ---------------------------------------------------------------------------
  // Stable actions: identity never changes; always call latest fetch/refresh.
  // Removes fetch* from data useMemo deps so action churn doesn't thrash consumers.
  // ---------------------------------------------------------------------------
  const actionsRef = useRef({});
  actionsRef.current = {
    fetchBtcData,
    refreshBtcData,
    fetchFedBalanceData,
    refreshFedBalanceData,
    fetchMvrvData,
    refreshMvrvData,
    fetchDominanceData,
    refreshDominanceData,
    fetchEthData,
    refreshEthData,
    fetchFearAndGreedData,
    refreshFearAndGreedData,
    fetchLatestFearAndGreed,
    refreshLatestFearAndGreed,
    fetchMarketCapData,
    refreshMarketCapData,
    fetchMacroData,
    refreshMacroData,
    fetchInflationData,
    refreshInflationData,
    fetchInitialClaimsData,
    refreshInitialClaimsData,
    fetchInterestData,
    refreshInterestData,
    fetchUnemploymentData,
    refreshUnemploymentData,
    fetchTxCountData,
    refreshTxCountData,
    fetchTxCountCombinedData,
    refreshTxCountCombinedData,
    fetchTxMvrvData,
    refreshTxMvrvData,
    fetchTxMvrvRatioData,
    refreshTxMvrvRatioData,
    fetchFloorEchoData,
    refreshFloorEchoData,
    fetchAltcoinData,
    refreshAltcoinData,
    fetchFredSeriesData,
    refreshFredSeriesData,
    fetchIndicatorData,
    refreshIndicatorData,
    fetchAltcoinSeasonData,
    refreshAltcoinSeasonData,
    fetchOnchainMetricsData,
    refreshOnchainMetricsData,
    fetchRiskMetricsData,
    refreshRiskMetricsData,
    fetchAltcoinSeasonTimeseriesData,
    refreshAltcoinSeasonTimeseriesData,
    fetchDifferenceData,
    refreshDifferenceData,
    fetchTotal2Data,
    refreshTotal2Data,
    fetchTotal3Data,
    refreshTotal3Data,
    fetchSp500DivUnrateData,
    refreshSp500DivUnrateData,
  };

  const stableActions = useMemo(() => {
    const names = Object.keys(actionsRef.current);
    const obj = {};
    for (const name of names) {
      obj[name] = (...args) => actionsRef.current[name]?.(...args);
    }
    return obj;
  }, []);

  // Data-only memo: re-renders only when series state changes (not when fetch identities change).
  const dataValue = useMemo(
    () => ({
      btcData,
      btcLastUpdated,
      fedBalanceData,
      fedLastUpdated,
      mvrvData,
      mvrvLastUpdated,
      dominanceData,
      dominanceLastUpdated,
      ethData,
      ethLastUpdated,
      fearAndGreedData,
      fearAndGreedLastUpdated,
      latestFearAndGreed,
      latestFearAndGreedLastUpdated,
      marketCapData,
      marketCapLastUpdated,
      macroData,
      macroLastUpdated,
      inflationData,
      inflationLastUpdated,
      initialClaimsData,
      initialClaimsLastUpdated,
      interestData,
      interestLastUpdated,
      unemploymentData,
      unemploymentLastUpdated,
      txCountData,
      txCountLastUpdated,
      txCountCombinedData,
      txCountCombinedLastUpdated,
      txMvrvData,
      txMvrvLastUpdated,
      txMvrvRatioDataBySmoothing,
      txMvrvRatioLastUpdated,
      floorEchoData,
      floorEchoLastUpdated,
      isFloorEchoDataFetched,
      altcoinData,
      altcoinLastUpdated,
      fredSeriesData,
      indicatorData,
      altcoinSeasonData,
      altcoinSeasonLastUpdated,
      onchainMetricsData,
      onchainMetricsLastUpdated,
      onchainFetchError,
      isAltcoinDataFetched,
      capRealData,
      revAllTimeData,
      mvrvRiskData,
      puellRiskData,
      minerCapThermoCapRiskData,
      mvrvRiskLastUpdated,
      puellRiskLastUpdated,
      minerCapThermoCapRiskLastUpdated,
      feeRiskData,
      soplRiskData,
      feeRiskLastUpdated,
      soplRiskLastUpdated,
      isFeeRiskDataFetched,
      isSoplRiskDataFetched,
      altcoinSeasonTimeseriesData,
      altcoinSeasonTimeseriesLastUpdated,
      differenceData,
      differenceLastUpdated,
      total2Data,
      total2LastUpdated,
      total3Data,
      total3LastUpdated,
      sp500DivUnrateData,
      sp500DivUnrateLastUpdated,
      /** Nested actions bag for selective consumers; also spread at top level for compat */
      actions: stableActions,
    }),
    [
      btcData,
      btcLastUpdated,
      fedBalanceData,
      fedLastUpdated,
      mvrvData,
      mvrvLastUpdated,
      dominanceData,
      dominanceLastUpdated,
      ethData,
      ethLastUpdated,
      fearAndGreedData,
      fearAndGreedLastUpdated,
      latestFearAndGreed,
      latestFearAndGreedLastUpdated,
      marketCapData,
      marketCapLastUpdated,
      macroData,
      macroLastUpdated,
      inflationData,
      inflationLastUpdated,
      initialClaimsData,
      initialClaimsLastUpdated,
      interestData,
      interestLastUpdated,
      unemploymentData,
      unemploymentLastUpdated,
      txCountData,
      txCountLastUpdated,
      txCountCombinedData,
      txCountCombinedLastUpdated,
      txMvrvData,
      txMvrvLastUpdated,
      txMvrvRatioDataBySmoothing,
      txMvrvRatioLastUpdated,
      floorEchoData,
      floorEchoLastUpdated,
      isFloorEchoDataFetched,
      altcoinData,
      altcoinLastUpdated,
      fredSeriesData,
      indicatorData,
      altcoinSeasonData,
      altcoinSeasonLastUpdated,
      onchainMetricsData,
      onchainMetricsLastUpdated,
      onchainFetchError,
      isAltcoinDataFetched,
      capRealData,
      revAllTimeData,
      mvrvRiskData,
      puellRiskData,
      minerCapThermoCapRiskData,
      mvrvRiskLastUpdated,
      puellRiskLastUpdated,
      minerCapThermoCapRiskLastUpdated,
      feeRiskData,
      soplRiskData,
      feeRiskLastUpdated,
      soplRiskLastUpdated,
      isFeeRiskDataFetched,
      isSoplRiskDataFetched,
      altcoinSeasonTimeseriesData,
      altcoinSeasonTimeseriesLastUpdated,
      differenceData,
      differenceLastUpdated,
      total2Data,
      total2LastUpdated,
      total3Data,
      total3LastUpdated,
      sp500DivUnrateData,
      sp500DivUnrateLastUpdated,
      stableActions,
    ]
  );

  // Combined value: data + top-level fetch*/refresh* for existing useData() destructuring.
  const contextValue = useMemo(
    () => ({
      ...dataValue,
      ...stableActions,
    }),
    [dataValue, stableActions]
  );

  // Initialize the data layer once on first mount.
  const dataLayerInitialized = useRef(false);
  if (!dataLayerInitialized.current) {
    initializeDataService({
      fetchWithCache,
      refreshData,
    });
    dataLayerInitialized.current = true;
  }

  return (
    <DataActionsContext.Provider value={stableActions}>
      <DataContext.Provider value={contextValue}>
        {children}
      </DataContext.Provider>
    </DataActionsContext.Provider>
  );
};

/**
 * Full context value (data + fetch*). Prefer `useChartData` / `useChartDataActions`
 * from `hooks/useChartData.js` in chart components — see docs/DATA_LAYER.md.
 */
export const useData = () => useContext(DataContext);

/** Actions-only hook: stable identity; does not re-render when series data changes. */
export const useDataActions = () => useContext(DataActionsContext);

// Re-export the core fetch primitives for the data layer.
export { fetchWithCache, refreshData };