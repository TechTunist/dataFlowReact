import {
  extractNestedSeries,
  isIndicatorDataLoaded,
  resolveIndicatorRawData,
} from './workbenchSeriesUtils';

describe('workbenchSeriesUtils', () => {
  test('extractNestedSeries reads nested series array', () => {
    const payload = { series: [{ time: '2024-01-01', value: 12 }] };
    expect(extractNestedSeries(payload)).toHaveLength(1);
    expect(extractNestedSeries([])).toEqual([]);
  });

  test('resolveIndicatorRawData returns tx tension ratio series', () => {
    const info = {
      dataKey: 'txMvrvRatioDataBySmoothing',
      nestedKey: 'sma-7',
      seriesField: 'series',
    };
    const dataContext = {
      txMvrvRatioDataBySmoothing: {
        'sma-7': {
          series: [{ time: '2024-01-01', value: 42 }],
        },
      },
    };
    const data = resolveIndicatorRawData(info, dataContext);
    expect(data).toHaveLength(1);
    expect(data[0].value).toBe(42);
  });

  test('resolveIndicatorRawData computes bitcoin risk metric from btc prices', () => {
    const info = { computed: 'btcRisk' };
    const prices = [];
    const start = new Date('2020-01-01');
    for (let i = 0; i < 400; i += 1) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      prices.push({
        time: d.toISOString().split('T')[0],
        value: 20000 + i * 10,
      });
    }
    const data = resolveIndicatorRawData(info, { btcData: prices });
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('Risk');
  });

  test('isIndicatorDataLoaded is false when series missing', () => {
    const info = {
      dataKey: 'floorEchoData',
      seriesField: 'series',
    };
    expect(isIndicatorDataLoaded(info, { floorEchoData: { series: [] } })).toBe(false);
  });
});