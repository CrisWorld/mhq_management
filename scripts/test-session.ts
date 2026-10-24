// Use a disposable account to simulate returning after eight days on the real
// hosted Auth service. Tokens/passwords stay in memory and never enter logs/files.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sessionOptions } from '../src/lib/auth/session-options';
import { database } from './db';

const db = database();
const uid = randomUUID();
const email = `mhq-session-${uid}@example.test`;
const password = randomBytes(32).toString('base64url');
const entries = new Map<string, string>();
const storage = {
  getItem: (key: string) => entries.get(key) ?? null,
  setItem: (key: string, value: string) => {
    entries.set(key, value);
  },
  removeItem: (key: string) => {
    entries.delete(key);
  },
};
const clients: SupabaseClient[] = [];
const makeClient = () => {
  const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { ...sessionOptions, storage },
  });
  clients.push(client);
  return client;
};
let currentClient: SupabaseClient | undefined;
try {
  await db.connect();
  await db.query(
    `insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change,email_change_token_current,reauthentication_token) values ('00000000-0000-0000-0000-000000000000',$1,'authenticated','authenticated',$2,crypt($3,gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','','','')`,
    [uid, email, password],
  );
  await db.query(
    "insert into auth.identities(id,user_id,provider_id,identity_data,provider,created_at,updated_at) values ($1::uuid,$2::uuid,$2::text,jsonb_build_object('sub',$2::text,'email',$3::text),'email',now(),now())",
    [randomUUID(), uid, email],
  );
  const first = makeClient();
  currentClient = first;
  const login = await first.auth.signInWithPassword({ email, password });
  assert.ifError(login.error);
  assert.ok(login.data.session);
  await first.auth.stopAutoRefresh();
  const storageKey = `sb-${new URL(process.env.SUPABASE_URL!).hostname.split('.')[0]}-auth-token`;
  const saved = storage.getItem(storageKey);
  assert.ok(saved, 'login must persist using the existing SDK storage key');
  const persisted = JSON.parse(saved);
  const claims = JSON.parse(
    Buffer.from(login.data.session.access_token.split('.')[1], 'base64url').toString(),
  );
  assert.ok(claims.session_id);
  // Backdate the fixture's real session and refresh-token activity. Also move an
  // absolute expiry, if configured, so this does not bypass a hosted time limit.
  const aged = await db.query(
    `update auth.sessions set created_at=created_at-interval '8 days',updated_at=updated_at-interval '8 days',refreshed_at=refreshed_at-interval '8 days',not_after=not_after-interval '8 days' where id=$1 and user_id=$2 returning id`,
    [claims.session_id, uid],
  );
  assert.equal(aged.rowCount, 1);
  await db.query(
    "update auth.refresh_tokens set created_at=created_at-interval '8 days',updated_at=updated_at-interval '8 days' where user_id=$1",
    [uid],
  );
  persisted.expires_at -= 8 * 24 * 60 * 60;
  storage.setItem(storageKey, JSON.stringify(persisted));
  console.log('PASS login persisted; fixture session and refresh-token activity aged eight days');

  const reopened = makeClient();
  currentClient = reopened;
  const restored = await reopened.auth.getSession();
  assert.ifError(restored.error);
  assert.equal(restored.data.session?.user.id, uid);
  assert.notEqual(restored.data.session?.access_token, login.data.session.access_token);
  assert.ok(restored.data.session!.expires_at! > Date.now() / 1000);
  const refreshed = (
    await db.query(
      "select created_at<now()-interval '7 days' as old_session,refreshed_at>now()-interval '2 minutes' as renewed from auth.sessions where id=$1 and user_id=$2",
      [claims.session_id, uid],
    )
  ).rows[0];
  assert.ok(
    refreshed?.old_session && refreshed.renewed,
    'must renew the original old session instead of creating a new password login',
  );
  console.log(
    'PASS reopened client refreshes the original eight-day-old session without another password login',
  );

  const response = await fetch(
    (process.env.TEST_BASE_URL || 'http://localhost:3001') + '/api/state',
    { headers: { Authorization: 'Bearer ' + restored.data.session!.access_token } },
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).store.owner_id, uid);
  console.log('PASS restored session accesses its own store through the deployed API');
  const signedOut = await reopened.auth.signOut({ scope: 'local' });
  assert.ifError(signedOut.error);
  assert.equal(storage.getItem(storageKey), null);
  await reopened.auth.stopAutoRefresh();
  const afterLogout = makeClient();
  currentClient = afterLogout;
  assert.equal((await afterLogout.auth.getSession()).data.session, null);
  console.log('PASS explicit logout clears stored session and remains logged out after reopening');
} finally {
  for (const client of clients) await client.auth.stopAutoRefresh().catch(() => {});
  await currentClient?.auth.signOut({ scope: 'local' }).catch(() => {});
  await db.query('begin');
  try {
    for (const table of [
      'payments',
      'order_items',
      'orders',
      'customer_notes',
      'products',
      'customers',
      'stores',
    ])
      await db.query('delete from public.' + table + ' where owner_id=$1', [uid]);
    await db.query('delete from auth.users where id=$1', [uid]);
    await db.query('commit');
    console.log('Removed only the disposable session-test account and its fixtures.');
  } catch (error) {
    await db.query('rollback');
    throw error;
  } finally {
    await db.end();
  }
}
