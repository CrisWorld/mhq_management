import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

type AuthContextValue = {
  session: Session | null;
  ready: boolean;
  error: string;
  restore: () => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(false);
  const revision = useRef(0);
  const restore = useCallback(async () => {
    const attempt = ++revision.current;
    setError('');
    try {
      const { data, error } = await supabase.auth.getSession();
      if (!active.current || attempt !== revision.current) return;
      if (error) throw error;
      setSession(data.session);
      setReady(true);
    } catch {
      if (active.current && attempt === revision.current) {
        // A temporary refresh failure leaves the stored refresh token intact.
        // Keep the recovery screen instead of asking the user to log in again.
        setError('Chưa thể khôi phục phiên đăng nhập. Kiểm tra kết nối mạng rồi thử lại.');
      }
    }
  }, []);
  useEffect(() => {
    active.current = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      // INITIAL_SESSION(null) can also follow an offline refresh failure.
      // Only the explicit restore result or SIGNED_OUT should show login.
      if (active.current && (next || event === 'SIGNED_OUT')) {
        revision.current++;
        setSession(next);
        setReady(true);
        setError('');
      }
    });
    void restore();
    const resume = () => {
      if (document.visibilityState === 'visible') void restore();
    };
    window.addEventListener('online', resume);
    window.addEventListener('pageshow', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      active.current = false;
      revision.current++;
      subscription.unsubscribe();
      window.removeEventListener('online', resume);
      window.removeEventListener('pageshow', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [restore]);
  async function signOut() {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
  }
  return (
    <AuthContext.Provider value={{ session, ready, error, restore, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth requires AuthProvider');
  return value;
}
