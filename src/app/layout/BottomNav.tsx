import { NavLink } from 'react-router-dom';
import { House, Package, Settings2, Users } from 'lucide-react';
const items = [
  { to: '/', icon: House, label: 'Tổng quan' },
  { to: '/customers', icon: Users, label: 'Khách hàng' },
  { to: '/products', icon: Package, label: 'Sản phẩm' },
  { to: '/settings', icon: Settings2, label: 'Cửa hàng' },
];
export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Điều hướng chính">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          <span>
            <item.icon size={21} />
          </span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
