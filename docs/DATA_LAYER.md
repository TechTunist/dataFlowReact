# Frontend data layer (for new contributors)

**Read this before adding or editing a chart.**

## One path for market data

```
Chart / Scene
    │
    ├─ useChartData() / useData()           → series arrays (btcData, …)
    ├─ useChartDataActions() / useDataActions() → fetchBtcData, …
    │
    ▼
DataContext (React cache + preload + IndexedDB)
    │
    ▼
DataService (formatters + endpoint getters)
    │
    ▼
Backend REST (/api/…)
```

Do **not** from a chart:
- `fetch('/api/...')` for series already in DataService
- open IndexedDB yourself
- copy-paste another chart’s 40-line normalize mapper (use DataService formatters)

## Canonical chart skeleton

```jsx
import { useChartData, useChartDataActions, useEnsureSeries } from '../hooks/useChartData';

export default function MyChart() {
  const { btcData } = useChartData();
  const { fetchBtcData } = useChartDataActions();

  useEnsureSeries({
    ready: (btcData?.length || 0) > 0,
    load: () => fetchBtcData(),
  });

  // render from btcData …
}
```

Legacy `useContext(DataContext)` still works but is **deprecated** for new code.

## Adding a new series

1. Add getter + formatter in `src/data/DataService.js`.
2. Thin `fetchX` in `DataContext.js` that only calls the service + `setState`.
3. Expose via context value (data key + `fetchX` action).
4. Consume with `useChartData` / `useChartDataActions`.

## Workbench

- Orchestrator: `components/Workbench.jsx` (chart sync)
- UI: `components/workbench/WorkbenchView.jsx`
- Series catalog: `components/workbench/availableSeries.js`
- Loads: `ensureSeriesLoaded` in DataService via management hook

## Related

- Living status: monorepo `STATUS.md`
- Safety (backend data): `BACKEND_DATA_PIPELINE_SAFETY_RUNBOOK.md`
