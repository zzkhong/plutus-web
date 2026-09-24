import test from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, formatAmountWithSgd, formatMoney, formatMonthLabel, monthKeyOf, shiftMonth } from './format';

test('formatMoney matches the bot', () => {
  assert.equal(formatMoney(450), 'S$4.50');
  assert.equal(formatMoney(4500, 'MYR'), 'RM45.00');
  assert.equal(formatMoney(1000, 'USD'), '$10.00');
  assert.equal(formatMoney(123456), 'S$1,234.56');
  assert.equal(formatMoney(-2050), '-S$20.50');
  assert.equal(formatAmountWithSgd(4500, 'MYR', 1402), 'RM45.00 (S$14.02)');
  assert.equal(formatAmountWithSgd(450, 'SGD', 450), 'S$4.50');
});

test('months and days are Singapore time, not UTC', () => {
  // 16:30 UTC on 31 August is 00:30 on 1 September in Singapore.
  const instant = new Date(Date.UTC(2026, 7, 31, 16, 30));
  assert.equal(monthKeyOf(instant), '2026-09');
  assert.equal(dayKey(instant.toISOString()), '2026-09-01');
});

test('shiftMonth crosses year boundaries', () => {
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-09', 0), '2026-09');
  assert.equal(formatMonthLabel('2026-09'), 'September 2026');
});
