import type { Session, SupabaseClient } from '@supabase/supabase-js';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type SessionAuth = Pick<SupabaseClient['auth'], 'getSession' | 'refreshSession'>;
const sessionError = () => new Error('Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.');
const connectionError = () =>
  new Error('Chưa thể làm mới phiên đăng nhập. Kiểm tra kết nối mạng rồi thử lại.');

export function createAuthenticatedRequest(auth: SessionAuth, fetcher: typeof fetch = fetch) {
  let refreshing: Promise<Session> | null = null;

  async function currentSession() {
    const { data, error } = await auth.getSession();
    if (error) throw connectionError();
    if (!data.session) throw sessionError();
    return data.session;
  }

  async function refreshAfterUnauthorized(previous: Session) {
    if (!refreshing) {
      refreshing = (async () => {
        const current = await currentSession();
        // Another request/tab may already have rotated the token.
        if (current.access_token !== previous.access_token) return current;
        const { data, error } = await auth.refreshSession();
        if (error) throw connectionError();
        if (!data.session) throw sessionError();
        return data.session;
      })().finally(() => {
        refreshing = null;
      });
    }
    const next = await refreshing;
    // Never replay a write under a different account if login changed in another tab.
    if (next.user.id !== previous.user.id)
      throw new Error('Tài khoản đã thay đổi. Hãy tải lại trang.');
    return next;
  }

  return async function request<T>(
    path: string,
    method: HttpMethod = 'GET',
    body?: unknown,
  ): Promise<T> {
    const session = await currentSession();
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const send = (token: string) =>
      fetcher('/api/' + path, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: payload,
      });
    let response = await send(session.access_token);
    // The auth guard rejects 401 before any mutation. Retry that response once;
    // never replay writes on a network error or on other server responses.
    if (response.status === 401)
      response = await send((await refreshAfterUnauthorized(session)).access_token);
    const data = await response
      .json()
      .catch(() => ({ message: 'Máy chủ chưa phản hồi. Vui lòng thử lại.' }));
    if (!response.ok)
      throw new Error(
        Array.isArray(data.message)
          ? 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.'
          : data.message || 'Không thể hoàn tất. Vui lòng thử lại.',
      );
    return data as T;
  };
}
