import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import type { State, TrashRecord } from '../shared/types';
import { balanceAt, monthlyReport, todayVN } from '../shared/finance';

type Call = (path: string, method?: string, body?: unknown, expected?: number) => Promise<any>;
export async function checkLiveCrud(
  call: Call,
  db: pg.Client,
  uid: string,
  customerId: string,
  productId: string,
  orderId: string,
  paymentId: string,
) {
  const customerPath = 'customers/' + customerId;
  const orderPath = 'orders/' + orderId;
  const paymentPath = orderPath + '/payments/' + paymentId;
  const restore = (type: string, id: string) => call(`trash/${type}/${id}/restore`, 'PATCH');
  let state: State = await call('state');
  const noteId = state.notes[0].id;
  const notePath = `${customerPath}/notes/${noteId}`;
  await call(customerPath, 'PATCH', {
    name: 'Khách đã sửa',
    phone: '0900000088',
    address: 'Địa chỉ mới',
    apply_interest: false,
  });
  await call(notePath, 'PATCH', { content: 'Ghi chú đã cập nhật' });
  await call(notePath, 'DELETE');
  state = await call('state');
  assert.equal(state.notes.length, 0);
  assert.equal(state.orders[0].apply_interest, true);
  await call(notePath, 'PATCH', { content: 'Không được sửa dữ liệu đã xoá' }, 400);
  let trash: TrashRecord[] = await call('trash');
  assert.ok(trash.find((row) => row.type === 'note' && row.id === noteId));
  await restore('note', noteId);
  state = await call('state');
  assert.equal(state.notes[0].content, 'Ghi chú đã cập nhật');
  const update = {
    version: state.orders[0].version,
    ordered_on: state.orders[0].ordered_on,
    apply_interest: true,
    items: [{ product_id: productId, quantity: 3, price: 500000 }],
    note: 'Đơn đã sửa',
  };
  await call(orderPath, 'PATCH', update);
  await call(orderPath, 'PATCH', update, 400);
  state = await call('state');
  assert.equal(state.orders[0].total, 1500000);
  assert.equal(state.orders[0].interest_per_million, 20000);
  assert.equal(state.orders[0].items[0].price, 500000);
  const payment = state.orders[0].payments.find((row) => row.id === paymentId)!;
  const paymentUpdate = {
    version: payment.version,
    amount: 216000,
    paid_on: todayVN(),
    note: 'Khoản thu đã sửa',
  };
  await call(paymentPath, 'PATCH', paymentUpdate);
  await call(paymentPath, 'PATCH', paymentUpdate, 400);
  await call(
    paymentPath,
    'PATCH',
    { ...paymentUpdate, version: (payment.version || 1) + 1, amount: 999999999 },
    400,
  );
  state = await call('state');
  const beforeDelete = balanceAt(state.orders[0]).total;
  assert.equal(monthlyReport(state.orders, todayVN().slice(0, 7)).collected, 216000);
  await call(paymentPath, 'DELETE');
  await call(paymentPath, 'DELETE');
  state = await call('state');
  assert.equal(state.orders[0].payments.length, 1);
  assert.ok(balanceAt(state.orders[0]).total > beforeDelete);
  assert.equal(monthlyReport(state.orders, todayVN().slice(0, 7)).collected, 0);
  assert.deepEqual(monthlyReport(state.orders, todayVN().slice(0, 7)).pendingIds, [customerId]);
  await restore('payment', paymentId);
  state = await call('state');
  assert.equal(balanceAt(state.orders[0]).total, beforeDelete);
  await call('products/' + productId, 'DELETE');
  state = await call('state');
  assert.equal(state.products.length, 0);
  assert.equal(state.orders[0].items[0].name, 'SP kiểm thử');
  await call(orderPath, 'PATCH', {
    ...update,
    version: state.orders[0].version,
    note: 'Giữ sản phẩm đã xoá trong đơn cũ',
  });
  await call(
    'orders',
    'POST',
    {
      id: randomUUID(),
      customer_id: customerId,
      ordered_on: todayVN(),
      apply_interest: true,
      items: [{ product_id: productId, quantity: 1 }],
      down_payment: 0,
      note: '',
    },
    400,
  );
  await restore('product', productId);
  await call(orderPath, 'DELETE');
  state = await call('state');
  assert.equal(state.orders.length, 0);
  await call(
    orderPath + '/payments',
    'POST',
    { id: randomUUID(), amount: 1, paid_on: todayVN(), note: '' },
    400,
  );
  await restore('order', orderId);
  state = await call('state');
  assert.equal(state.orders[0].payments.length, 2);
  await call(paymentPath, 'DELETE');
  await call(notePath, 'DELETE');
  await call(customerPath, 'DELETE');
  state = await call('state');
  assert.equal(state.customers.length, 0);
  assert.equal(state.orders.length, 0);
  assert.equal(state.notes.length, 0);
  trash = await call('trash');
  assert.ok(trash.find((row) => row.id === paymentId)?.parent_deleted);
  assert.ok(trash.find((row) => row.id === noteId)?.parent_deleted);
  await call(`trash/payment/${paymentId}/restore`, 'PATCH', undefined, 400);
  await restore('customer', customerId);
  state = await call('state');
  assert.equal(state.orders.length, 1);
  assert.equal(state.orders[0].payments.length, 1);
  assert.equal(state.notes.length, 0);
  await restore('note', noteId);
  await restore('payment', paymentId);
  await call(`trash/invalid/${noteId}/restore`, 'PATCH', undefined, 400);
  await call(notePath, 'DELETE');
  await call(paymentPath, 'DELETE');
  await call(orderPath, 'DELETE');
  await call(customerPath, 'DELETE');
  await call('products/' + productId, 'DELETE');
  for (const [table, id] of [
    ['customers', customerId],
    ['products', productId],
    ['customer_notes', noteId],
    ['orders', orderId],
    ['payments', paymentId],
  ]) {
    const rows = (
      await db.query(`select deleted_at from public.${table} where id=$1 and owner_id=$2`, [
        id,
        uid,
      ])
    ).rows;
    assert.equal(rows.length, 1, table + ' must still physically exist');
    assert.ok(rows[0].deleted_at, table + ' must have a deletion timestamp');
  }
  console.log(
    'PASS CRUD, reversible deletion, parent visibility, snapshots and physical retention',
  );
}
