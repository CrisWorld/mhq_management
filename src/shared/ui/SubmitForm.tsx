import type { ReactNode, FormEvent } from 'react';
import { useState, useRef } from 'react';
import { errorText } from '../../lib/errors';
import { ErrorBox } from './ErrorBox';
import { Loader2, Check } from 'lucide-react';

export function SubmitForm({
  onSave,
  children,
  label = 'Lưu thông tin',
  disabled = false,
}: {
  onSave: () => Promise<void>;
  children: ReactNode;
  label?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await onSave();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <form onSubmit={submit}>
      <fieldset disabled={busy}>{children}</fieldset>
      <ErrorBox message={error} />
      <button className="primary full" disabled={busy || disabled} type="submit">
        {busy ? <Loader2 className="spin" size={18} /> : <Check size={18} />}{' '}
        {busy ? 'Đang lưu…' : label}
      </button>
    </form>
  );
}
