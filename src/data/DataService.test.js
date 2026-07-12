/**
 * Unit tests for DataService transforms and formatters.
 * Pure logic — no network / DOM. Run: npm test -- --watchAll=false --testPathPattern=DataService
 */

import {
  normalizePriceData,
  deduplicateByTime,
  formatFearAndGreedBinary,
  formatLatestFearAndGreed,
  formatUsMacroSeries,
  formatFedBalanceSeries,
  formatDifferenceSeries,
  formatTotal2Series,
  formatRiskSeries,
  formatClosePriceSeries,
  formatFredObservations,
  formatTxCountSeries,
  formatAltcoinSeasonData,
  enrichTxMvrvDataset,
  formatTxMvrvSeries,
  formatFloorEchoPayload,
  formatTxMvrvRatioPayload,
  buildBtcYieldRecessionSeries,
  formatOnchainMetrics,
  ensureSeriesLoaded,
} from './DataService';

describe('DataService - normalizePriceData', () => {
  test('returns empty array for null/undefined/non-array', () => {
    expect(normalizePriceData(null)).toEqual([]);
    expect(normalizePriceData(undefined)).toEqual([]);
    expect(normalizePriceData('not array')).toEqual([]);
    expect(normalizePriceData({})).toEqual([]);
  });

  test('normalizes array with valueKey default, filters invalids, sorts by time', () => {
    const raw = [
      { value: '101.5', date: '2020-01-02' },
      { value: null, time: '2020-01-01' },
      { value: '100', timestamp: 1577836800 }, // 2020-01-01
      { value: '99.9', end_date: '2020-01-03' },
    ];
    const result = normalizePriceData(raw);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ time: '2020-01-01', value: 100 });
    expect(result[1]).toEqual({ time: '2020-01-02', value: 101.5 });
    expect(result[2]).toEqual({ time: '2020-01-03', value: 99.9 });
  });

  test('supports custom valueKey', () => {
    const raw = [{ close: 50000, time: '2021-01-01' }];
    const result = normalizePriceData(raw, 'close');
    expect(result[0]).toEqual({ time: '2021-01-01', value: 50000 });
  });
});

describe('DataService - deduplicateByTime', () => {
  test('returns empty for non-array', () => {
    expect(deduplicateByTime(null)).toEqual([]);
    expect(deduplicateByTime(undefined)).toEqual([]);
  });

  test('removes duplicate times keeping first occurrence, preserves order', () => {
    const data = [
      { time: '2020-01-01', value: 100 },
      { time: '2020-01-01', value: 101 },
      { time: '2020-01-02', value: 102 },
      { time: '2020-01-01', value: 99 },
    ];
    const result = deduplicateByTime(data);
    expect(result).toEqual([
      { time: '2020-01-01', value: 100 },
      { time: '2020-01-02', value: 102 },
    ]);
  });
});

describe('DataService - formatFearAndGreedBinary', () => {
  test('maps unix date field to YYYY-MM-DD time', () => {
    // 2020-01-01 UTC
    const raw = [
      { value: 45, category: 'Fear', date: 1577836800 },
    ];
    const result = formatFearAndGreedBinary(raw);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('45');
    expect(result[0].value_classification).toBe('Fear');
    expect(result[0].time).toBe('2020-01-01');
  });
});

describe('DataService - formatLatestFearAndGreed', () => {
  test('parses latest gauge payload', () => {
    const result = formatLatestFearAndGreed({
      value: '72',
      value_classification: 'Greed',
      timestamp: 1577836800,
    });
    expect(result.value).toBe(72);
    expect(result.value_classification).toBe('Greed');
    expect(result.time).toBe('2020-01-01');
  });

  test('returns null for missing data', () => {
    expect(formatLatestFearAndGreed(null)).toBeNull();
  });
});

describe('DataService - formatUsMacroSeries', () => {
  test('dedups by date keeping last, preserves Map order', () => {
    const raw = [
      { date: '2020-01-01', value: '1.0' },
      { date: '2020-01-01', value: '1.5' },
      { date: '2020-02-01', value: '2.0' },
    ];
    const result = formatUsMacroSeries(raw);
    expect(result).toEqual([
      { time: '2020-01-01', value: 1.5 },
      { time: '2020-02-01', value: 2.0 },
    ]);
  });

  test('supports parseInt parser for claims', () => {
    const raw = [{ date: '2020-01-01', value: '210000.9' }];
    const result = formatUsMacroSeries(raw, (v) => parseInt(v, 10));
    expect(result[0].value).toBe(210000);
  });
});

describe('DataService - formatFedBalanceSeries', () => {
  test('scales value by 1e6 and uses observation_date', () => {
    const result = formatFedBalanceSeries([
      { observation_date: '2020-01-01', value: '8000000' },
    ]);
    expect(result[0]).toEqual({ time: '2020-01-01', value: 8 });
  });
});

describe('DataService - formatDifferenceSeries', () => {
  test('adds 100 offset and drops invalid rows', () => {
    const result = formatDifferenceSeries([
      { time: '2020-01-01', value: '5' },
      { time: 'bad', value: '1' },
      { time: '2020-01-02', value: '10' },
    ]);
    expect(result).toEqual([
      { time: '2020-01-01', value: 105 },
      { time: '2020-01-02', value: 110 },
    ]);
  });
});

describe('DataService - formatTotal2Series', () => {
  test('applies cutoff and maps total2', () => {
    const result = formatTotal2Series([
      { date: '2014-01-01', total2: '100' },
      { date: '2015-01-01', total2: '200' },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ time: '2015-01-01', value: 200 });
  });
});

describe('DataService - formatRiskSeries', () => {
  test('maps to capitalized Risk key', () => {
    const result = formatRiskSeries([
      { time: '2020-01-02', value: '0.5' },
      { time: '2020-01-01', value: '0.2' },
      { time: '2020-01-03', value: null },
    ]);
    expect(result).toEqual([
      { time: '2020-01-01', Risk: 0.2 },
      { time: '2020-01-02', Risk: 0.5 },
    ]);
  });
});

describe('DataService - formatClosePriceSeries', () => {
  test('filters non-positive closes', () => {
    const result = formatClosePriceSeries([
      { date: '2020-01-01', close: '0' },
      { date: '2020-01-02', close: '100' },
      { date: '2020-01-03', close: null },
    ]);
    expect(result).toEqual([{ time: '2020-01-02', value: 100 }]);
  });
});

describe('DataService - formatFredObservations', () => {
  test('carries last observation forward across gaps', () => {
    const result = formatFredObservations([
      { date: '2020-01-01', value: '1.5' },
      { date: '2020-01-02', value: '.' },
      { date: '2020-01-03', value: '2.0' },
    ]);
    expect(result).toEqual([
      { time: '2020-01-01', value: 1.5 },
      { time: '2020-01-02', value: 1.5 },
      { time: '2020-01-03', value: 2.0 },
    ]);
  });
});

describe('DataService - formatTxCountSeries', () => {
  test('strips time component from ISO time', () => {
    const result = formatTxCountSeries([
      { time: '2020-01-02T00:00:00Z', tx_count: '300000' },
      { time: '2020-01-01T00:00:00Z', tx_count: '200000' },
    ]);
    expect(result[0].time).toBe('2020-01-01');
    expect(result[0].value).toBe(200000);
  });
});

describe('DataService - formatAltcoinSeasonData', () => {
  test('formats object snapshot', () => {
    const result = formatAltcoinSeasonData({
      index: '55',
      start_date: '2020-01-01',
      end_date: '2020-01-07',
      altcoin_count: '50',
      altcoins_outperforming: '30',
      season: 'Altcoin',
    });
    expect(result.index).toBe(55);
    expect(result.time).toBe('2020-01-07');
    expect(result.season).toBe('Altcoin');
  });

  test('formats timeseries array', () => {
    const result = formatAltcoinSeasonData([
      {
        index: '40',
        start_date: 'a',
        end_date: '2020-01-14',
        altcoin_count: '50',
        altcoins_outperforming: '20',
        season: 'Bitcoin',
      },
      {
        index: '60',
        start_date: 'b',
        end_date: '2020-01-07',
        altcoin_count: '50',
        altcoins_outperforming: '35',
        season: 'Altcoin',
      },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].time).toBe('2020-01-07');
    expect(result[1].time).toBe('2020-01-14');
  });
});

describe('DataService - enrichTxMvrvDataset / formatTxMvrvSeries', () => {
  test('derives realized_cap from market_cap / mvrv when missing', () => {
    const enriched = enrichTxMvrvDataset([
      { mvrv: 2, market_cap: 100, realized_cap: null },
    ]);
    expect(enriched[0].realized_cap).toBe(50);
  });

  test('formatTxMvrvSeries maps API rows', () => {
    const result = formatTxMvrvSeries([
      {
        date: '2020-01-01',
        tx_count: '100',
        mvrv: '2',
        market_cap: '200',
        realized_cap: null,
      },
    ]);
    expect(result[0]).toMatchObject({
      time: '2020-01-01',
      tx_count: 100,
      mvrv: 2,
      market_cap: 200,
      realized_cap: 100,
    });
  });
});

describe('DataService - formatTxMvrvRatioPayload / formatFloorEchoPayload', () => {
  test('ratio payload keeps series and threshold', () => {
    const result = formatTxMvrvRatioPayload({
      smoothing: 'sma-7',
      horizontal_threshold: '1.5',
      last_updated: '2020-01-02',
      series: [
        { time: '2020-01-01', value: '1.1' },
        { time: '2020-01-02', value: '1.2' },
      ],
    });
    expect(result.smoothing).toBe('sma-7');
    expect(result.horizontalThreshold).toBe(1.5);
    expect(result.series).toHaveLength(2);
    expect(result.time).toBe('2020-01-02');
  });

  test('floor echo maps snake_case fields', () => {
    const result = formatFloorEchoPayload({
      formula_version: 'v1',
      floor_band: '0.2',
      echo_band: '0.4',
      last_updated: '2020-01-01',
      series: [
        {
          time: '2020-01-01',
          fei: '0.3',
          btc_price: '10000',
          in_floor_zone: true,
          near_historic_floor: false,
        },
      ],
    });
    expect(result.formulaVersion).toBe('v1');
    expect(result.series[0].inFloorZone).toBe(true);
    expect(result.series[0].btcPrice).toBe(10000);
  });
});

describe('DataService - formatOnchainMetrics', () => {
  test('formats flat rows and DRF results', () => {
    const flat = formatOnchainMetrics([
      { time: '2020-01-01', metric: 'PriceUSD', value: '100', asset: 'btc' },
    ]);
    expect(flat[0]).toEqual({
      time: '2020-01-01',
      metric: 'PriceUSD',
      value: 100,
      asset: 'btc',
    });
    const nested = formatOnchainMetrics({
      results: [{ time: '2020-01-02', metric: 'IssContUSD', value: '1', asset: 'btc' }],
    });
    expect(nested).toHaveLength(1);
  });
});

describe('DataService - buildBtcYieldRecessionSeries', () => {
  test('joins sparse inputs with LOCF and filters incomplete rows', () => {
    const result = buildBtcYieldRecessionSeries({
      startDate: '2020-01-01',
      endDate: '2020-01-03',
      btcData: [
        { date: '2020-01-01', close: '10000' },
        { date: '2020-01-03', close: '11000' },
      ],
      t10y2yData: [{ date: '2020-01-01', value: '0.5' }],
      usrecdData: [{ date: '2020-01-01', value: '0' }],
      fedFundsData: [{ date: '2020-01-01', value: '1.5' }],
      m2Data: [
        { date: '2019-01-01', value: '100' },
        { date: '2020-01-01', value: '110' },
      ],
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('btc');
    expect(result[0]).toHaveProperty('t10y2y');
    expect(result[0]).toHaveProperty('fedFunds');
    expect(result[0]).toHaveProperty('m2Growth');
    expect(result[0]).toHaveProperty('usrecd');
  });
});

describe('DataService - ensureSeriesLoaded', () => {
  test('no-ops when series already populated', async () => {
    const fetchBtcData = jest.fn();
    await ensureSeriesLoaded(
      { btcData: [{ time: '2020-01-01', value: 1 }], fetchBtcData },
      { dataKey: 'btcData' }
    );
    expect(fetchBtcData).not.toHaveBeenCalled();
  });

  test('calls fetch when empty', async () => {
    const fetchBtcData = jest.fn().mockResolvedValue(undefined);
    await ensureSeriesLoaded({ btcData: [], fetchBtcData }, { dataKey: 'btcData' });
    expect(fetchBtcData).toHaveBeenCalledTimes(1);
  });

  test('loads FRED by seriesId', async () => {
    const fetchFredSeriesData = jest.fn().mockResolvedValue(undefined);
    await ensureSeriesLoaded(
      { fredSeriesData: {}, fetchFredSeriesData },
      { isFred: true, seriesId: 'SP500' }
    );
    expect(fetchFredSeriesData).toHaveBeenCalledWith('SP500');
  });

  test('loads altcoin by coin', async () => {
    const fetchAltcoinData = jest.fn().mockResolvedValue(undefined);
    await ensureSeriesLoaded(
      { altcoinData: {}, fetchAltcoinData },
      { dataKey: 'altcoinData', coin: 'SOL' }
    );
    expect(fetchAltcoinData).toHaveBeenCalledWith('SOL');
  });
});

