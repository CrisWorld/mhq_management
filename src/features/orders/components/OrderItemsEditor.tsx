import { Minus, Plus, Trash2 } from 'lucide-react';
import type { Item } from '../../../../shared/types';
import { money } from '../../../lib/format';
import { MoneyInput } from '../../../shared/ui/MoneyInput';

type Props = { items: Item[]; editablePrices: boolean; onChange: (items: Item[]) => void };
export function OrderItemsEditor({ items, editablePrices, onChange }: Props) {
  const quantity = (index: number, value: number) =>
    onChange(
      items.flatMap((item, i) =>
        i !== index
          ? [item]
          : value <= 0
            ? []
            : [{ ...item, quantity: Math.min(10000, Math.floor(value)) }],
      ),
    );
  return (
    <div className="selected-items">
      {items.map((item, index) => (
        <div className="selected-item" key={index}>
          <div>
            <strong>{item.name}</strong>
            {editablePrices && (
              <label className="item-price">
                Đơn giá
                <MoneyInput
                  value={String(item.price)}
                  onChange={(price) =>
                    onChange(
                      items.map((row, i) => (i === index ? { ...row, price: Number(price) } : row)),
                    )
                  }
                  required
                />
              </label>
            )}
            <small>{money(Number(item.price) * item.quantity)}</small>
          </div>
          <div className="quantity-control">
            <button
              type="button"
              aria-label={'Giảm ' + item.name}
              onClick={() => quantity(index, item.quantity - 1)}
            >
              {item.quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
            </button>
            <input
              aria-label={'Số lượng ' + item.name}
              type="number"
              min={1}
              max={10000}
              value={item.quantity}
              onChange={(event) => quantity(index, Math.max(1, Number(event.target.value) || 1))}
            />
            <button
              type="button"
              aria-label={'Tăng ' + item.name}
              onClick={() => quantity(index, item.quantity + 1)}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
