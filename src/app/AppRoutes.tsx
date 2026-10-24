import { Link, Route, Routes } from 'react-router-dom';
import { Dashboard } from '../features/dashboard/pages/DashboardPage';
import { Customers } from '../features/customers/pages/CustomersPage';
import { CustomerDetail } from '../features/customers/pages/CustomerDetailPage';
import { OrderDetail } from '../features/orders/pages/OrderDetailPage';
import { Products } from '../features/products/pages/ProductsPage';
import { Settings } from '../features/settings/pages/SettingsPage';
import { TrashPage } from '../features/settings/pages/TrashPage';
import { Empty } from '../shared/ui/Empty';
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/customers" element={<Customers />} />
      <Route path="/customers/:id" element={<CustomerDetail />} />
      <Route path="/orders/:id" element={<OrderDetail />} />
      <Route path="/products" element={<Products />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/trash" element={<TrashPage />} />
      <Route
        path="*"
        element={
          <Empty
            title="Không tìm thấy trang"
            detail="Quay lại tổng quan để tiếp tục."
            action={
              <Link className="primary" to="/">
                Về tổng quan
              </Link>
            }
          />
        }
      />
    </Routes>
  );
}
