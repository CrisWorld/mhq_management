import { UiProvider } from './providers/UiProvider';
import { AuthProvider, useAuth } from './providers/AuthProvider';
import { StoreProvider } from './providers/StoreProvider';
import { AppShell } from './layout/AppShell';
import { AppRoutes } from './AppRoutes';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { AppLoading } from '../shared/ui/AppLoading';

function AuthenticatedApp() {
  const { session, ready } = useAuth();
  if (!ready) return <AppLoading />;
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
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
