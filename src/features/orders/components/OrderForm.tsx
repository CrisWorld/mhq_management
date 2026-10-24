import { OrderProductPicker } from './OrderProductPicker';
import { useUi } from '../../../app/providers/UiProvider';
import type { Customer, Product } from '../../../../shared/types';
import { useStore } from '../../../app/providers/StoreProvider';
import { useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';
import { todayVN } from '../../../../shared/finance';
import { initials, money } from '../../../lib/format';
import { Plus, Trash2, Minus, ShieldCheck } from 'lucide-react';
import { SubmitForm } from '../../../shared/ui/SubmitForm';
import { Field } from '../../../shared/ui/Field';
import { MoneyInput } from '../../../shared/ui/MoneyInput';
import { Toggle } from '../../../shared/ui/Toggle';

export function OrderForm({ customer, close }: { customer: Customer; close: () => void }) {
  const { notify } = useUi();

  const { data, mutate } = useStore();
  const navigate = useNavigate();
  const [date, setDate] = useState(todayVN());
  const [interest, setInterest] = useState(customer.apply_interest);
  const [items, setItems] = useState<{ product_id: string; quantity: number }[]>([]);
  const [down, setDown] = useState('');
  const [note, setNote] = useState('');
  const [quick, setQuick] = useState(false);
  const id = useRef(crypto.randomUUID());
  const total = items.reduce(
    (s, i) => s + Number(data.products.find((p) => p.id === i.product_id)?.price || 0) * i.quantity,
    0,
  );
  function add(p: Product) {
    setItems((old) =>
      old.some((i) => i.product_id === p.id)
        ? old.map((i) =>
            i.product_id === p.id ? { ...i, quantity: Math.min(10000, i.quantity + 1) } : i,
          )
        : [...old, { product_id: p.id, quantity: 1 }],
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
        label="Tạo đơn hàng"
        disabled={!items.length || quick}
        onSave={async () => {
          if (!items.length) throw new Error('Chọn ít nhất một sản phẩm.');
          if (Number(down) > total) throw new Error('Tiền trả trước vượt tổng đơn.');
          const result = await mutate<{ id: string }>('orders', 'POST', {
            id: id.current,
            customer_id: customer.id,
            ordered_on: date,
            apply_interest: interest,
            items,
            down_payment: Number(down) || 0,
            note: note.trim(),
          });
          notify('Đã tạo đơn hàng.');
          close();
          navigate('/orders/' + result.id);
        }}
      >
        {items.length > 0 && (
          <div className="selected-items">
            {items.map((item) => {
              const p = data.products.find((p) => p.id === item.product_id)!;
              return (
                <div className="selected-item" key={p.id}>
                  <div>
                    <strong>{p.name}</strong>
                    <small>{money(Number(p.price) * item.quantity)}</small>
                  </div>
                  <div className="quantity-control">
                    <button
                      type="button"
                      aria-label={'Giảm ' + p.name}
                      onClick={() =>
                        setItems((old) =>
                          old.flatMap((i) =>
                            i.product_id === p.id
                              ? i.quantity > 1
                                ? [{ ...i, quantity: i.quantity - 1 }]
                                : []
                              : [i],
                          ),
                        )
                      }
                    >
                      {item.quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                    </button>
                    <input
                      aria-label={'Số lượng ' + p.name}
                      type="number"
                      min={1}
                      max={10000}
                      value={item.quantity}
                      onChange={(e) => {
                        const qty = Math.min(
                          10000,
                          Math.max(1, Math.floor(Number(e.target.value) || 1)),
                        );
                        setItems((old) =>
                          old.map((i) => (i.product_id === p.id ? { ...i, quantity: qty } : i)),
                        );
                      }}
                    />
                    <button type="button" aria-label={'Tăng ' + p.name} onClick={() => add(p)}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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
        <Field label="Tiền trả trước" hint="Để trống nếu khách chưa trả trước.">
          <MoneyInput value={down} onChange={setDown} placeholder="0" />
        </Field>
        <div className="remaining-line">
          <span>Nợ gốc còn lại</span>
          <strong>{money(Math.max(0, total - Number(down)))}</strong>
        </div>
        <Toggle
          checked={interest}
          onChange={setInterest}
          title="Tính lãi cho đơn hàng này"
          detail={
            interest
              ? `${money(data.store.interest_per_million)} / 1 triệu / tháng. Miễn tháng mua.`
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
          <span>Giá sản phẩm và chính sách lãi được lưu cố định cùng đơn hàng.</span>
        </div>
      </SubmitForm>
    </>
  );
}
