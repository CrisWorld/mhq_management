import { OrderProductPicker } from './OrderProductPicker';
import { useUi } from '../../../app/providers/UiProvider';
import type { Customer, Item, Order, Product } from '../../../../shared/types';
import { useStore } from '../../../app/providers/StoreProvider';
import { useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';
import { todayVN } from '../../../../shared/finance';
import { initials, money } from '../../../lib/format';
import { ShieldCheck } from 'lucide-react';
import { SubmitForm } from '../../../shared/ui/SubmitForm';
import { Field } from '../../../shared/ui/Field';
import { MoneyInput } from '../../../shared/ui/MoneyInput';
import { Toggle } from '../../../shared/ui/Toggle';
import { OrderItemsEditor } from './OrderItemsEditor';

export function OrderForm({
  customer,
  order,
  close,
}: {
  customer: Customer;
  order?: Order;
  close: () => void;
}) {
  const { notify } = useUi();

  const { data, mutate } = useStore();
  const navigate = useNavigate();
  const [date, setDate] = useState(order?.ordered_on || todayVN());
  const [interest, setInterest] = useState(order?.apply_interest ?? customer.apply_interest);
  const [items, setItems] = useState<Item[]>(order?.items || []);
  const [down, setDown] = useState('');
  const [note, setNote] = useState(order?.note || '');
  const [quick, setQuick] = useState(false);
  const id = useRef(crypto.randomUUID());
  const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const rate = order?.interest_per_million ?? data.store.interest_per_million;
  function add(p: Product) {
    setItems((old) =>
      old.some((i) => i.product_id === p.id)
        ? old.map((i) =>
            i.product_id === p.id ? { ...i, quantity: Math.min(10000, i.quantity + 1) } : i,
          )
        : [...old, { product_id: p.id, name: p.name, price: Number(p.price), quantity: 1 }],
    );
  }
  return (
    <>
      <div className="form-customer">
        <span className="avatar">{initials(customer.name)}</span>
        <div>
          <strong>{customer.name}</strong>
          <small>{customer.phone}</small>
        </div>
      </div>
      <OrderProductPicker
        products={data.products}
        quick={quick}
        onQuickChange={setQuick}
        onSelect={add}
      />
      <SubmitForm
        label={order ? 'Lưu thay đổi đơn hàng' : 'Tạo đơn hàng'}
        disabled={!items.length || quick}
        onSave={async () => {
          if (!items.length) throw new Error('Chọn ít nhất một sản phẩm.');
          if (Number(down) > total) throw new Error('Tiền trả trước vượt tổng đơn.');
          const result = await mutate<{ id: string }>(
            'orders' + (order ? '/' + order.id : ''),
            order ? 'PATCH' : 'POST',
            {
              ...(order
                ? { version: order.version || 1 }
                : { id: id.current, customer_id: customer.id, down_payment: Number(down) || 0 }),
              ordered_on: date,
              apply_interest: interest,
              items: items.map((item) => ({
                product_id: item.product_id,
                quantity: item.quantity,
                ...(order ? { price: Number(item.price) } : {}),
              })),
              note: note.trim(),
            },
          );
          notify(order ? 'Đã cập nhật đơn hàng và tính lại công nợ.' : 'Đã tạo đơn hàng.');
          close();
          navigate('/orders/' + result.id);
        }}
      >
        {items.length > 0 && (
          <OrderItemsEditor items={items} editablePrices={!!order} onChange={setItems} />
        )}
        <div className="total-line order-form-total">
          <span>Tổng đơn hàng</span>
          <strong>{money(total)}</strong>
        </div>
        <Field label="Ngày mua hàng">
          <input
            type="date"
            min="2000-01-01"
            max={todayVN()}
            value={date}
            onInput={(e) => setDate(e.currentTarget.value)}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </Field>
        {!order && (
          <>
            <Field label="Tiền trả trước" hint="Để trống nếu khách chưa trả trước.">
              <MoneyInput value={down} onChange={setDown} placeholder="0" />
            </Field>
            <div className="remaining-line">
              <span>Nợ gốc còn lại</span>
              <strong>{money(Math.max(0, total - Number(down)))}</strong>
            </div>
          </>
        )}
        <Toggle
          checked={interest}
          onChange={setInterest}
          title="Tính lãi cho đơn hàng này"
          detail={
            interest
              ? `${money(rate)} / 1 triệu / tháng. Miễn tháng mua.`
              : 'Không phát sinh lãi trong suốt đơn hàng.'
          }
        />
        <Field label="Ghi chú đơn hàng (không bắt buộc)">
          <textarea
            rows={2}
            maxLength={2000}
            placeholder="Giao hàng, yêu cầu riêng…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <div className="info-note">
          <ShieldCheck size={17} />
          <span>
            {order
              ? 'Giữ mức lãi và giá đã lưu của đơn. Sửa ngày mua sẽ chuyển ngày trả trước theo; các khoản thu được kiểm tra lại. Sửa tiền trả trước tại lịch sử công nợ.'
              : 'Giá sản phẩm và chính sách lãi được lưu cố định cùng đơn hàng.'}
          </span>
        </div>
      </SubmitForm>
    </>
  );
}
