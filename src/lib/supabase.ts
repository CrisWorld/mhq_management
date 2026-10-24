import { createClient } from '@supabase/supabase-js';
import { sessionOptions } from './auth/session-options';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://unconfigured.supabase.co',
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'unconfigured',
  { auth: sessionOptions },
);
