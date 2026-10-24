import { InternalServerErrorException } from '@nestjs/common';
export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new InternalServerErrorException('Chưa cấu hình Supabase');
  return { url, key };
}
