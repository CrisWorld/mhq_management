import { useUi } from '../../../app/providers/UiProvider';
import type { Product } from '../../../../shared/types';
import { useStore } from '../../../app/providers/StoreProvider';
import { useState } from 'react';
import { SubmitForm } from '../../../shared/ui/SubmitForm';
import { Field } from '../../../shared/ui/Field';
import { MoneyInput } from '../../../shared/ui/MoneyInput';
import { Info } from 'lucide-react';
import { DeleteButton } from '../../../shared/ui/DeleteButton';

export function ProductForm({
  product: p,
  onSaved,
  inline = false,
}: {
  product?: Product;
  onSaved: (p?: Product) => void;
  inline?: boolean;
}) {
  const { notify } = useUi();

  const { mutate } = useStore();
  const [name, setName] = useState(p?.name || '');
  const [price, setPrice] = useState(p ? String(p.price) : '');
  return (
    <>
      <SubmitForm
        label={p ? 'Lưu sản phẩm' : 'Thêm sản phẩm'}
        onSave={async () => {
          if (!name.trim()) throw new Error('Vui lòng nhập tên sản phẩm.');
          if (!price || Number(price) <= 0) throw new Error('Vui lòng nhập giá lớn hơn 0.');
          const product = await mutate<Product>(
            'products' + (p ? '/' + p.id : ''),
            p ? 'PATCH' : 'POST',
            { name: name.trim(), price: Number(price) },
          );
          notify('Đã lưu sản phẩm.');
          onSaved(product);
        }}
      >
        <Field label="Tên sản phẩm">
          <input
            placeholder="Ví dụ: Sofa vải Oslo"
            autoFocus={!inline}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            required
          />
        </Field>
        <Field label="Giá bán">
          <MoneyInput value={price} onChange={setPrice} placeholder="0" required />
        </Field>
        {!inline && (
          <div className="info-note">
            <Info size={17} />
            <span>Sản phẩm được lưu vào danh mục để chọn lại trong các đơn sau.</span>
          </div>
        )}
      </SubmitForm>
      {p && (
        <div className="record-danger-zone">
          <DeleteButton
            path={'products/' + p.id}
            label="Xoá sản phẩm"
            detail={
              'Sản phẩm “' +
              p.name +
              '” sẽ không còn trong danh mục. Tên và giá trong các đơn đã tạo được giữ nguyên.'
            }
            onDeleted={() => onSaved()}
          />
        </div>
      )}
    </>
  );
}
