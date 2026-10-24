import { useUi } from '../../../app/providers/UiProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../../app/providers/StoreProvider';
import { useState } from 'react';
import { Empty } from '../../../shared/ui/Empty';
import { balanceAt, customerDebt } from '../../../../shared/finance';
import { Back } from '../../../shared/ui/Back';
import {
  Pencil,
  Phone,
  ArrowUpRight,
  MapPin,
  Plus,
  ShoppingBag,
  FileText,
  CreditCard,
  Share2,
} from 'lucide-react';
import { money } from '../../../lib/format';
import { Badge } from '../../../shared/ui/Badge';
import { OrderRow } from '../../orders/components/OrderRow';
import { NoteCard } from '../components/NoteCard';
import { DeleteButton } from '../../../shared/ui/DeleteButton';

export function CustomerDetail() {
  const { open } = useUi();
  const navigate = useNavigate();

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
  const unpaidOrders = orders.filter((order) => balanceAt(order).total > 0);
  return (
    <>
      <Back to="/customers" label="Khách hàng" />
      <div className="customer-profile">
        <button
          className="text-button edit-customer"
          aria-label="Sửa khách hàng"
          onClick={() => open({ type: 'customer', customer: c })}
        >
          <Pencil size={16} /> Sửa
        </button>
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
      <div className="customer-actions">
        {unpaidOrders.length === 1 && (
          <button
            className="primary"
            onClick={() => open({ type: 'payment', order: unpaidOrders[0] })}
          >
            <CreditCard size={19} /> Thu tiền
          </button>
        )}
        <button
          className={unpaidOrders.length === 1 ? 'secondary' : 'primary full'}
          onClick={() => open({ type: 'order', customer: c })}
        >
          <Plus size={19} /> Tạo đơn mới
        </button>
      </div>
      <button
        className="secondary full customer-share-button"
        onClick={() => open({ type: 'share', customer: c })}
      >
        <Share2 size={18} /> Chia sẻ công nợ
      </button>
      <div className="detail-tabs">
        <button
          aria-pressed={tab === 'orders'}
          className={tab === 'orders' ? 'selected' : ''}
          onClick={() => setTab('orders')}
        >
          Đơn hàng <span>{orders.length}</span>
        </button>
        <button
          aria-pressed={tab === 'notes'}
          className={tab === 'notes' ? 'selected' : ''}
          onClick={() => setTab('notes')}
        >
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
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} customer={c} />
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
      <div className="record-danger-zone">
        <DeleteButton
          path={'customers/' + c.id}
          label="Xoá khách hàng"
          detail={
            'Khách hàng “' +
            c.name +
            '” cùng đơn hàng, khoản thu và công nợ liên quan sẽ được ẩn khỏi danh sách và báo cáo.'
          }
          onDeleted={() => navigate('/customers', { replace: true })}
        />
      </div>
    </>
  );
}
