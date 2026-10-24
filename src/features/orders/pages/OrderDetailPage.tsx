import { useUi } from '../../../app/providers/UiProvider';
import { useParams } from 'react-router-dom';
import { useStore } from '../../../app/providers/StoreProvider';
import { Empty } from '../../../shared/ui/Empty';
import { balanceAt } from '../../../../shared/finance';
import { Back } from '../../../shared/ui/Back';
import { dateText, money } from '../../../lib/format';
import { Badge } from '../../../shared/ui/Badge';
import {
  CreditCard,
  Package,
  Sofa,
  ShieldCheck,
  ArrowDownLeft,
  TrendingUp,
  Clock3,
} from 'lucide-react';

export function OrderDetail() {
  const { open } = useUi();

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
          Ghi nhận trả góp
        </button>
      )}
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
          <small>Chính sách cố định từ ngày tạo đơn.</small>
        </div>
      </div>
      <div className="section-title ledger-title">
        <h2>Lịch sử công nợ</h2>
        <span>{b.ledger.length} giao dịch</span>
      </div>
      {b.ledger.length ? (
        <div className="ledger">
          {[...b.ledger].reverse().map((e, i) => (
            <div className="ledger-row" key={i}>
              <div className={'ledger-icon ' + (e.type === 'payment' ? 'mint' : 'peach')}>
                {e.type === 'payment' ? <ArrowDownLeft size={18} /> : <TrendingUp size={18} />}
              </div>
              <div>
                <strong>{e.label}</strong>
                <time>{dateText(e.date)}</time>
                <small>Còn {money(e.principal + e.interest)}</small>
              </div>
              <strong className={e.type === 'payment' ? 'settled-text' : 'interest-text'}>
                {e.type === 'payment' ? '−' : '+'}
                {money(e.amount)}
              </strong>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          icon={<Clock3 />}
          title="Chưa phát sinh giao dịch"
          detail="Các lần trả trước, trả góp và lãi tháng sẽ xuất hiện ở đây."
        />
      )}
    </>
  );
}
