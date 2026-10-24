import { useUi } from '../../../app/providers/UiProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../../app/providers/StoreProvider';
import { Empty } from '../../../shared/ui/Empty';
import { balanceAt } from '../../../../shared/finance';
import { Back } from '../../../shared/ui/Back';
import { dateText, money } from '../../../lib/format';
import { Badge } from '../../../shared/ui/Badge';
import { CreditCard, Package, Sofa, ShieldCheck, Pencil } from 'lucide-react';
import { DeleteButton } from '../../../shared/ui/DeleteButton';
import { OrderLedger } from '../components/OrderLedger';

export function OrderDetail() {
  const { open } = useUi();
  const navigate = useNavigate();

  const { id } = useParams();
  const { data } = useStore();
  const o = data.orders.find((o) => o.id === id);
  if (!o) return <Empty title="Không tìm thấy đơn hàng" detail="Hãy làm mới dữ liệu và thử lại." />;
  const c = data.customers.find((c) => c.id === o.customer_id)!;
  const b = balanceAt(o);
  return (
    <>
      <Back to={'/customers/' + o.customer_id} label={c?.name || 'Khách hàng'} />
      <div className="page-heading">
        <div>
          <p className="eyebrow">CHI TIẾT ĐƠN HÀNG</p>
          <h1>{o.code}</h1>
          <p className="muted">Ngày mua {dateText(o.ordered_on)}</p>
        </div>
        <Badge tone={b.total > 0 ? 'amber' : 'green'}>
          {b.total > 0 ? 'Còn nợ' : 'Đã tất toán'}
        </Badge>
      </div>
      <div className="balance-summary order-balance">
        <span>Cần thanh toán</span>
        <h2>{money(b.total)}</h2>
        <div className="summary-line">
          <span>Nợ gốc còn lại</span>
          <strong>{money(b.principal)}</strong>
        </div>
        <div className="summary-line">
          <span>Lãi chưa trả</span>
          <strong>{money(b.interest)}</strong>
        </div>
        <div className="summary-divider" />
        <div className="summary-line">
          <span>Đã thu (gồm gốc & lãi)</span>
          <strong className="settled-text">{money(b.paid)}</strong>
        </div>
      </div>
      {b.total > 0 && (
        <button className="primary full" onClick={() => open({ type: 'payment', order: o })}>
          <CreditCard size={19} />
          Thu tiền trả góp
        </button>
      )}
      <button
        className="secondary full"
        onClick={() => open({ type: 'order', customer: c, order: o })}
      >
        <Pencil size={17} />
        Sửa đơn hàng
      </button>
      <section className="content-card">
        <div className="section-title">
          <h2>Sản phẩm trong đơn</h2>
          <Package size={18} />
        </div>
        {o.items.map((item, i) => (
          <div className="line-item" key={i}>
            <span className="product-icon">
              <Sofa size={22} />
            </span>
            <div>
              <strong>{item.name}</strong>
              <span>
                {money(Number(item.price))} × {item.quantity}
              </span>
            </div>
            <strong>{money(Number(item.price) * item.quantity)}</strong>
          </div>
        ))}
        <div className="total-line">
          <span>Tổng giá trị đơn</span>
          <strong>{money(Number(o.total))}</strong>
        </div>
        {o.note && <p className="order-note">{o.note}</p>}
      </section>
      <div className="interest-policy">
        <ShieldCheck size={19} />
        <div>
          <strong>
            {o.apply_interest
              ? `Lãi ${money(o.interest_per_million)} / 1 triệu / tháng`
              : 'Đơn hàng không tính lãi'}
          </strong>
          <p>
            {o.apply_interest
              ? 'Miễn lãi tháng mua. Tính trên gốc đầu tháng, không nhập lãi vào gốc. Thu tiền trừ lãi trước.'
              : 'Chính sách miễn lãi đã được lưu với đơn này.'}
          </p>
          <small>Mức lãi được giữ từ ngày tạo đơn. Chỉ thay đổi khi sửa trực tiếp đơn này.</small>
        </div>
      </div>
      <OrderLedger order={o} balance={b} />
      <div className="record-danger-zone">
        <DeleteButton
          path={'orders/' + o.id}
          label="Xoá đơn hàng"
          detail="Đơn hàng, khoản thu và công nợ của đơn sẽ được ẩn khỏi báo cáo. Các khoản thu vẫn được giữ cùng đơn."
          onDeleted={() => navigate('/customers/' + o.customer_id, { replace: true })}
        />
      </div>
    </>
  );
}
