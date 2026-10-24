import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../../config/supabase.config.js';
import type { AuthRequest } from './auth-request.type.js';
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new UnauthorizedException('Vui lòng đăng nhập');
    const { url, key } = getSupabaseConfig();
    const db = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    request.db = db;
    request.uid = data.user.id;
    return true;
  }
}
