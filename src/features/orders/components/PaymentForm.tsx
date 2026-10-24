import { useUi } from '../../../app/providers/UiProvider';
import type { Order } from '../../../../shared/types';
import { useStore } from '../../../app/providers/StoreProvider';
import { useState, useRef } from 'react';
import { todayVN, balanceAt } from '../../../../shared/finance';
import { SubmitForm } from '../../../shared/ui/SubmitForm';
import { money } from '../../../lib/format';
import { Field } from '../../../shared/ui/Field';
import { MoneyInput } from '../../../shared/ui/MoneyInput';
import { ShieldCheck } from 'lucide-react';

export function PaymentForm({ order, close }: { order: Order; close: () => void }) {
  const { notify } = useUi();

  const { data, mutate } = useStore();
  const [date, setDate] = useState(todayVN());
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const id = useRef(crypto.randomUUID());
  const b = balanceAt(order, date);
  const minDate =
    order.payments
      .map((p) => p.paid_on)
      .sort()
      .at(-1) || order.ordered_on;
  return (
    <SubmitForm
      label="Xác nhận đã thu tiền"
      onSave={async () => {
        if (Number(amount) <= 0 || Number(amount) > b.total)
          throw new Error('Số tiền thu phải lớn hơn 0 và không vượt số nợ tại ngày thu.');
        await mutate('orders/' + order.id + '/payments', 'POST', {
          id: id.current,
          amount: Number(amount),
          paid_on: date,
          note: note.trim(),
        });
        notify('Đã ghi nhận tiền trả góp.');
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
      <Field label="Ngày nhận tiền" hint="Ngày thu không được trước lần thu gần nhất.">
        <input
          type="date"
          min={minDate}
          max={todayVN()}
          value={date}
          onInput={(e) => setDate(e.currentTarget.value)}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </Field>
      <Field label="Số tiền đã nhận">
        <MoneyInput value={amount} onChange={setAmount} required autoFocus placeholder="0" />
      </Field>
      <button className="amount-shortcut" type="button" onClick={() => setAmount(String(b.total))}>
        Thu tất cả {money(b.total)}
      </button>
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
        <span>Kiểm tra số tiền trước khi lưu. Khoản thu được giữ trong lịch sử công nợ.</span>
      </div>
    </SubmitForm>
  );
}
