import { supabase } from './supabase';

export type HttpMethod = 'GET' | 'POST' | 'PATCH';

export async function request<T>(
  path: string,
  method: HttpMethod = 'GET',
  body?: unknown,
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  const response = await fetch('/api/' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + session.access_token,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
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
}
