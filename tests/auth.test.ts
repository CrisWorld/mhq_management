import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AuthRetryableFetchError, createClient, type Session } from '@supabase/supabase-js';
import { createAuthenticatedRequest } from '../src/lib/auth/authenticated-request';
import { sessionOptions } from '../src/lib/auth/session-options';

const session = (token = 'old-token', uid = 'store-owner'): Session => ({
  access_token: token,
  refresh_token: 'synthetic-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: {
    id: uid,
    aud: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-01-01T00:00:00Z',
  },
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const okSession = (value: Session) => ({
  data: { session: value, user: value.user },
  error: null,
});

test('reopening with an expired stored session rotates tokens without another password login; logout stays logged out', async () => {
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
  let passwordLogins = 0,
    refreshes = 0;
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes('/logout')) return new Response(null, { status: 204 });
    if (url.includes('grant_type=password')) {
      passwordLogins++;
      return json(session());
    }
    assert.ok(
      url.includes('grant_type=refresh_token'),
      'only password and refresh endpoints expected',
    );
    refreshes++;
    return json({ ...session('fresh-token'), refresh_token: 'rotated-refresh-token' });
  };
  const makeClient = () =>
    createClient('https://session-test.supabase.co', 'synthetic-publishable-key', {
      auth: { ...sessionOptions, storage },
      global: { fetch: fetcher },
    });
  const first = makeClient();
  const { error } = await first.auth.signInWithPassword({
    email: 'synthetic@example.test',
    password: 'synthetic-only',
  });
  assert.ifError(error);
  await first.auth.stopAutoRefresh();
  // This is the existing SDK default key; changing it would log existing users out.
  const key = 'sb-session-test-auth-token';
  const persisted = JSON.parse(storage.getItem(key)!);
  persisted.expires_at = Math.floor(Date.now() / 1000) - 8 * 24 * 60 * 60;
  storage.setItem(key, JSON.stringify(persisted));
  const reopened = makeClient();
  try {
    const result = await reopened.auth.getSession();
    assert.ifError(result.error);
    assert.equal(result.data.session?.access_token, 'fresh-token');
    assert.equal(result.data.session?.refresh_token, 'rotated-refresh-token');
    assert.equal(passwordLogins, 1);
    assert.equal(refreshes, 1);
    await reopened.auth.signOut({ scope: 'local' });
    assert.equal(storage.getItem(key), null);
    const afterLogout = makeClient();
    try {
      assert.equal((await afterLogout.auth.getSession()).data.session, null);
    } finally {
      await afterLogout.auth.stopAutoRefresh();
    }
    assert.equal(refreshes, 1);
  } finally {
    await reopened.auth.stopAutoRefresh();
  }
});

test('401 refreshes the session and retries a write once with the exact same payload', async () => {
  const sent: RequestInit[] = [];
  let refreshes = 0;
  const request = createAuthenticatedRequest(
    {
      getSession: async () => okSession(session()),
      refreshSession: async () => {
        refreshes++;
        return okSession(session('fresh-token'));
      },
    },
    async (_input, init) => {
      sent.push(init!);
      return sent.length === 1 ? json({ message: 'expired' }, 401) : json({ id: 'saved-once' });
    },
  );
  const body = { id: 'same-idempotency-key', amount: 200000 };
  assert.deepEqual(await request('orders/o/payments', 'POST', body), { id: 'saved-once' });
  assert.equal(refreshes, 1);
  assert.equal(sent[0].body, sent[1].body);
  assert.equal(sent[1].method, 'POST');
  assert.equal(new Headers(sent[1].headers).get('Authorization'), 'Bearer fresh-token');
});

test('concurrent unauthorized requests share one refresh operation', async () => {
  let refreshes = 0,
    sends = 0;
  let finishRefresh!: (value: ReturnType<typeof okSession>) => void;
  const pending = new Promise<ReturnType<typeof okSession>>((resolve) => {
    finishRefresh = resolve;
  });
  const request = createAuthenticatedRequest(
    {
      getSession: async () => okSession(session()),
      refreshSession: async () => {
        refreshes++;
        return pending;
      },
    },
    async (_input, init) => {
      sends++;
      return new Headers(init?.headers).get('Authorization') === 'Bearer old-token'
        ? json({}, 401)
        : json({ ok: true });
    },
  );
  const calls = Promise.all([request('state'), request('trash')]);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(refreshes, 1);
  finishRefresh(okSession(session('fresh-token')));
  await calls;
  assert.equal(sends, 4);
});

test('a token already refreshed in another tab is reused without another refresh', async () => {
  let reads = 0,
    refreshes = 0,
    sends = 0;
  const request = createAuthenticatedRequest(
    {
      getSession: async () => okSession(session(++reads === 1 ? 'old-token' : 'other-tab-token')),
      refreshSession: async () => {
        refreshes++;
        return okSession(session());
      },
    },
    async () => (++sends === 1 ? json({}, 401) : json({ ok: true })),
  );
  await request('state');
  assert.equal(refreshes, 0);
  assert.equal(sends, 2);
});

test('a write is never retried as a different account', async () => {
  let reads = 0,
    sends = 0;
  const request = createAuthenticatedRequest(
    {
      getSession: async () =>
        okSession(++reads === 1 ? session() : session('other-account-token', 'other-owner')),
      refreshSession: async () => okSession(session()),
    },
    async () => {
      sends++;
      return json({}, 401);
    },
  );
  await assert.rejects(request('products/p', 'DELETE'), /Tài khoản đã thay đổi/);
  assert.equal(sends, 1);
});

test('a temporary session recovery failure does not request another login or send an unauthenticated request', async () => {
  let sends = 0;
  const request = createAuthenticatedRequest(
    {
      getSession: async () => ({
        data: { session: null },
        error: new AuthRetryableFetchError('offline', 503),
      }),
      refreshSession: async () => okSession(session()),
    },
    async () => {
      sends++;
      return json({});
    },
  );
  await assert.rejects(request('state'), /Kiểm tra kết nối mạng/);
  assert.equal(sends, 0);
});

test('a failed refresh does not retry the API request without a valid token', async () => {
  let sends = 0;
  const request = createAuthenticatedRequest(
    {
      getSession: async () => okSession(session()),
      refreshSession: async () => ({
        data: { session: null, user: null },
        error: new AuthRetryableFetchError('offline', 503),
      }),
    },
    async () => {
      sends++;
      return json({}, 401);
    },
  );
  await assert.rejects(request('state'), /Kiểm tra kết nối mạng/);
  assert.equal(sends, 1);
});

test('a second 401 stops retrying', async () => {
  let sends = 0;
  const request = createAuthenticatedRequest(
    {
      getSession: async () => okSession(session()),
      refreshSession: async () => okSession(session('fresh-token')),
    },
    async () => {
      sends++;
      return json({ message: 'revoked' }, 401);
    },
  );
  await assert.rejects(request('state'), /revoked/);
  assert.equal(sends, 2);
});

test('validation, server and network failures never replay financial writes', async () => {
  for (const failure of [400, 500, 'network'] as const) {
    let sends = 0,
      refreshes = 0;
    const request = createAuthenticatedRequest(
      {
        getSession: async () => okSession(session()),
        refreshSession: async () => {
          refreshes++;
          return okSession(session());
        },
      },
      async () => {
        sends++;
        if (failure === 'network') throw new TypeError('offline');
        return json({ message: 'failed' }, failure);
      },
    );
    await assert.rejects(request('orders/o/payments', 'POST', { amount: 100000 }));
    assert.equal(sends, 1);
    assert.equal(refreshes, 0);
  }
});
