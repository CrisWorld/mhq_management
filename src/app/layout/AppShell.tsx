import { useUi } from '../providers/UiProvider';
import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useStore } from '../providers/StoreProvider';
import { ErrorBox } from '../../shared/ui/ErrorBox';
import { StoreSheet } from '../overlays/StoreSheet';
import { AppHeader } from './AppHeader';
import { BottomNav } from './BottomNav';
export function AppShell({ children }: { children: ReactNode }) {
  const { error } = useStore();
  const { toast } = useUi();
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <div className="app-shell">
      <AppHeader />
      {error && (
        <div className="page-error">
          <ErrorBox message={error} />
        </div>
      )}
      <main>{children}</main>
      <BottomNav />
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
      <StoreSheet />
    </div>
  );
}
