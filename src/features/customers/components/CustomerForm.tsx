import { useUi } from '../../../app/providers/UiProvider';
import type { Customer } from '../../../../shared/types';
import { useStore } from '../../../app/providers/StoreProvider';
import { useState } from 'react';
import { SubmitForm } from '../../../shared/ui/SubmitForm';
import { Field } from '../../../shared/ui/Field';
import { Toggle } from '../../../shared/ui/Toggle';
import { ShieldCheck } from 'lucide-react';

export function CustomerForm({ customer: c, close }: { customer?: Customer; close: () => void }) {
  const { notify } = useUi();

  const { mutate } = useStore();
  const [name, setName] = useState(c?.name || '');
  const [phone, setPhone] = useState(c?.phone || '');
  const [address, setAddress] = useState(c?.address || '');
  const [interest, setInterest] = useState(c?.apply_interest ?? true);
  return (
    <SubmitForm
      label={c ? 'Lưu thay đổi' : 'Thêm khách hàng'}
      onSave={async () => {
        if (!name.trim()) throw new Error('Vui lòng nhập họ tên.');
        if (!/^(\+?[\d\s().-]{8,25})$/.test(phone.trim()))
          throw new Error('Vui lòng nhập số điện thoại hợp lệ.');
        await mutate('customers' + (c ? '/' + c.id : ''), c ? 'PATCH' : 'POST', {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          apply_interest: interest,
        });
        notify(c ? 'Đã cập nhật khách hàng.' : 'Đã thêm khách hàng.');
        close();
      }}
    >
      <Field label="Họ và tên">
        <input
          autoFocus
          placeholder="Ví dụ: Nguyễn Thị Mai"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          autoComplete="name"
          required
        />
      </Field>
      <Field label="Số điện thoại">
        <input
          type="tel"
          placeholder="Nhập số điện thoại"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={25}
          autoComplete="tel"
          required
        />
      </Field>
      <Field label="Địa chỉ">
        <textarea
          placeholder="Số nhà, đường, phường/xã…"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={500}
          rows={3}
          required
        />
      </Field>
      <Toggle
        checked={interest}
        onChange={setInterest}
        title="Áp dụng lãi công nợ"
        detail="Làm mặc định cho các đơn hàng mới của khách."
      />
      <div className="info-note">
        <ShieldCheck size={17} />
        <span>Cài đặt này không thay đổi chính sách lãi của các đơn đã tạo.</span>
      </div>
    </SubmitForm>
  );
}
