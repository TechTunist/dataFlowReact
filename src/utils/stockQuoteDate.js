/** Calendar date YYYY-MM-DD in the user's local timezone. */
export function calendarTodayISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isUsWeekday(date = new Date()) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

/**
 * Twelve Data /quote as_of_date often lags to the prior session during pre-market.
 * On US weekdays, bump to calendar today so LastUpdated matches the live price.
 */
export function effectiveStockQuoteDate(asOfDate, date = new Date()) {
  if (!asOfDate) return null;
  if (!isUsWeekday(date)) return asOfDate;
  const today = calendarTodayISO(date);
  return asOfDate < today ? today : asOfDate;
}