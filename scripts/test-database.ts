import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { database } from './db';
import { balanceAt } from '../shared/finance';
import type { Order } from '../shared/types';
const db = database(),
  uid = randomUUID(),
  other = randomUUID(),
  customer = randomUUID(),
  product = randomUUID(),
  order = randomUUID();
let checks = 0;
function check(value: unknown, message: string) {
  assert.ok(value, message);
  checks++;
  console.log('PASS', message);
}
async function rejects(sql: string, args: unknown[], message: string) {
  await db.query('savepoint expected_failure');
  let failed = false;
  try {
    await db.query(sql, args);
  } catch {
    failed = true;
  }
  await db.query('rollback to savepoint expected_failure');
  check(failed, message);
}
async function asUser(id: string) {
  await db.query('reset role');
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",
    [id],
  );
  await db.query('set local role authenticated');
}
try {
  await db.connect();
  await db.query('begin');
  await db.query(
    "insert into auth.users(id,email,aud,role) values ($1,$2,'authenticated','authenticated'),($3,$4,'authenticated','authenticated')",
    [uid, 'mhq-test-' + uid + '@example.test', other, 'mhq-test-' + other + '@example.test'],
  );
  await db.query('insert into public.stores(owner_id) values ($1),($2)', [uid, other]);
  await asUser(uid);
  await db.query("insert into public.customers(id,owner_id,name) values ($1,$2,'KH kiểm thử')", [
    customer,
    uid,
  ]);
  await db.query(
    "insert into public.products(id,owner_id,name,price) values ($1,$2,'Sản phẩm kiểm thử',2000000)",
    [product, uid],
  );
  const args = [
    order,
    customer,
    '2026-01-15',
    true,
    JSON.stringify([{ product_id: product, quantity: 1 }]),
    1000000,
    'test',
  ];
  await db.query('select public.create_order($1,$2,$3,$4,$5,$6,$7)', args);
  await db.query('select public.create_order($1,$2,$3,$4,$5,$6,$7)', args);
  await rejects(
    'select public.create_order($1,$2,$3,$4,$5,$6,$7)',
    [
      order,
      customer,
      '2026-01-15',
      true,
      JSON.stringify([{ product_id: product, quantity: 1 }]),
      500000,
      'test',
    ],
    'Rejects changed order payload on reused request ID',
  );
  check(
    (await db.query('select * from public.orders where id=$1', [order])).rowCount === 1,
    'Retry creates only one order',
  );
  check(
    (await db.query('select * from public.payments where order_id=$1', [order])).rowCount === 1,
    'Down payment is recorded exactly once',
  );
  let b = (await db.query("select public.order_balance($1,'2026-01-31') as b", [order])).rows[0].b;
  check(
    b.interest === 0 && b.principal === 1000000,
    'Purchase month exempt; down payment deducted',
  );
  b = (await db.query("select public.order_balance($1,'2026-02-01') as b", [order])).rows[0].b;
  check(b.total === 1020000, 'First next-month interest is 20,000 VND');
  const pay = randomUUID();
  await db.query("select public.record_payment($1,$2,220000,'2026-02-10','Tiền mặt')", [
    pay,
    order,
  ]);
  await db.query("select public.record_payment($1,$2,220000,'2026-02-10','Tiền mặt')", [
    pay,
    order,
  ]);
  await rejects(
    "select public.record_payment($1,$2,100000,'2026-02-10','Tiền mặt')",
    [pay, order],
    'Rejects changed payment payload on reused request ID',
  );
  check(
    (await db.query("select * from public.payments where kind='installment'")).rowCount === 1,
    'Retry records only one installment',
  );
  b = (await db.query("select public.order_balance($1,'2026-03-01') as b", [order])).rows[0].b;
  check(
    b.principal === 800000 && b.interest === 16000,
    'Interest-first allocation and reduced principal for next month',
  );
  await db.query('update public.stores set interest_per_million=50000 where owner_id=$1', [uid]);
  await db.query("update public.products set price=500000,name='Giá mới' where id=$1", [product]);
  check(
    (await db.query('select interest_per_million,total from public.orders where id=$1', [order]))
      .rows[0].interest_per_million === 20000,
    'Store policy changes preserve order snapshot',
  );
  check(
    Number(
      (await db.query('select price from public.order_items where order_id=$1', [order])).rows[0]
        .price,
    ) === 2000000,
    'Product edits preserve historical line prices',
  );
  const waived = randomUUID();
  await db.query('select public.create_order($1,$2,$3,$4,$5,$6,$7)', [
    waived,
    customer,
    '2026-02-10',
    false,
    JSON.stringify([{ product_id: product, quantity: 1 }]),
    0,
    '',
  ]);
  check(
    (await db.query("select public.order_balance($1,'2026-10-24') as b", [waived])).rows[0].b
      .interest === 0,
    'Waived order remains interest free',
  );
  await rejects(
    "select public.record_payment($1,$2,999999999,'2026-03-01','')",
    [randomUUID(), order],
    'Rejects overpayment',
  );
  await rejects(
    "select public.record_payment($1,$2,0,'2026-03-01','')",
    [randomUUID(), order],
    'Rejects zero payment',
  );
  await rejects(
    "select public.record_payment($1,$2,1,'2026-02-01','')",
    [randomUUID(), order],
    'Rejects backdating before last payment',
  );
  await rejects(
    "select public.record_payment($1,$2,1,'9999-01-01','')",
    [randomUUID(), order],
    'Rejects future payment',
  );
  await rejects(
    'update public.orders set total=1 where id=$1',
    [order],
    'Direct financial record edits denied',
  );
  await rejects(
    "insert into public.payments(id,owner_id,order_id,amount,paid_on,kind) values($1,$2,$3,1,current_date,'installment')",
    [randomUUID(), uid, order],
    'Direct payment inserts denied',
  );
  const row = (await db.query('select * from public.orders where id=$1', [order])).rows[0];
  const payments = (
    await db.query('select * from public.payments where order_id=$1', [order])
  ).rows.map((p) => ({
    ...p,
    amount: Number(p.amount),
    paid_on: p.paid_on.toISOString().slice(0, 10),
    created_at: p.created_at.toISOString(),
  }));
  const o: Order = {
    ...row,
    total: Number(row.total),
    ordered_on: row.ordered_on.toISOString().slice(0, 10),
    payments,
    items: [],
  };
  for (const date of [
    '2026-01-15',
    '2026-01-31',
    '2026-02-01',
    '2026-02-10',
    '2026-03-01',
    '2026-10-24',
  ]) {
    const sql = (await db.query('select public.order_balance($1,$2) as b', [order, date])).rows[0]
        .b,
      js = balanceAt(o, date);
    check(
      js.total === sql.total && js.principal === sql.principal && js.interest === sql.interest,
      'SQL/TypeScript balances agree at ' + date,
    );
  }
  await asUser(other);
  for (const table of [
    'customers',
    'products',
    'orders',
    'order_items',
    'payments',
    'customer_notes',
  ])
    check(
      (await db.query('select * from public.' + table)).rowCount === 0,
      'RLS isolates ' + table,
    );
  await rejects(
    "select public.record_payment($1,$2,1,'2026-03-01','')",
    [randomUUID(), order],
    'Cannot pay into another owner’s order',
  );
  await rejects(
    'select public.create_order($1,$2,$3,$4,$5,$6,$7)',
    [
      randomUUID(),
      customer,
      '2026-03-01',
      true,
      JSON.stringify([{ product_id: product, quantity: 1 }]),
      0,
      '',
    ],
    'Cannot create an order for another owner’s customer',
  );
  await db.query('reset role');
  await db.query('set local role anon');
  await rejects('select * from public.customers', [], 'Unauthenticated reads denied');
  await db.query('rollback');
  console.log(`${checks} database checks passed; all test fixtures rolled back.`);
} catch (e) {
  await db.query('rollback').catch(() => {});
  throw e;
} finally {
  await db.end();
}
