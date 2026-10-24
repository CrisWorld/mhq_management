import assert from 'node:assert/strict';
import type { CustomerStatement, CustomerShareLink } from '../shared/sharing';

type Call = (path: string, method?: string, body?: unknown, expected?: number) => Promise<any>;
export async function checkLiveSharing(call: Call, base: string, customerId: string) {
  const path = 'customers/' + customerId + '/share';
  assert.equal((await call(path)).link, null);
  const [first, retry]: CustomerShareLink[] = await Promise.all([
    call(path, 'POST', {}, 201),
    call(path, 'POST', {}, 201),
  ]);
  assert.equal(first.token, retry.token);
  assert.match(first.token, /^[a-f0-9]{64}$/);
  assert.equal((await call(path)).link.token, first.token);
  async function read(token: string, expected = 200) {
    const response = await fetch(base + '/api/public/statement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    assert.equal(response.status, expected, 'Public statement HTTP status');
    assert.match(response.headers.get('cache-control') || '', /no-store/);
    if (expected === 200) assert.match(response.headers.get('x-robots-tag') || '', /noindex/);
    return (await response.json()) as CustomerStatement;
  }
  const statement = await read(first.token);
  assert.equal(statement.customer_name, 'KH kiểm thử');
  assert.equal(statement.orders.length, 1);
  assert.equal(statement.orders[0].items[0].price, 500000);
  assert.equal(statement.orders[0].interest_per_million, 20000);
  assert.equal(statement.balance.total, 700000);
  assert.equal(statement.balance.paid, 316000);
  const data = JSON.stringify(statement);
  for (const hidden of [
    '0900000099',
    'Địa chỉ mẫu',
    'Ghi chú kiểm thử',
    'Tiền mặt kiểm thử',
    'owner_id',
    'customer_id',
    'payment_id',
    'product_id',
  ])
    assert.ok(!data.includes(hidden), 'Must not expose ' + hidden);
  await read('f'.repeat(64), 404);
  await call(path, 'DELETE');
  await read(first.token, 404);
  assert.equal((await call(path)).link, null);
  const replacement: CustomerShareLink = await call(path, 'POST', {}, 201);
  assert.notEqual(replacement.token, first.token);
  await read(first.token, 404);
  await read(replacement.token);
  await call('customers/' + customerId, 'DELETE');
  await read(replacement.token, 404);
  await call('trash/customer/' + customerId + '/restore', 'PATCH', {});
  await read(replacement.token, 404);
  console.log(
    'PASS customer-only public reads without login; private notes excluded; concurrent create, revoke and customer deletion verified',
  );
}
