import { useRef, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { useStore } from '../../app/providers/StoreProvider';
import { useUi } from '../../app/providers/UiProvider';
import { ErrorBox } from './ErrorBox';
import { errorText } from '../../lib/errors';

type Props = { path: string; label: string; detail: string; onDeleted?: () => void };
export function DeleteButton({ path, label, detail, onDeleted }: Props) {
  const { mutate } = useStore();
  const { notify } = useUi();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  async function remove() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await mutate(path, 'DELETE', undefined);
      notify('Đã chuyển vào Thùng rác. Có thể khôi phục trong Cửa hàng.');
      setConfirming(false);
      onDeleted?.();
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <div className="delete-control">
      {!confirming ? (
        <button type="button" className="danger-link" onClick={() => setConfirming(true)}>
          <Trash2 size={16} />
          {label}
        </button>
      ) : (
        <div className="delete-confirm" role="group" aria-label={'Xác nhận ' + label.toLowerCase()}>
          <strong>{label}?</strong>
          <p>{detail} Dữ liệu được giữ trong Thùng rác để khôi phục.</p>
          <div className="record-actions">
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => {
                setConfirming(false);
                setError('');
              }}
            >
              Giữ lại
            </button>
            <button
              type="button"
              className="danger-button"
              disabled={busy}
              onClick={() => void remove()}
            >
              {busy ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
              {busy ? 'Đang xoá…' : 'Xác nhận xoá'}
            </button>
          </div>
        </div>
      )}
      <ErrorBox message={error} />
    </div>
  );
}
