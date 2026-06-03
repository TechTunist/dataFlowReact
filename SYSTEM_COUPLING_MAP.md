# Cryptological — Current System Coupling Map

**Purpose:** This document provides a clear, honest map of the tight couplings between the frontend and backend. It is intended as the foundation for any architectural work (especially the DataContext refactor) so that changes can be made safely and with full awareness of dependencies.

**Principle:** We will not propose significant refactors without understanding these connections.

**Last Updated:** Current

---

## 1. Overview of Coupling Style

The current architecture has **very tight, granular coupling**:

- The backend exposes a large number of highly specific endpoints, one (or more) per major dataset/metric.
- The frontend `DataContext` has a corresponding state slice + fetch function + refresh function for most of them.
- Derived calculations (especially in the Workbench) are done client-side because the backend does not provide convenient joined/derived data for many common operations.

This design was pragmatic for rapid development but now creates significant maintenance and evolution friction.

---

## 2. Frontend DataContext → Backend Endpoints

### Core Price & Market Data

| Frontend Function / State          | Backend Endpoint(s)                          | Notes / Backend Model(s) |
|------------------------------------|----------------------------------------------|---------------------------|
| `fetchBtcData` / `btcData`        | `GET /api/btc/price/`                       | `BitcoinDaily` + related |
| `fetchEthData` / `ethData`        | `GET /api/eth/price/`                       | `EthereumDaily` |
| `fetchDominanceData`              | `GET /api/dominance/`                       | `BitcoinDominance`, `RealDominance` |
| `fetchMvrvData`                   | `GET /api/mvrv/`                            | `MVRV` |
| `marketCapData`                   | `GET /api/total/marketcap/`                 | `TotalMarketCap`, `BitcoinMarketCap` |
| `fetchDifferenceData`             | `GET /api/total/difference/`                | Custom aggregation |
| `total2Data` / `total3Data`       | `GET /api/total2/`, `GET /api/total3/`      | `TotalMarketCap` variants |

### Macro Data

| Frontend                          | Backend Endpoint(s)                          | Notes |
|-----------------------------------|----------------------------------------------|-------|
| `fetchInflationData`             | `GET /api/us-inflation/`                    | `InflationRate` |
| `fetchInterestData`              | `GET /api/us-interest/`                     | `USInterestRate` |
| `fetchUnemploymentData`          | `GET /api/us-unemployment/`                 | `USUnemploymentRate` |
| `fetchInitialClaimsData`         | `GET /api/initial-claims/`                  | `InitialClaims` |
| `fetchFedBalanceData`            | `GET /api/fed-balance/`                     | `FedBalance` (or similar) |
| `fetchCombinedMacroData`         | `GET /api/combined-macro-data/`             | Aggregated view (Inflation + Interest + Unemployment) |

### On-Chain & Risk Metrics

| Frontend                          | Backend Endpoint(s)                                      | Notes |
|-----------------------------------|----------------------------------------------------------|-------|
| `fetchOnchainMetricsData`        | `GET /api/onchain-metrics/?metric=...`                  | `BitcoinMetric` |
| `fetchAddressMetricsData`        | `GET /api/onchain-address-metrics/`                     | `BitcoinAddressMetrics` (via ViewSet) |
| Risk metrics (various)           | `GET /api/risk-metrics/?metric=...`                     | `RiskMetric` |
| Precomputed risk (MVRV Risk, etc)| `precompute_mvrv_risk`, `precompute_puell_risk`, etc.   | Called via management commands, exposed through risk endpoints |

### Fear & Greed / Sentiment

| Frontend                          | Backend Endpoint(s)                          | Notes |
|-----------------------------------|----------------------------------------------|-------|
| `fetchFearAndGreedData`          | `GET /api/fear-and-greed/`                  | `FearAndGreed` |
| `fetchLatestFearAndGreed`        | `GET /api/fear-and-greed/latest/`           | Latest record |
| Binary versions                  | `GET /api/fear-and-greed-binary/` and variants | `FearAndGreedBinary` |

### Altcoins & Other

Many individual `/api/{coin}/price/` endpoints (ada, sol, avax, etc.) map directly to their respective `XXXDaily` models.

### Workbench / Series System (Special Case)

The Workbench uses a more abstract system:

- `GET /api/series/` (via DRF router → `SeriesViewSet`)
- `GET /api/series/{seriesId}/observations/`
- FRED series via `/api/series/{fred_code}/observations/`

This is one of the cleaner, more modern parts of the backend API surface.

---

## 3. Workbench Specific Couplings

The Workbench has some of the most sophisticated client-side logic:

- It calls `getRawData(id, type)` which branches heavily:
  - Macro → `dataContext.fredSeriesData` or direct context fields
  - Crypto → various `altcoinData`, `btcData`, etc.
  - Derived → `derivedData[id]`
- It performs significant client-side processing (`getNormalizedData`, moving averages, `computeDerivedData` for user-created derived series).
- Derived series are **entirely computed on the frontend** using `computeDerivedData(norm1, norm2, operation)`.

This means the Workbench is currently one of the biggest consumers of raw data and also one of the places doing the most post-processing.

---

## 4. Major Pain Points Revealed by the Map

1. **Extreme Granularity**
   - ~40+ distinct data fetch paths on the frontend map to a similar number of backend endpoints/models.
   - This is the root cause of the "giant DataContext" smell.

2. **Client-Side Derivation**
   - The Workbench's derived series feature and many chart calculations exist because the backend does not provide convenient joined or pre-computed data for common operations (e.g., "Consumer Sentiment / Fear & Greed").

3. **Mixed Frequencies Handled on Client**
   - Monthly macro series vs daily price data is reconciled in the frontend (especially in the Workbench and some charts). The backend largely treats them as separate time series.

4. **Data Pipeline Visibility**
   - The frontend has no good way to know the freshness or success status of individual datasets beyond the `DatasetUpdate` table (which is lightly used).

---

## 5. Implications for Future Work

This map will be used to guide any refactoring:

- The DataContext split should create abstraction layers that hide the current granularity.
- Any proposal to improve the backend API surface should be evaluated against how much it would simplify the frontend coupling map.
- We should be very explicit about which parts of this coupling we are willing to live with for a long time (for safety) vs which parts we want to evolve.

---

**Next:** This document will be updated as we explore and as we make decisions. It should be treated as a source of truth when designing any architectural changes.

Would you like me to expand any section (e.g., deeper mapping of the risk metrics precomputation scripts, or the full list of altcoin price endpoints) before we move to designing the DataContext split?