/**
 * Public entry point for the frontend data layer (service-side).
 *
 * Charts should import hooks from `hooks/useChartData.js` (see docs/DATA_LAYER.md).
 * Service getters/formatters:
 *   import { dataService, getBtcPriceSeries, normalizePriceData } from '../data';
 */

export * from './DataService';
export { initializeDataService, dataService } from './DataService';