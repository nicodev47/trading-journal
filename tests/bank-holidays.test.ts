import assert from 'node:assert/strict';
import test from 'node:test';
import { getUsBankHolidays, isUsBankHoliday } from '../src/lib/bank-holidays.ts';

test('festività 2026 degli Stati Uniti', () => {
  const holidays = getUsBankHolidays(2026);

  assert.equal(holidays.get('2026-01-01'), 'New Year’s Day');
  assert.equal(holidays.get('2026-01-19'), 'Martin Luther King Jr. Day');
  assert.equal(holidays.get('2026-02-16'), 'Presidents’ Day');
  assert.equal(holidays.get('2026-05-25'), 'Memorial Day');
  assert.equal(holidays.get('2026-06-19'), 'Juneteenth');
  assert.equal(holidays.get('2026-09-07'), 'Labor Day');
  assert.equal(holidays.get('2026-10-12'), 'Columbus Day');
  assert.equal(holidays.get('2026-11-11'), 'Veterans Day');
  assert.equal(holidays.get('2026-11-26'), 'Thanksgiving');
  assert.equal(holidays.get('2026-12-25'), 'Christmas Day');
});

test('il 4 luglio 2026 cade di sabato e non viene spostato', () => {
  assert.equal(getUsBankHolidays(2026).has('2026-07-04'), false);
  assert.equal(getUsBankHolidays(2026).has('2026-07-03'), false);
});

test('una festività di domenica passa al lunedì', () => {
  // 25 dicembre 2022 era una domenica
  assert.equal(getUsBankHolidays(2022).get('2022-12-26'), 'Christmas Day');
});

test('giorni normali non sono festivi', () => {
  assert.equal(isUsBankHoliday('2026-10-13'), false);
  assert.equal(isUsBankHoliday('2026-10-12'), true);
});
