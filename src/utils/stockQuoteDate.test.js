import { calendarTodayISO, effectiveStockQuoteDate, isUsWeekday } from './stockQuoteDate';

describe('stockQuoteDate', () => {
  test('effectiveStockQuoteDate bumps prior session date on weekday pre-market', () => {
    const tuesday = new Date(2026, 6, 1); // July 1 2026 local
    expect(isUsWeekday(tuesday)).toBe(true);
    expect(effectiveStockQuoteDate('2026-06-30', tuesday)).toBe('2026-07-01');
  });

  test('effectiveStockQuoteDate keeps same-day as_of_date', () => {
    const tuesday = new Date(2026, 6, 1);
    expect(effectiveStockQuoteDate('2026-07-01', tuesday)).toBe('2026-07-01');
  });

  test('effectiveStockQuoteDate does not bump on weekends', () => {
    const saturday = new Date(2026, 6, 4);
    expect(isUsWeekday(saturday)).toBe(false);
    expect(effectiveStockQuoteDate('2026-07-03', saturday)).toBe('2026-07-03');
  });

  test('calendarTodayISO uses local calendar', () => {
    const d = new Date(2026, 0, 5, 23, 30);
    expect(calendarTodayISO(d)).toBe('2026-01-05');
  });
});