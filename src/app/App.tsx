import { Route, Routes } from 'react-router-dom';
import { CustomerStatementPage } from '../features/sharing/pages/CustomerStatementPage';
import { UiProvider } from './providers/UiProvider';
import { AuthProvider, useAuth } from './providers/AuthProvider';
import { StoreProvider } from './providers/StoreProvider';
import { AppShell } from './layout/AppShell';
import { AppRoutes } from './AppRoutes';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { AppLoading } from '../shared/ui/AppLoading';

function AuthenticatedApp() {
  const { session, ready, error, restore } = useAuth();
  if (!ready)
    return (
      <AppLoading
        message="Đang khôi phục phiên đăng nhập…"
        error={error}
        onRetry={() => void restore()}
      />
    );
  if (!session) return <LoginPage />;
  return (
    <StoreProvider key={session.user.id}>
      <UiProvider>
        <AppShell>
          <AppRoutes />
        </AppShell>
      </UiProvider>
    </StoreProvider>
  );
}
export default function App() {
  return (
    <Routes>
      <Route path="/share" element={<CustomerStatementPage />} />
      <Route
        path="*"
        element={
          <AuthProvider>
            <AuthenticatedApp />
          </AuthProvider>
        }
      />
    </Routes>
  );
}
