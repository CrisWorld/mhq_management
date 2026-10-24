import { Loader2 } from 'lucide-react';
import { IconLogo } from './IconLogo';
import { ErrorBox } from './ErrorBox';

export function AppLoading({
  message = 'Đang mở sổ cửa hàng…',
  error = '',
  onRetry,
  onLogout,
}: {
  message?: string;
  error?: string;
  onRetry?: () => void;
  onLogout?: () => void;
}) {
  return (
    <div className="app-shell">
      <div className="app-loading">
        <IconLogo />
        {error ? (
          <>
            <ErrorBox message={error} />
            {onRetry && (
              <button className="primary" onClick={onRetry}>
                Thử lại
              </button>
            )}
            {onLogout && (
              <button className="text-button" onClick={onLogout}>
                Về đăng nhập
              </button>
            )}
          </>
        ) : (
          <>
            <Loader2 className="spin" />
            <span>{message}</span>
          </>
        )}
      </div>
    </div>
  );
}
