import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { balanceAt } from '../shared/finance';
import type { Order } from '../shared/types';

type Checks = {
  check: (value: unknown, message: string) => void;
  rejects: (sql: string, args: unknown[], message: string) => Promise<void>;
  asUser: (id: string) => Promise<void>;
};
export async function checkCrud(
  db: pg.Client,
  uid: string,
  other: string,
  { check, rejects, asUser }: Checks,
) {
  const customer = (
    await db.query("select public.save_customer('CRUD khách','0900000011','Địa chỉ',true) as r")
  ).rows[0].r.id;
  const product = (await db.query("select public.save_product('CRUD sản phẩm',500000) as r"))
    .rows[0].r.id;
  const note = (await db.query("select public.save_note($1,'Ghi chú ban đầu') as r", [customer]))
    .rows[0].r.id;
  await db.query("select public.save_customer('CRUD đã sửa','0900000022','Địa chỉ mới',false,$1)", [
    customer,
  ]);
  await db.query("select public.save_note($1,'Ghi chú đã sửa',$2)", [customer, note]);
  check(
    (await db.query('select content from public.customer_notes where id=$1', [note])).rows[0]
      .content === 'Ghi chú đã sửa',
    'Notes can be edited',
  );
  await db.query("select public.set_record_deleted('note',$1,true)", [note]);
  check(
    (await db.query('select deleted_at from public.customer_notes where id=$1', [note])).rows[0]
      .deleted_at,
    'Deleted note is retained with a timestamp',
  );

  const order = randomUUID();
  await db.query('select public.create_order($1,$2,$3,$4,$5,$6,$7)', [
    order,
    customer,
    '2026-01-15',
    true,
    JSON.stringify([{ product_id: product, quantity: 2 }]),
    200000,
    'CRUD',
  ]);
  const rate = (
    await db.query('select interest_per_million from public.orders where id=$1', [order])
  ).rows[0].interest_per_million;
  await db.query('update public.stores set interest_per_million=10000 where owner_id=$1', [uid]);
  await db.query("select public.save_product('Danh mục đã sửa',900000,$1)", [product]);
  await db.query("select public.set_record_deleted('product',$1,true)", [product]);
  const items = JSON.stringify([{ product_id: product, quantity: 2, price: 550000 }]);
  await db.query("select public.update_order($1,1,'2026-01-16',true,$2,'Đã sửa')", [order, items]);
  let row = (await db.query('select * from public.orders where id=$1', [order])).rows[0];
  check(
    Number(row.total) === 1100000 && row.interest_per_million === rate && row.version === 2,
    'Order edit changes total but retains its rate snapshot',
  );
  const itemRows = (
    await db.query('select * from public.order_items where order_id=$1 order by updated_at', [
      order,
    ])
  ).rows;
  check(
    itemRows.length === 2 &&
      itemRows.filter((item) => item.deleted_at).length === 1 &&
      itemRows.find((item) => !item.deleted_at)?.name === 'CRUD sản phẩm',
    'Order edit archives old line items and preserves snapshot names, including deleted catalog products',
  );
  const down = (
    await db.query("select * from public.payments where order_id=$1 and kind='down_payment'", [
      order,
    ])
  ).rows[0];
  check(down.paid_on === '2026-01-16', 'Moving purchase date also moves active down payment');
  await rejects(
    "select public.update_order($1,1,'2026-01-16',true,$2,'Stale')",
    [order, items],
    'Stale order edit rejected',
  );
  await rejects(
    'select public.create_order($1,$2,$3,$4,$5,$6,$7)',
    [
      randomUUID(),
      customer,
      '2026-01-16',
      true,
      JSON.stringify([{ product_id: product, quantity: 1 }]),
      0,
      '',
    ],
    'Deleted product cannot be added to a new order',
  );
  await rejects(
    "select public.save_product('Stale edit',1,$1)",
    [product],
    'Cannot edit a deleted product',
  );
  await db.query("select public.set_record_deleted('product',$1,false)", [product]);

  const payment = randomUUID();
  await db.query("select public.record_payment($1,$2,100000,'2026-02-10','Góp')", [payment, order]);
  await db.query("select public.update_payment($1,$2,1,200000,'2026-02-08','Sửa khoản thu')", [
    payment,
    order,
  ]);
  check(
    Number(
      (await db.query('select amount from public.payments where id=$1', [payment])).rows[0].amount,
    ) === 200000,
    'Installment amount and date can be corrected',
  );
  await rejects(
    "select public.update_payment($1,$2,1,200000,'2026-02-08','Stale')",
    [payment, order],
    'Stale payment edit rejected',
  );
  await rejects(
    "select public.update_payment($1,$2,2,1000000000000,'2026-02-08','Invalid')",
    [payment, order],
    'Payment edit cannot exceed historical debt',
  );
  await rejects(
    "select public.update_payment($1,$2,2,1,'2026-01-01','Invalid')",
    [payment, order],
    'Payment cannot precede the order',
  );
  await rejects(
    "select public.update_order($1,2,'2026-01-16',true,$2,'Invalid')",
    [order, JSON.stringify([{ product_id: product, quantity: 1, price: 10000 }])],
    'Reducing order below existing payments is rejected atomically',
  );
  row = (await db.query('select * from public.orders where id=$1', [order])).rows[0];
  check(
    row.version === 2 && Number(row.total) === 1100000,
    'Rejected edit leaves order version and total unchanged',
  );
  await rejects(
    "select public.update_payment($1,$2,$3,100000,'2026-01-17','Invalid')",
    [down.id, order, down.version],
    'Down payment must remain on purchase date',
  );
  await db.query("select public.update_payment($1,$2,$3,100000,'2026-01-16','Sửa trả trước')", [
    down.id,
    order,
    down.version,
  ]);
  const beforeDelete = (
    await db.query("select public.order_balance($1,'2026-03-01') as b", [order])
  ).rows[0].b;
  await db.query("select public.set_record_deleted('payment',$1,true)", [down.id]);
  const afterDelete = (await db.query("select public.order_balance($1,'2026-03-01') as b", [order]))
    .rows[0].b;
  check(
    afterDelete.total > beforeDelete.total,
    'Soft-deleting down payment recalculates principal and accumulated interest',
  );
  await db.query("select public.set_record_deleted('payment',$1,false)", [down.id]);
  check(
    (await db.query("select public.order_balance($1,'2026-03-01') as b", [order])).rows[0].b
      .total === beforeDelete.total,
    'Restoring a payment restores the exact debt',
  );
  await db.query("select public.set_record_deleted('payment',$1,true)", [payment]);
  const due = (await db.query("select public.order_balance($1,'2026-02-10') as b", [order])).rows[0]
    .b.total;
  const settlement = randomUUID();
  await db.query("select public.record_payment($1,$2,$3,'2026-02-10','Tất toán')", [
    settlement,
    order,
    due,
  ]);
  await rejects(
    "select public.set_record_deleted('payment',$1,false)",
    [payment],
    'Restoring a payment is rejected if later payments would overpay',
  );
  check(
    (await db.query('select deleted_at from public.payments where id=$1', [payment])).rows[0]
      .deleted_at,
    'Failed restoration retains the deletion marker',
  );
  await db.query("select public.set_record_deleted('payment',$1,true)", [settlement]);
  await db.query("select public.set_record_deleted('payment',$1,false)", [payment]);
  await db.query("select public.set_record_deleted('order',$1,true)", [order]);
  await rejects(
    "select public.record_payment($1,$2,1,'2026-03-01','')",
    [randomUUID(), order],
    'Cannot record payment on deleted order',
  );
  await rejects(
    "select public.set_record_deleted('payment',$1,false)",
    [settlement],
    'Cannot restore a child of a deleted order',
  );
  check(
    (await db.query('select * from public.payments where order_id=$1', [order])).rowCount === 3,
    'Deleting an order retains all payments physically',
  );
  await db.query("select public.set_record_deleted('order',$1,false)", [order]);
  check(
    (await db.query('select deleted_at from public.payments where id=$1', [settlement])).rows[0]
      .deleted_at,
    'Restoring parent does not restore separately deleted payments',
  );
  await db.query("select public.set_record_deleted('customer',$1,true)", [customer]);
  await rejects(
    "select public.order_balance($1,'2026-03-01')",
    [order],
    'Deleted customer hides related order balance',
  );
  await rejects(
    "select public.save_note($1,'Invalid')",
    [customer],
    'Cannot add notes to deleted customer',
  );
  await rejects(
    "select public.update_order($1,2,'2026-01-16',true,$2,'Invalid')",
    [order, items],
    'Cannot edit an order of a deleted customer',
  );
  await db.query("select public.set_record_deleted('customer',$1,false)", [customer]);
  check(
    (await db.query('select deleted_at from public.customer_notes where id=$1', [note])).rows[0]
      .deleted_at,
    'Restoring customer does not restore separately deleted notes',
  );
  await db.query("select public.set_record_deleted('note',$1,false)", [note]);
  await db.query("select public.set_record_deleted('note',$1,false)", [note]);
  check(
    !(await db.query('select deleted_at from public.customer_notes where id=$1', [note])).rows[0]
      .deleted_at,
    'Restore is idempotent',
  );
  for (const table of [
    'customers',
    'products',
    'customer_notes',
    'orders',
    'order_items',
    'payments',
  ]) {
    await rejects('delete from public.' + table, [], 'Hard delete denied for ' + table);
  }
  await rejects(
    'select public.mhq_assert_order_payments($1)',
    [order],
    'Private financial helper is not an authenticated RPC',
  );
  row = (await db.query('select * from public.orders where id=$1', [order])).rows[0];
  const payments = (
    await db.query('select * from public.payments where order_id=$1', [order])
  ).rows.map((p) => ({
    ...p,
    amount: Number(p.amount),
    paid_on: p.paid_on,
    created_at: p.created_at.toISOString(),
  }));
  const jsOrder: Order = {
    ...row,
    total: Number(row.total),
    ordered_on: row.ordered_on,
    items: [],
    payments,
  };
  for (const date of ['2026-01-16', '2026-02-01', '2026-02-08', '2026-03-01', '2026-10-24']) {
    const sql = (await db.query('select public.order_balance($1,$2) as b', [order, date])).rows[0]
      .b;
    const js = balanceAt(jsOrder, date);
    check(
      sql.total === js.total && sql.interest === js.interest && sql.principal === js.principal,
      'SQL/TypeScript agree after financial edits and soft deletion at ' + date,
    );
  }
  await asUser(other);
  await rejects(
    "select public.set_record_deleted('customer',$1,true)",
    [customer],
    'Cannot soft-delete another store’s customer',
  );
  await rejects(
    "select public.set_record_deleted('order',$1,false)",
    [order],
    'Cannot restore another store’s order',
  );
  await rejects(
    "select public.update_payment($1,$2,2,1,'2026-02-08','')",
    [payment, order],
    'Cannot edit another store’s payment',
  );
  await asUser(uid);
}
