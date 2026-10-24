import { supabase } from './supabase';
import { createAuthenticatedRequest } from './auth/authenticated-request';
export type { HttpMethod } from './auth/authenticated-request';
export const request = createAuthenticatedRequest(supabase.auth);
