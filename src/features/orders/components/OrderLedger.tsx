import { ArrowDownLeft, Clock3, Pencil, TrendingUp } from 'lucide-react';
import type { Balance, Order } from '../../../../shared/types';
import { useUi } from '../../../app/providers/UiProvider';
import { dateText, money } from '../../../lib/format';
import { DeleteButton } from '../../../shared/ui/DeleteButton';
import { Empty } from '../../../shared/ui/Empty';

export function OrderLedger({ order, balance }: { order: Order; balance: Balance }) {
  const { open } = useUi();
  return (
    <>
      <div className="section-title ledger-title">
        <h2>Lịch sử công nợ</h2>
        <span>{balance.ledger.length} giao dịch</span>
      </div>
      {balance.ledger.length ? (
        <div className="ledger">
          {[...balance.ledger].reverse().map((entry) => {
            const payment = entry.payment_id
              ? order.payments.find((row) => row.id === entry.payment_id)
              : undefined;
            return (
              <div className="ledger-entry" key={entry.payment_id || entry.date}>
                <div className="ledger-row">
                  <div className={'ledger-icon ' + (payment ? 'mint' : 'peach')}>
                    {payment ? <ArrowDownLeft size={18} /> : <TrendingUp size={18} />}
                  </div>
                  <div>
                    <strong>{entry.label}</strong>
                    <time>{dateText(entry.date)}</time>
                    <small>Còn {money(entry.principal + entry.interest)}</small>
                  </div>
                  <strong className={payment ? 'settled-text' : 'interest-text'}>
                    {payment ? '−' : '+'}
                    {money(entry.amount)}
                  </strong>
                </div>
                {payment && (
                  <div className="record-actions compact-actions ledger-actions">
                    <button
                      className="text-button"
                      onClick={() => open({ type: 'payment', order, payment })}
                    >
                      <Pencil size={15} />
                      Sửa khoản thu
                    </button>
                    <DeleteButton
                      path={'orders/' + order.id + '/payments/' + payment.id}
                      label="Xoá khoản thu"
                      detail={
                        'Khoản thu ' +
                        money(Number(payment.amount)) +
                        ' sẽ được loại khỏi lịch sử tính nợ. Số nợ và lãi sẽ được tính lại.'
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
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
