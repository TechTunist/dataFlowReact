import {
  computeFloorEchoIndex,
  rollingPercentileRank,
  expandingPercentileRank,
  buildRelativePerformanceMap,
  getFloorEchoReferenceLevels,
  applyFeiSmoothing,
  getFloorEchoComponentContributions,
  FLOOR_ECHO_MACRO_WEIGHTS,
  FLOOR_ECHO_WEIGHTS,
  btcDrawdownDampening,
} from './floorEchoIndex';

describe('floorEchoIndex', () => {
  const btc = [];
  for (let i = 0; i < 400; i++) {
    const day = String((i % 28) + 1).padStart(2, '0');
    const month = String((Math.floor(i / 28) % 12) + 1).padStart(2, '0');
    const year = 2018 + Math.floor(i / 336);
    btc.push({
      time: `${year}-${month}-${day}`,
      value: i < 200 ? 10000 - i * 20 : 6000 + (i - 200) * 5,
    });
  }

  const fear = btc.map((b, i) => ({
    timestamp: Math.floor(new Date(b.time).getTime() / 1000),
    value: i < 200 ? 15 : 55,
  }));

  const lowRisk = btc.map((b) => ({ time: b.time, Risk: 0.1 }));
  const highRisk = btc.map((b) => ({ time: b.time, Risk: 0.85 }));

  it('computes lower FEI when capitulation inputs dominate', () => {
    const bear = computeFloorEchoIndex({
      btcData: btc,
      fearAndGreedData: fear,
      mvrvRiskData: lowRisk,
      puellRiskData: lowRisk,
      soplRiskData: lowRisk,
      txCountData: btc.map((b, i) => ({ time: b.time, value: 1000 - i })),
      dominanceData: btc.map((b) => ({ time: b.time, btc: 60 })),
      altcoinSeasonTimeseriesData: btc.map((b) => ({ time: b.time, index: 20 })),
      useDrawdownDampening: false,
    });
    const bull = computeFloorEchoIndex({
      btcData: btc,
      fearAndGreedData: btc.map((b) => ({
        timestamp: Math.floor(new Date(b.time).getTime() / 1000),
        value: 80,
      })),
      mvrvRiskData: highRisk,
      puellRiskData: highRisk,
      soplRiskData: highRisk,
      useDrawdownDampening: false,
    });
    expect(bear.length).toBeGreaterThan(0);
    expect(bull.length).toBeGreaterThan(0);
    const bearAvg = bear.slice(0, 200).reduce((s, d) => s + d.fei, 0) / 200;
    const bullAvg = bull.slice(200).reduce((s, d) => s + d.fei, 0) / (bull.length - 200);
    expect(bearAvg).toBeLessThan(bullAvg);
  });

  it('marks floor zone when FEI is in bottom cluster', () => {
    const series = computeFloorEchoIndex({
      btcData: btc,
      fearAndGreedData: fear,
      mvrvRiskData: lowRisk,
      puellRiskData: lowRisk,
      soplRiskData: lowRisk,
      useDrawdownDampening: false,
    });
    const early = series.slice(0, 100);
    expect(early.some((d) => d.inFloorZone || d.nearHistoricFloor)).toBe(true);
  });

  it('builds relative performance map from overlap anchor', () => {
    const asset = [
      { time: '2020-03-01', value: 100 },
      { time: '2020-03-02', value: 90 },
    ];
    const btcShort = [
      { time: '2020-01-01', value: 5000 },
      { time: '2020-03-01', value: 4000 },
      { time: '2020-03-02', value: 3800 },
    ];
    const map = buildRelativePerformanceMap(asset, btcShort);
    expect(map.get('2020-03-01')).toBeCloseTo(100, 5);
    expect(map.get('2020-03-02')).toBeLessThan(100);
  });

  it('rolling percentile rank returns 0 for minimum in window', () => {
    const vals = [5, 3, 8, 2, 9];
    expect(rollingPercentileRank(vals, 3, 5)).toBe(0);
    expect(rollingPercentileRank(vals, 4, 5)).toBe(1);
  });

  it('derives reference floor bands from history', () => {
    const series = [
      { fei: 5 }, { fei: 8 }, { fei: 12 }, { fei: 40 }, { fei: 60 },
    ];
    const levels = getFloorEchoReferenceLevels(series);
    expect(levels.floorBand).toBeLessThanOrEqual(levels.echoBand);
    expect(levels.median).toBe(12);
  });

  it('expanding percentile rank returns 1 for maximum in history', () => {
    const vals = [1, 3, 2, 9, 5];
    expect(expandingPercentileRank(vals, 3)).toBe(1);
    expect(expandingPercentileRank(vals, 0)).toBe(0.5);
  });

  it('clusters capitulation bottoms into a similar FEI zone across cycles', () => {
    const makeCycle = (year, base) => {
      const days = 120;
      return Array.from({ length: days }, (_, i) => {
        const day = String((i % 28) + 1).padStart(2, '0');
        const month = String((Math.floor(i / 28) % 12) + 1).padStart(2, '0');
        const time = `${year}-${month}-${day}`;
        const isBottom = i < 30;
        return {
          time,
          btc: { time, value: isBottom ? base * 0.4 : base },
          fear: { timestamp: Math.floor(new Date(time).getTime() / 1000), value: isBottom ? 12 : 70 },
          risk: { time, Risk: isBottom ? 0.08 : 0.82 },
          tx: { time, value: isBottom ? 80000 : 320000 },
        };
      });
    };

    const cycleA = makeCycle(2015, 400);
    const cycleB = makeCycle(2018, 18000);
    const cycleC = makeCycle(2022, 45000);
    const merged = [...cycleA, ...cycleB, ...cycleC].sort((a, b) => a.time.localeCompare(b.time));

    const series = computeFloorEchoIndex({
      btcData: merged.map((d) => d.btc),
      fearAndGreedData: merged.map((d) => d.fear),
      mvrvRiskData: merged.map((d) => d.risk),
      puellRiskData: merged.map((d) => d.risk),
      soplRiskData: merged.map((d) => d.risk),
      txCountData: merged.map((d) => d.tx),
    });

    const bottomFei = (year) => {
      const pts = series.filter((d) => d.time.startsWith(String(year)) && d.fei != null).slice(0, 35);
      return pts.reduce((s, d) => s + d.fei, 0) / pts.length;
    };

    const b2015 = bottomFei(2015);
    const b2018 = bottomFei(2018);
    const b2022 = bottomFei(2022);
    expect(Math.max(b2015, b2018, b2022) - Math.min(b2015, b2018, b2022)).toBeLessThan(18);
    expect(b2015).toBeLessThan(35);
    expect(b2018).toBeLessThan(35);
    expect(b2022).toBeLessThan(35);
  });

  it('applies display smoothing to precomputed FEI series', () => {
    const series = [
      { time: '2020-01-01', fei: 10 },
      { time: '2020-01-02', fei: 20 },
      { time: '2020-01-03', fei: 30 },
    ];
    const smoothed = applyFeiSmoothing(series, 2);
    expect(smoothed[1].fei).toBe(15);
    expect(smoothed[2].fei).toBe(25);
  });

  it('dampens shallow drawdowns (60k→40k) more than deep floors (~16k)', () => {
    expect(btcDrawdownDampening(0.42)).toBeLessThan(0.75);
    expect(btcDrawdownDampening(0.77)).toBe(1);
  });

  it('does not flag historic floor on shallow 2022 drawdown when macro stress dominates', () => {
    const rows = [];
    for (let i = 0; i < 500; i++) {
      const date = new Date('2021-06-01');
      date.setDate(date.getDate() + i);
      const time = date.toISOString().split('T')[0];
      let price = 69000;
      if (i >= 120 && i < 220) price = 40000;
      else if (i >= 220 && i < 400) price = 28000;
      else if (i >= 400) price = 16000;

      const shallowBear = i >= 120 && i < 220;
      const deepBear = i >= 400;

      rows.push({
        time,
        btc: { time, value: price },
        fear: {
          timestamp: Math.floor(date.getTime() / 1000),
          value: shallowBear ? 28 : deepBear ? 8 : 55,
        },
        risk: {
          time,
          Risk: shallowBear ? 0.48 : deepBear ? 0.06 : 0.75,
        },
        tx: { time, value: shallowBear ? 220000 : deepBear ? 70000 : 300000 },
        dom: { time, btc: shallowBear ? 48 : deepBear ? 56 : 42 },
        alt: { time, index: shallowBear ? 18 : deepBear ? 12 : 62 },
        vix: { time, value: shallowBear ? 39 : 18 },
        umcsent: { time, value: shallowBear ? 50 : 72 },
        t10y2y: { time, value: shallowBear ? -0.65 : 0.5 },
      });
    }

    const baseInputs = {
      btcData: rows.map((r) => r.btc),
      fearAndGreedData: rows.map((r) => r.fear),
      mvrvRiskData: rows.map((r) => r.risk),
      puellRiskData: rows.map((r) => r.risk),
      soplRiskData: rows.map((r) => r.risk),
      minerCapThermoCapRiskData: rows.map((r) => r.risk),
      txCountData: rows.map((r) => r.tx),
      dominanceData: rows.map((r) => r.dom),
      altcoinSeasonTimeseriesData: rows.map((r) => r.alt),
      fredVix: rows.map((r) => r.vix),
      fredUmcsent: rows.map((r) => r.umcsent),
      fredT10y2y: rows.map((r) => r.t10y2y),
    };

    const shallowWindow = (series) => series.filter(
      (d) => d.time >= '2021-11-01' && d.time <= '2022-05-31' && d.btcPrice >= 35000 && d.btcPrice <= 45000,
    );
    const avgFei = (pts) => pts.reduce((s, d) => s + d.fei, 0) / pts.length;

    const cryptoNoDamp = computeFloorEchoIndex({ ...baseInputs, useDrawdownDampening: false });
    const macroNoDamp = computeFloorEchoIndex({
      ...baseInputs,
      macroWeights: FLOOR_ECHO_MACRO_WEIGHTS,
      useDrawdownDampening: false,
    });
    const cryptoDamp = computeFloorEchoIndex(baseInputs);

    const shallowMacro = shallowWindow(macroNoDamp);
    const shallowCrypto = shallowWindow(cryptoNoDamp);
    const shallowDamp = shallowWindow(cryptoDamp);
    const deepDamp = cryptoDamp.filter((d) => d.time >= '2022-10-01' && d.btcPrice <= 20000);

    expect(shallowDamp.every((d) => (d.dampening ?? 1) < 0.85)).toBe(true);
    expect(shallowDamp.some((d) => d.nearHistoricFloor)).toBe(false);
    expect(avgFei(deepDamp)).toBeLessThan(avgFei(shallowDamp));
    expect(deepDamp.some((d) => (d.dampening ?? 0) >= 0.95)).toBe(true);

    const shallowMid = Math.floor(shallowMacro.length / 2);
    const macroContrib = getFloorEchoComponentContributions(
      shallowMacro[shallowMid].stressParts,
      { ...FLOOR_ECHO_WEIGHTS, ...FLOOR_ECHO_MACRO_WEIGHTS },
    );
    const cryptoContrib = getFloorEchoComponentContributions(
      shallowCrypto[shallowMid].stressParts,
      FLOOR_ECHO_WEIGHTS,
    );
    expect(macroContrib.some((c) => c.key === 'macroStress' || c.key === 'liquidityStress')).toBe(true);
    expect(cryptoContrib.some((c) => c.key === 'macroStress')).toBe(false);
  });
});