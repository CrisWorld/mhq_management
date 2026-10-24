import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { IconLogo } from '../../shared/ui/IconLogo';
import { initials } from '../../lib/format';
import { useStore } from '../providers/StoreProvider';
export function AppHeader() {
  const { data, refresh, refreshing } = useStore();
  return (
    <header className="app-header">
      <Link to="/" className="brand">
        <IconLogo small />
        <span>
          MHQ<span>SỔ CỬA HÀNG</span>
        </span>
      </Link>
      <div className="header-right">
        <button
          className="icon-button"
          aria-label="Làm mới dữ liệu"
          onClick={refresh}
          disabled={refreshing}
        >
          <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
        </button>
        <Link to="/settings" className="profile" aria-label="Cài đặt cửa hàng">
          {initials(data.store.name)}
        </Link>
      </div>
    </header>
  );
}
