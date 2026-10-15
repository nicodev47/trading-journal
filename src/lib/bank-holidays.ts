const pad = (value: number) => String(value).padStart(2, '0');

const key = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

/** Nth weekday (0 = Sunday) of a month, e.g. the 3rd Monday of January. */
function nthWeekday(year: number, month: number, weekday: number, nth: number) {
  const first = new Date(year, month, 1).getDay();
  const day = 1 + ((weekday - first + 7) % 7) + (nth - 1) * 7;

  return key(year, month, day);
}

function lastWeekday(year: number, month: number, weekday: number) {
  const last = new Date(year, month + 1, 0);
  const day = last.getDate() - ((last.getDay() - weekday + 7) % 7);

  return key(year, month, day);
}

/** Fixed-date holiday: a Sunday moves to Monday, a Saturday is not observed. */
function fixed(year: number, month: number, day: number) {
  const weekday = new Date(year, month, day).getDay();

  if (weekday === 6) return null;

  return key(year, month, weekday === 0 ? day + 1 : day);
}

/**
 * United States federal bank holidays (the days the dollar's banks are
 * closed), as YYYY-MM-DD → name.
 */
export function getUsBankHolidays(year: number): Map<string, string> {
  const entries: [string | null, string][] = [
    [fixed(year, 0, 1), 'New Year’s Day'],
    [nthWeekday(year, 0, 1, 3), 'Martin Luther King Jr. Day'],
    [nthWeekday(year, 1, 1, 3), 'Presidents’ Day'],
    [lastWeekday(year, 4, 1), 'Memorial Day'],
    [fixed(year, 5, 19), 'Juneteenth'],
    [fixed(year, 6, 4), 'Independence Day'],
    [nthWeekday(year, 8, 1, 1), 'Labor Day'],
    [nthWeekday(year, 9, 1, 2), 'Columbus Day'],
    [fixed(year, 10, 11), 'Veterans Day'],
    [nthWeekday(year, 10, 4, 4), 'Thanksgiving'],
    [fixed(year, 11, 25), 'Christmas Day'],
  ];

  return new Map(
    entries.filter((entry): entry is [string, string] => entry[0] !== null)
  );
}

export const isUsBankHoliday = (dateKey: string) =>
  getUsBankHolidays(Number(dateKey.slice(0, 4))).has(dateKey);
