import { useUi } from '../../../app/providers/UiProvider';
import type { Order } from '../../../../shared/types';
import { balanceAt } from '../../../../shared/finance';
import { Link } from 'react-router-dom';
import { ShoppingBag, ChevronRight, CreditCard } from 'lucide-react';
import { Badge } from '../../../shared/ui/Badge';
import { dateText, money } from '../../../lib/format';

export function OrderRow({ order: o }: { order: Order }) {
  const b = balanceAt(o);
  const { open } = useUi();
  return (
    <article className="order-card">
      <Link
        to={'/orders/' + o.id}
        className="order-card-link"
        aria-label={'Chi tiết đơn ' + o.code}
      >
        <div className="section-title">
          <strong>
            <ShoppingBag size={16} />
            {o.code}
          </strong>
          <Badge tone={b.total > 0 ? 'amber' : 'green'}>
            {b.total > 0 ? 'Còn nợ' : 'Đã tất toán'}
          </Badge>
        </div>
        <p>{o.items.map((i) => i.name + (i.quantity > 1 ? ' × ' + i.quantity : '')).join(', ')}</p>
        <div className="summary-line">
          <span>{dateText(o.ordered_on)}</span>
          <span>
            Tổng đơn <strong>{money(Number(o.total))}</strong>
          </span>
        </div>
        <div className="order-bottom">
          <span>Cần thanh toán</span>
          <strong>
            {money(b.total)} <ChevronRight size={15} />
          </strong>
        </div>
      </Link>
      {b.total > 0 && (
        <button
          className="primary full order-pay"
          onClick={() => open({ type: 'payment', order: o })}
        >
          <CreditCard size={18} /> Thu tiền
        </button>
      )}
    </article>
  );
}
