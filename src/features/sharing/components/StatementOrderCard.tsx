import { ChevronDown, ShoppingBag } from 'lucide-react';
import type { StatementOrder } from '../../../../shared/sharing';
import { nextMonth } from '../../../../shared/finance';
import { dateText, money } from '../../../lib/format';
import { Badge } from '../../../shared/ui/Badge';

export function StatementOrderCard({ order }: { order: StatementOrder }) {
  const { balance } = order;
  const rate = (order.interest_per_million / 10000).toLocaleString('vi-VN', {
    maximumFractionDigits: 4,
  });
  return (
    <details className="statement-order">
      <summary>
        <span className="statement-order-top">
          <strong>
            <ShoppingBag size={17} /> {order.code}
          </strong>
          <Badge tone={balance.total > 0 ? 'amber' : 'green'}>
            {balance.total > 0 ? 'Còn nợ' : 'Đã tất toán'}
          </Badge>
        </span>
        <span className="statement-order-date">Ngày mua {dateText(order.ordered_on)}</span>
        <span className="statement-order-products">
          {order.items
            .map((item) => item.name + (item.quantity > 1 ? ' × ' + item.quantity : ''))
            .join(', ')}
        </span>
        <span className="statement-order-due">
          <span>Còn phải trả</span>
          <strong>{money(balance.total)}</strong>
          <ChevronDown className="statement-chevron" size={19} />
        </span>
        <span className="statement-expand-hint">Nhấn để xem đơn và lịch sử thanh toán</span>
      </summary>
      <div className="statement-order-content">
        <div className="statement-facts">
          <div>
            <span>Tổng giá trị đơn</span>
            <strong>{money(order.total)}</strong>
          </div>
          <div>
            <span>Đã thanh toán (gốc + lãi)</span>
            <strong className="settled-text">{money(balance.paid)}</strong>
          </div>
          <div>
            <span>Nợ gốc còn lại</span>
            <strong>{money(balance.principal)}</strong>
          </div>
          <div>
            <span>Lãi chưa trả</span>
            <strong>{money(balance.interest)}</strong>
          </div>
        </div>
        <h3>Sản phẩm trong đơn</h3>
        <ul className="statement-items">
          {order.items.map((item, index) => (
            <li key={index}>
              <span>
                {item.name}
                <small>
                  {money(item.price)} × {item.quantity}
                </small>
              </span>
              <strong>{money(item.price * item.quantity)}</strong>
            </li>
          ))}
        </ul>
        <div className="statement-interest">
          <h3>
            {order.apply_interest && order.interest_per_million > 0
              ? 'Cách tính lãi của đơn này'
              : 'Đơn hàng không tính lãi'}
          </h3>
          {order.apply_interest && order.interest_per_million > 0 ? (
            <>
              <p>
                <strong>{rate}%/tháng</strong> · {money(order.interest_per_million)} cho mỗi
                1.000.000 ₫ nợ gốc.
              </p>
              <p>
                Miễn lãi tháng mua. Bắt đầu tính từ {dateText(nextMonth(order.ordered_on))} trên nợ
                gốc còn lại đầu mỗi tháng; không tính lãi trên lãi.
              </p>
              <p>
                Tiền trả được trừ lãi trước, phần còn lại trừ nợ gốc. Mức lãi được lưu riêng cho đơn
                này.
              </p>
            </>
          ) : (
            <p>Bạn chỉ thanh toán nợ gốc còn lại của đơn này.</p>
          )}
        </div>
        <h3>Lịch sử thanh toán và lãi</h3>
        {balance.ledger.length ? (
          <ol className="statement-ledger">
            {[...balance.ledger].reverse().map((entry, index) => (
              <li key={index}>
                <div>
                  <strong>{entry.label}</strong>
                  <strong className={entry.type === 'payment' ? 'settled-text' : 'interest-text'}>
                    {entry.type === 'payment' ? '−' : '+'}
                    {money(entry.amount)}
                  </strong>
                </div>
                <time>{dateText(entry.date)}</time>
                {entry.type === 'interest' && <p>Gốc tính lãi: {money(entry.principal)}</p>}
                <p>
                  Sau giao dịch: gốc {money(entry.principal)} · lãi {money(entry.interest)}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">Chưa có khoản thanh toán hoặc lãi phát sinh.</p>
        )}
      </div>
    </details>
  );
}
