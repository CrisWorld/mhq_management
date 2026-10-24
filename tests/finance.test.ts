import { test } from 'node:test';
import assert from 'node:assert/strict';
import { balanceAt, customerDebt, monthlyReport, todayVN } from '../shared/finance';
import type { Order, Payment } from '../shared/types';
const order = (patch: Partial<Order> = {}): Order => ({
  id: 'o1',
  code: 'DH-01',
  customer_id: 'c1',
  ordered_on: '2026-01-15',
  total: 1000000,
  apply_interest: true,
  interest_per_million: 20000,
  note: '',
  created_at: '2026-01-15T00:00:00Z',
  items: [],
  payments: [],
  ...patch,
});
const payment = (
  amount: number,
  paid_on: string,
  kind: Payment['kind'] = 'installment',
): Payment => ({
  id: paid_on,
  order_id: 'o1',
  amount,
  paid_on,
  kind,
  note: '',
  created_at: paid_on + 'T01:00:00Z',
});
test('purchase month is free; 1m = 20k and 500k = 10k from next calendar month', () => {
  assert.equal(balanceAt(order(), '2026-01-31').interest, 0);
  assert.equal(balanceAt(order(), '2026-02-01').interest, 20000);
  assert.equal(balanceAt(order({ total: 500000 }), '2026-02-01').interest, 10000);
});
test('down payment reduces principal immediately; no compound interest', () => {
  const o = order({ total: 2000000, payments: [payment(1000000, '2026-01-15', 'down_payment')] });
  assert.equal(balanceAt(o, '2026-04-01').principal, 1000000);
  assert.equal(balanceAt(o, '2026-04-01').interest, 60000);
});
test('payment settles interest first, then next month interest uses remaining principal', () => {
  const o = order({ payments: [payment(220000, '2026-02-10')] });
  const b = balanceAt(o, '2026-03-01');
  assert.equal(b.principal, 800000);
  assert.equal(b.interest, 16000);
  assert.equal(b.paid, 220000);
});
test('month-start accrual precedes payment on the same day', () => {
  const b = balanceAt(order({ payments: [payment(20000, '2026-02-01')] }), '2026-02-01');
  assert.equal(b.principal, 1000000);
  assert.equal(b.interest, 0);
});
test('waived order stays interest free; snapshot rate is independent from store', () => {
  assert.equal(balanceAt(order({ apply_interest: false }), '2026-12-01').interest, 0);
  assert.equal(balanceAt(order({ interest_per_million: 10000 }), '2026-03-01').interest, 20000);
});
test('paid off principal never earns new interest', () => {
  const b = balanceAt(order({ payments: [payment(1020000, '2026-02-10')] }), '2026-12-31');
  assert.equal(b.total, 0);
  assert.equal(b.accrued, 20000);
});
test('past reports exclude later payments and future purchases', () => {
  const o = order({ payments: [payment(220000, '2026-03-10')] });
  assert.equal(balanceAt(o, '2026-02-28').total, 1020000);
  assert.equal(balanceAt(o, '2025-12-31').total, 0);
});
test('pending is distinct customers; every older unpaid order needs an installment', () => {
  const o = order(),
    another = order({ id: 'o2' }),
    paid = order({ id: 'o3', customer_id: 'c2', payments: [payment(100000, '2026-02-10')] }),
    newOrder = order({ id: 'o4', customer_id: 'c3', ordered_on: '2026-02-05' });
  assert.deepEqual(
    monthlyReport([o, another, paid, newOrder], '2026-02', '2026-02-28').pendingIds,
    ['c1'],
  );
  assert.equal(
    monthlyReport([o, another, paid, newOrder], '2026-02', '2026-02-28').collected,
    100000,
  );
});
test('one customer with two orders is pending if one older order remains unpaid this month', () => {
  const p = order({ payments: [payment(100000, '2026-02-10')] }),
    u = order({ id: 'o2' });
  assert.deepEqual(monthlyReport([p, u], '2026-02', '2026-02-28').pendingIds, ['c1']);
});
test('partial interest payment leaves simple interest accumulation, leap years and year rollover', () => {
  const b = balanceAt(
    order({ ordered_on: '2023-12-31', payments: [payment(5000, '2024-01-01')] }),
    '2024-03-01',
  );
  assert.equal(b.interest, 55000);
  assert.equal(b.principal, 1000000);
});
test('VND rounding is deterministic, including large amounts', () => {
  assert.equal(balanceAt(order({ total: 25 }), '2026-02-01').interest, 1);
  assert.equal(
    balanceAt(order({ total: 1000000000000, interest_per_million: 999999 }), '2026-02-01').interest,
    999999000000,
  );
});
test('uses Vietnam date around UTC month boundary', () => {
  assert.equal(todayVN(new Date('2026-01-31T18:00:00Z')), '2026-02-01');
});
test('deleted payments are excluded from balance, pending status and monthly collections', () => {
  const o = order({
    payments: [{ ...payment(220000, '2026-02-10'), deleted_at: '2026-02-11T00:00:00Z' }],
  });
  assert.equal(balanceAt(o, '2026-03-01').total, 1040000);
  assert.equal(balanceAt(o, '2026-03-01').paid, 0);
  const report = monthlyReport([o], '2026-02', '2026-02-28');
  assert.equal(report.collected, 0);
  assert.deepEqual(report.pendingIds, ['c1']);
});
test('deleted orders are excluded from debt, revenue and collections, including historical reports', () => {
  const o = order({
    deleted_at: '2026-03-01T00:00:00Z',
    payments: [payment(100000, '2026-01-15', 'down_payment')],
  });
  assert.equal(balanceAt(o, '2026-01-31').total, 0);
  assert.equal(customerDebt([o], 'c1', '2026-02-28').total, 0);
  const report = monthlyReport([o], '2026-01', '2026-01-31');
  assert.equal(report.revenue, 0);
  assert.equal(report.collected, 0);
  assert.equal(report.orderCount, 0);
});
