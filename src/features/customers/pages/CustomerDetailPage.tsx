import { useUi } from '../../../app/providers/UiProvider';
import { useParams } from 'react-router-dom';
import { useStore } from '../../../app/providers/StoreProvider';
import { useState } from 'react';
import { Empty } from '../../../shared/ui/Empty';
import { customerDebt } from '../../../../shared/finance';
import { Back } from '../../../shared/ui/Back';
import {
  MoreHorizontal,
  Phone,
  ArrowUpRight,
  MapPin,
  Plus,
  ShoppingBag,
  FileText,
} from 'lucide-react';
import { initials, money, dateText } from '../../../lib/format';
import { Badge } from '../../../shared/ui/Badge';
import { OrderRow } from '../../orders/components/OrderRow';

export function CustomerDetail() {
  const { open } = useUi();

  const { id } = useParams();
  const { data } = useStore();
  const [tab, setTab] = useState('orders');
  const c = data.customers.find((c) => c.id === id);
  if (!c)
    return (
      <Empty
        title="Không tìm thấy khách hàng"
        detail="Thông tin có thể chưa được tải. Hãy làm mới dữ liệu."
      />
    );
  const debt = customerDebt(data.orders, c.id);
  const orders = data.orders
    .filter((o) => o.customer_id === c.id)
    .sort(
      (a, b) =>
        b.ordered_on.localeCompare(a.ordered_on) || b.created_at.localeCompare(a.created_at),
    );
  const notes = data.notes
    .filter((n) => n.customer_id === c.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <>
      <Back to="/customers" label="Khách hàng" />
      <div className="customer-profile">
        <button
          className="icon-button edit-customer"
          aria-label="Sửa khách hàng"
          onClick={() => open({ type: 'customer', customer: c })}
        >
          <MoreHorizontal />
        </button>
        <span className={'avatar large color-' + (c.name.length % 4)}>{initials(c.name)}</span>
        <h1>{c.name}</h1>
        {c.phone ? (
          <a className="phone-link" href={'tel:' + c.phone.replace(/[^+\d]/g, '')}>
            <Phone size={16} />
            {c.phone}
            <span>
              Gọi điện <ArrowUpRight size={13} />
            </span>
          </a>
        ) : (
          <p className="muted">Chưa có số điện thoại</p>
        )}
        {c.address && (
          <p className="address">
            <MapPin size={15} />
            {c.address}
          </p>
        )}
      </div>
      <div className="balance-summary">
        <div className="section-title">
          <span>Công nợ hiện tại</span>
          <Badge tone={debt.total > 0 ? 'amber' : 'green'}>
            {debt.total > 0 ? 'Còn nợ' : 'Đã thanh toán'}
          </Badge>
        </div>
        <h2>{money(debt.total)}</h2>
        <div className="summary-line">
          <span>Nợ gốc</span>
          <strong>{money(debt.principal)}</strong>
        </div>
        <div className="summary-line">
          <span>Lãi tích lũy chưa trả</span>
          <strong>{money(debt.interest)}</strong>
        </div>
      </div>
      <button className="primary full" onClick={() => open({ type: 'order', customer: c })}>
        <Plus size={19} />
        Tạo đơn hàng mới
      </button>
      <div className="detail-tabs">
        <button className={tab === 'orders' ? 'selected' : ''} onClick={() => setTab('orders')}>
          Đơn hàng <span>{orders.length}</span>
        </button>
        <button className={tab === 'notes' ? 'selected' : ''} onClick={() => setTab('notes')}>
          Ghi chú <span>{notes.length}</span>
        </button>
      </div>
      {tab === 'orders' ? (
        <div className="order-list">
          {orders.length ? (
            orders.map((o) => <OrderRow key={o.id} order={o} />)
          ) : (
            <Empty
              icon={<ShoppingBag />}
              title="Chưa có đơn hàng"
              detail="Tạo đơn đầu tiên cho khách hàng này."
            />
          )}
        </div>
      ) : (
        <>
          <button className="secondary full" onClick={() => open({ type: 'note', customer: c })}>
            <Plus size={17} />
            Thêm ghi chú
          </button>
          {notes.length ? (
            <div className="notes-list">
              {notes.map((n) => (
                <article className="note-card" key={n.id}>
                  <div>
                    <FileText size={16} />
                    <time>
                      {dateText(n.created_at)} ·{' '}
                      {new Intl.DateTimeFormat('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Asia/Ho_Chi_Minh',
                      }).format(new Date(n.created_at))}
                    </time>
                  </div>
                  <p>{n.content}</p>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              icon={<FileText />}
              title="Ghi nhớ những điều nhỏ"
              detail="Lưu lịch hẹn, nhu cầu và những trao đổi với khách."
            />
          )}
        </>
      )}
    </>
  );
}
