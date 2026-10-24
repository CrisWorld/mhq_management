import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://unconfigured.supabase.co',
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'unconfigured',
);
