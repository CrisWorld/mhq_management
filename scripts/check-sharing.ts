import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import type { StatementSource } from '../server/modules/sharing/statement';
import { buildStatement } from '../server/modules/sharing/statement';

type Helpers = {
  check: (value: unknown, message: string) => void;
  rejects: (sql: string, args: unknown[], message: string) => Promise<void>;
  asUser: (uid: string) => Promise<void>;
};
export async function checkSharing(
  db: pg.Client,
  uid: string,
  other: string,
  { check, rejects, asUser }: Helpers,
) {
  await db.query('reset role');
  const customer = randomUUID(),
    secondCustomer = randomUUID(),
    foreignCustomer = randomUUID(),
    product = randomUUID(),
    order = randomUUID();
  await db.query(
    "insert into public.customers(id,owner_id,name,phone,address) values ($1,$2,'Người nhận chia sẻ','0900000000','private-address'),($3,$2,'Khách khác','',''),($4,$5,'Khách cửa hàng khác','','')",
    [customer, uid, secondCustomer, foreignCustomer, other],
  );
  await db.query(
    "insert into public.customer_notes(owner_id,customer_id,content) values ($1,$2,'private-customer-note')",
    [uid, customer],
  );
  await db.query(
    "insert into public.products(id,owner_id,name,price) values ($1,$2,'Tủ chia sẻ',1000000)",
    [product, uid],
  );
  await asUser(uid);
  check(
    (await db.query('select public.get_customer_share($1) as link', [customer])).rows[0].link ===
      null,
    'Customer has no public link by default',
  );
  await db.query(
    "select public.create_order($1,$2,'2026-01-15',true,$3,200000,'private-order-note')",
    [order, customer, JSON.stringify([{ product_id: product, quantity: 1 }])],
  );
  const payment = randomUUID();
  await db.query("select public.record_payment($1,$2,116000,'2026-02-10','private-payment-note')", [
    payment,
    order,
  ]);
  const first = (await db.query('select public.create_customer_share($1) as link', [customer]))
    .rows[0].link;
  check(/^[a-f0-9]{64}$/.test(first.token), 'Share capability has 256 random bits');
  const retry = (await db.query('select public.create_customer_share($1) as link', [customer]))
    .rows[0].link;
  check(retry.token === first.token, 'Retries and repeated sharing reuse the active link');
  const second = (
    await db.query('select public.create_customer_share($1) as link', [secondCustomer])
  ).rows[0].link;
  check(second.token !== first.token, 'Different customers have unrelated share capabilities');
  await asUser(other);
  check(
    (await db.query('select * from public.customer_share_links')).rowCount === 0,
    'Other store cannot enumerate customer links',
  );
  await rejects(
    'select public.create_customer_share($1)',
    [customer],
    'Other store cannot create a link for this customer',
  );
  await rejects(
    'select public.get_customer_share($1)',
    [customer],
    'Other store cannot retrieve this customer’s link',
  );
  await rejects(
    'select public.revoke_customer_share($1)',
    [customer],
    'Other store cannot revoke this customer’s link',
  );
  await db.query('reset role');
  await db.query('set local role anon');
  await rejects(
    'select * from public.customer_share_links',
    [],
    'Anonymous visitors cannot list share tokens',
  );
  await rejects(
    'select public.create_customer_share($1)',
    [customer],
    'Anonymous visitors cannot create links',
  );
  await rejects(
    'select public.revoke_customer_share($1)',
    [customer],
    'Anonymous visitors cannot revoke links',
  );
  check(
    (await db.query('select public.read_customer_share($1) as statement', [customer])).rows[0]
      .statement === null,
    'Customer UUID is not a share capability',
  );
  check(
    (await db.query('select public.read_customer_share($1) as statement', ['0'.repeat(64)])).rows[0]
      .statement === null,
    'Unknown capabilities reveal no data',
  );
  const raw = (await db.query('select public.read_customer_share($1) as statement', [first.token]))
    .rows[0].statement as StatementSource;
  check(
    raw.customer_name === 'Người nhận chia sẻ' && raw.orders.length === 1,
    'Anonymous capability reads only its one customer',
  );
  const serialized = JSON.stringify(raw);
  check(
    !serialized.includes('private-') &&
      !serialized.includes('0900000000') &&
      !serialized.includes(foreignCustomer),
    'Public database RPC excludes notes, phone, address and other customers',
  );
  const statement = buildStatement(raw, new Date('2026-03-01T00:00:00Z'));
  check(
    statement.balance.principal > 0 && statement.balance.paid === 316000,
    'Public statement contains accurate payment history',
  );
  assert.equal(
    statement.orders[0].balance.ledger.filter((entry) => entry.type === 'payment').length,
    2,
  );
  await asUser(uid);
  await db.query("select public.set_record_deleted('payment',$1,true)", [payment]);
  check(
    (await db.query('select public.read_customer_share($1) as statement', [first.token])).rows[0]
      .statement.orders[0].payments.length === 1,
    'Deleted payments disappear from public statements',
  );
  await db.query("select public.set_record_deleted('order',$1,true)", [order]);
  check(
    (await db.query('select public.read_customer_share($1) as statement', [first.token])).rows[0]
      .statement.orders.length === 0,
    'Deleted orders disappear from public statements',
  );
  await db.query('select public.revoke_customer_share($1)', [customer]);
  check(
    (await db.query('select public.read_customer_share($1) as statement', [first.token])).rows[0]
      .statement === null,
    'Revoked link stops working immediately',
  );
  check(
    (await db.query('select * from public.customer_share_links where customer_id=$1', [customer]))
      .rows[0].revoked_at,
    'Revocation retains the link record instead of deleting it',
  );
  const next = (await db.query('select public.create_customer_share($1) as link', [customer]))
    .rows[0].link;
  check(next.token !== first.token, 'Creating after revocation issues a different link');
  await db.query("select public.set_record_deleted('customer',$1,true)", [customer]);
  check(
    (await db.query('select public.read_customer_share($1) as statement', [next.token])).rows[0]
      .statement === null,
    'Soft deleting the customer disables their link',
  );
  await db.query("select public.set_record_deleted('customer',$1,false)", [customer]);
  check(
    (await db.query('select public.read_customer_share($1) as statement', [next.token])).rows[0]
      .statement === null,
    'Restoring a customer never reactivates a previously shared link',
  );
  check(
    (await db.query('select public.get_customer_share($1) as link', [customer])).rows[0].link ===
      null,
    'Owner must explicitly create a new link after restoring a customer',
  );
}
