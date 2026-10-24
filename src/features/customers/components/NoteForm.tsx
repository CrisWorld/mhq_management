import { useUi } from '../../../app/providers/UiProvider';
import type { Customer } from '../../../../shared/types';
import { useStore } from '../../../app/providers/StoreProvider';
import { useState } from 'react';
import { SubmitForm } from '../../../shared/ui/SubmitForm';
import { initials } from '../../../lib/format';
import { Field } from '../../../shared/ui/Field';

export function NoteForm({ customer, close }: { customer: Customer; close: () => void }) {
  const { notify } = useUi();
  const { mutate } = useStore();
  const [text, setText] = useState('');
  return (
    <SubmitForm
      label="Lưu ghi chú"
      onSave={async () => {
        if (!text.trim()) throw new Error('Vui lòng nhập nội dung ghi chú.');
        await mutate('customers/' + customer.id + '/notes', 'POST', { content: text.trim() });
        notify('Đã lưu ghi chú.');
        close();
      }}
    >
      <div className="form-customer">
        <span className="avatar">{initials(customer.name)}</span>
        <strong>{customer.name}</strong>
      </div>
      <Field label="Nội dung ghi chú" hint="Thời gian được lưu tự động cùng ghi chú.">
        <textarea
          autoFocus
          placeholder="Lịch hẹn trả góp, trao đổi với khách…"
          rows={5}
          maxLength={2000}
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </Field>
    </SubmitForm>
  );
}
