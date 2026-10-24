import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStatement, type StatementSource } from '../server/modules/sharing/statement';
import { customerShareUrl, isShareToken } from '../shared/sharing';
import { balanceAt } from '../shared/finance';

test('share URLs keep the capability out of the server request path and query', () => {
  const token = 'ab'.repeat(32);
  assert.equal(isShareToken(token), true);
  for (const invalid of ['', 'a'.repeat(63), 'a'.repeat(65), 'A'.repeat(64), '../customers/123'])
    assert.equal(isShareToken(invalid), false);
  const url = new URL(customerShareUrl('https://mhq.toeic-handbook.site', token));
  assert.equal(url.pathname, '/share');
  assert.equal(url.search, '');
  assert.equal(url.hash, '#' + token);
  assert.equal(url.origin, 'https://mhq.toeic-handbook.site');
});

test('customer statement uses the same interest engine and never publishes internal notes or record IDs', () => {
  const source: StatementSource = {
    store_name: 'Cửa hàng',
    customer_name: 'Khách nhận link',
    orders: [
      {
        code: 'DH-TEST',
        ordered_on: '2026-01-15',
        total: 1000000,
        apply_interest: true,
        interest_per_million: 20000,
        items: [{ name: 'Tủ', quantity: 1, price: 1000000 }],
        payments: [
          {
            id: 'private-payment-id',
            paid_on: '2026-01-15',
            amount: 200000,
            kind: 'down_payment',
            note: 'private-down-payment-note',
            created_at: '2026-01-15T00:00:00Z',
          },
          {
            id: 'private-installment-id',
            paid_on: '2026-02-10',
            amount: 116000,
            kind: 'installment',
            note: 'private-payment-note',
            created_at: '2026-02-10T00:00:00Z',
          },
        ],
      },
      {
        code: 'DH-WAIVED',
        ordered_on: '2026-01-20',
        total: 500000,
        apply_interest: false,
        interest_per_million: 90000,
        items: [],
        payments: [],
      },
      {
        code: 'DH-DELETED',
        ordered_on: '2026-01-20',
        total: 999999,
        apply_interest: true,
        interest_per_million: 20000,
        items: [],
        payments: [],
        deleted_at: '2026-02-01T00:00:00Z',
      },
    ],
  };
  const statement = buildStatement(
    { ...source, private_notes: 'private-customer-note' } as StatementSource,
    new Date('2026-03-01T00:00:00Z'),
  );
  const expected = balanceAt(source.orders[0], '2026-03-01');
  assert.equal(statement.orders.length, 2);
  assert.equal(statement.orders[0].balance.total, expected.total);
  assert.equal(statement.orders[0].balance.interest, 14000);
  assert.equal(statement.balance.total, 1214000);
  assert.equal(statement.balance.paid, 316000);
  assert.equal(statement.orders[1].balance.interest, 0);
  const json = JSON.stringify(statement);
  assert.ok(!json.includes('private'));
  assert.ok(!json.includes('payment_id'));
  assert.ok(!json.includes('DH-DELETED'));
  assert.equal(statement.orders[0].balance.ledger[2].label, 'Thu trả góp');
  // The reusable computation must not mutate the source payment memos.
  assert.equal(source.orders[0].payments[1].note, 'private-payment-note');
});

test('statement as-of date follows Vietnam month boundary and excludes future purchases/payments', () => {
  const source: StatementSource = {
    store_name: 'MHQ',
    customer_name: 'KH',
    orders: [
      {
        code: 'A',
        ordered_on: '2026-01-01',
        total: 1000000,
        apply_interest: true,
        interest_per_million: 20000,
        items: [],
        payments: [],
      },
      {
        code: 'B',
        ordered_on: '2026-02-02',
        total: 2000000,
        apply_interest: true,
        interest_per_million: 20000,
        items: [],
        payments: [],
      },
    ],
  };
  const statement = buildStatement(source, new Date('2026-01-31T17:01:00Z'));
  assert.equal(statement.as_of, '2026-02-01');
  assert.equal(statement.orders.length, 1);
  assert.equal(statement.balance.interest, 20000);
});
