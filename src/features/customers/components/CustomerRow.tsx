import { todayVN, customerDebt } from '../../../../shared/finance';
import type { Customer } from '../../../../shared/types';
import { useStore } from '../../../app/providers/StoreProvider';
import { Link } from 'react-router-dom';
import { initials, money } from '../../../lib/format';
import { ChevronRight } from 'lucide-react';

export function CustomerRow({
  customer: c,
  asOf = todayVN(),
  pending = false,
}: {
  customer: Customer;
  asOf?: string;
  pending?: boolean;
}) {
  const { data } = useStore();
  const debt = customerDebt(data.orders, c.id, asOf);
  return (
    <Link className="customer-row" to={'/customers/' + c.id}>
      <span className={'avatar color-' + (c.name.length % 4)}>{initials(c.name)}</span>
      <div className="row-main">
        <strong>{c.name}</strong>
        <span>
          {pending ? (
            <>
              <i className="status-dot" /> Chưa thu tháng này
            </>
          ) : (
            c.phone || 'Chưa có số điện thoại'
          )}
        </span>
      </div>
      <div className="row-end">
        <strong className={debt.total > 0 ? 'debt-text' : 'settled-text'}>
          {debt.total > 0 ? money(debt.total) : 'Không còn nợ'}
        </strong>
        {pending && <small>Gốc + lãi</small>}
      </div>
      <ChevronRight className="row-chevron" size={16} />
    </Link>
  );
}
