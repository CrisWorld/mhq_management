import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../../config/supabase.config.js';
import { ensureSuccess, queryData } from '../../common/database/query.js';
import type { AuthContext } from '../auth/auth-request.type.js';
import { isShareToken, type CustomerShareLink } from '../../../shared/sharing.js';
import { buildStatement, type StatementSource } from './statement.js';

@Injectable()
export class SharingService {
  async get({ db }: AuthContext, customerId: string): Promise<{ link: CustomerShareLink | null }> {
    const result = await db.rpc('get_customer_share', { p_customer_id: customerId });
    ensureSuccess(result);
    return { link: result.data };
  }
  async create({ db }: AuthContext, customerId: string): Promise<CustomerShareLink> {
    return queryData(await db.rpc('create_customer_share', { p_customer_id: customerId }));
  }
  async revoke({ db }: AuthContext, customerId: string) {
    ensureSuccess(await db.rpc('revoke_customer_share', { p_customer_id: customerId }));
    return { revoked: true };
  }
  async statement(token: string) {
    if (!isShareToken(token)) throw new NotFoundException('Link không còn hiệu lực');
    const { url, key } = getSupabaseConfig();
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.rpc('read_customer_share', { p_token: token });
    if (error) throw new ServiceUnavailableException('Chưa thể tải công nợ. Vui lòng thử lại.');
    if (!data) throw new NotFoundException('Link không còn hiệu lực');
    return buildStatement(data as StatementSource);
  }
}
