import { BadRequestException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
type QueryResult<T> = { data: T | null; error: { message: string } | null };
export function ensureSuccess(result: { error: { message: string } | null }): void {
  if (result.error) throw new BadRequestException(result.error.message || 'Không thể lưu dữ liệu');
}
export function queryData<T>(result: QueryResult<T>): T {
  ensureSuccess(result);
  if (result.data === null) throw new BadRequestException('Không tìm thấy dữ liệu');
  return result.data;
}
export async function listAll<T>(
  db: SupabaseClient,
  table: string,
  mode: 'active' | 'deleted' | 'all' = 'active',
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    let query = db
      .from(table)
      .select('*')
      .order('id')
      .range(from, from + 999);
    if (mode === 'active') query = query.is('deleted_at', null);
    if (mode === 'deleted') query = query.not('deleted_at', 'is', null);
    const page = queryData(await query) as T[];
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}
