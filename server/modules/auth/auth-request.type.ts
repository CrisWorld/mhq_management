import type { Request } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
export type AuthContext = { db: SupabaseClient; uid: string };
export type AuthRequest = Request & AuthContext;
