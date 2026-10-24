import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type { State } from '../../../shared/types';
import { request, type HttpMethod } from '../../lib/http';
import { errorText } from '../../lib/errors';
import { useAuth } from './AuthProvider';
import { AppLoading } from '../../shared/ui/AppLoading';

type StoreContextValue = {
  data: State;
  error: string;
  refreshing: boolean;
  refresh: () => Promise<void>;
  mutate: <T = void>(path: string, method: HttpMethod, body: unknown) => Promise<T>;
};
const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<State | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const active = useRef(true);
  const requestVersion = useRef(0);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    setRefreshing(true);
    setError('');
    try {
      const state = await request<State>('state');
      if (active.current && version === requestVersion.current) setData(state);
    } catch (error) {
      if (active.current && version === requestVersion.current) setError(errorText(error));
    } finally {
      if (active.current && version === requestVersion.current) setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    active.current = true;
    void refresh();
    return () => {
      active.current = false;
      requestVersion.current++;
    };
  }, [refresh]);
  async function mutate<T = void>(path: string, method: HttpMethod, body: unknown): Promise<T> {
    const result = await request<T>(path, method, body);
    const version = ++requestVersion.current;
    try {
      const state = await request<State>('state');
      if (active.current && version === requestVersion.current) {
        setData(state);
        setError('');
      }
    } catch {
      if (active.current) setError('Đã lưu. Chưa tải lại được dữ liệu mới; hãy nhấn làm mới.');
    } finally {
      if (active.current && version === requestVersion.current) setRefreshing(false);
    }
    return result;
  }
  async function logout() {
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      setError(errorText(error));
    }
  }
  if (!data)
    return (
      <AppLoading
        message="Đang tải dữ liệu cửa hàng…"
        error={error}
        onRetry={refresh}
        onLogout={logout}
      />
    );
  return (
    <StoreContext.Provider value={{ data, error, refreshing, refresh, mutate }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore requires StoreProvider');
  return value;
}
