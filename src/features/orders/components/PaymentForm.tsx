import { useUi } from '../../../app/providers/UiProvider';
import type { Order, Payment } from '../../../../shared/types';
import { useStore } from '../../../app/providers/StoreProvider';
import { useState, useRef } from 'react';
import { todayVN, balanceAt } from '../../../../shared/finance';
import { SubmitForm } from '../../../shared/ui/SubmitForm';
import { money } from '../../../lib/format';
import { Field } from '../../../shared/ui/Field';
import { MoneyInput } from '../../../shared/ui/MoneyInput';
import { ShieldCheck } from 'lucide-react';

export function PaymentForm({
  order,
  payment,
  close,
}: {
  order: Order;
  payment?: Payment;
  close: () => void;
}) {
  const { notify } = useUi();

  const { data, mutate } = useStore();
  const [date, setDate] = useState(payment?.paid_on || todayVN());
  const [amount, setAmount] = useState(payment ? String(payment.amount) : '');
  const [note, setNote] = useState(payment?.note || '');
  const id = useRef(crypto.randomUUID());
  const precedingPayments = payment
    ? order.payments.filter(
        (row) =>
          row.id !== payment.id &&
          (row.paid_on < date ||
            (row.paid_on === date &&
              (row.created_at < payment.created_at ||
                (row.created_at === payment.created_at && row.id < payment.id)))),
      )
    : order.payments;
  const b = balanceAt({ ...order, payments: precedingPayments }, date);
  const minDate = payment
    ? order.ordered_on
    : order.payments
        .map((p) => p.paid_on)
        .sort()
        .at(-1) || order.ordered_on;
  return (
    <SubmitForm
      label={payment ? 'Lưu thay đổi khoản thu' : 'Xác nhận đã thu tiền'}
      onSave={async () => {
        if (Number(amount) <= 0 || Number(amount) > b.total)
          throw new Error('Số tiền thu phải lớn hơn 0 và không vượt số nợ tại ngày thu.');
        await mutate(
          'orders/' + order.id + '/payments' + (payment ? '/' + payment.id : ''),
          payment ? 'PATCH' : 'POST',
          {
            ...(payment ? { version: payment.version || 1 } : { id: id.current }),
            amount: Number(amount),
            paid_on: date,
            note: note.trim(),
          },
        );
        notify(
          payment ? 'Đã cập nhật khoản thu và tính lại công nợ.' : 'Đã ghi nhận tiền trả góp.',
        );
        close();
      }}
    >
      <div className="payment-order">
        <span>{data.customers.find((c) => c.id === order.customer_id)?.name}</span>
        <strong>{order.code}</strong>
      </div>
      <div className="payment-due">
        <span>Cần thanh toán tại ngày thu</span>
        <strong>{money(b.total)}</strong>
        <small>
          Gốc {money(b.principal)} · Lãi {money(b.interest)}
        </small>
      </div>
      <div className="payment-amount">
        <Field label="Số tiền đã nhận">
          <MoneyInput value={amount} onChange={setAmount} required placeholder="Nhập số tiền" />
        </Field>
      </div>
      <div className="amount-shortcuts" aria-label="Chọn nhanh số tiền">
        {[500000, 1000000]
          .filter((value) => value < b.total)
          .map((value) => (
            <button
              className="amount-shortcut"
              type="button"
              key={value}
              onClick={() => setAmount(String(value))}
            >
              {money(value)}
            </button>
          ))}
        <button
          className="amount-shortcut"
          type="button"
          onClick={() => setAmount(String(b.total))}
        >
          Toàn bộ
        </button>
      </div>
      {Number(amount) > 0 && Number(amount) <= b.total && (
        <div className="allocation">
          <div>
            <span>Thanh toán lãi</span>
            <strong>{money(Math.min(b.interest, Number(amount)))}</strong>
          </div>
          <div>
            <span>Thanh toán gốc</span>
            <strong>{money(Math.max(0, Number(amount) - b.interest))}</strong>
          </div>
          <div>
            <span>Còn nợ sau khi thu</span>
            <strong>{money(b.total - Number(amount))}</strong>
          </div>
        </div>
      )}
      <Field
        label="Ngày nhận tiền"
        hint={
          payment?.kind === 'down_payment'
            ? 'Trả trước cùng ngày mua. Sửa ngày mua tại đơn hàng.'
            : payment
              ? 'Lịch sử công nợ sẽ được tính lại từ ngày này.'
              : 'Ngày thu không được trước lần thu gần nhất.'
        }
      >
        <input
          type="date"
          min={minDate}
          max={todayVN()}
          value={date}
          onInput={(e) => setDate(e.currentTarget.value)}
          onChange={(e) => setDate(e.target.value)}
          required
          disabled={payment?.kind === 'down_payment'}
        />
      </Field>
      <Field label="Ghi chú (không bắt buộc)">
        <input
          placeholder="Tiền mặt, chuyển khoản…"
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <div className="info-note">
        <ShieldCheck size={17} />
        <span>
          {payment
            ? 'Thay đổi phải phù hợp với các khoản thu sau đó. Hệ thống sẽ chặn nếu có khoản thu vượt số nợ.'
            : 'Kiểm tra số tiền trước khi lưu. Khoản thu được giữ trong lịch sử công nợ.'}
        </span>
      </div>
    </SubmitForm>
  );
}
