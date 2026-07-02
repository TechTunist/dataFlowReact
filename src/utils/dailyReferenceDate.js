import { calendarTodayISO } from './stockQuoteDate';

/**
 * Daily crypto series (BTC etc.) often lag by one calendar day until the nightly DB update.
 * Bump to calendar today when the last bar is older, so LastUpdated, cycle counters, and
 * live chart overlays stay aligned (same idea as effectiveStockQuoteDate for equities).
 */
export function effectiveDailyReferenceDate(lastBarDate, date = new Date()) {
  if (!lastBarDate) return calendarTodayISO(date);
  const today = calendarTodayISO(date);
  return lastBarDate < today ? today : lastBarDate;
}

export function getBtcReferenceDate(btcData, date = new Date()) {
  const lastBar = btcData?.length > 0 ? btcData[btcData.length - 1].time : null;
  return effectiveDailyReferenceDate(lastBar, date);
}