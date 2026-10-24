import { useCallback, useEffect, useState } from 'react';
import { ArchiveRestore, Loader2, Trash2 } from 'lucide-react';
import type { RecordType, TrashRecord } from '../../../../shared/types';
import { useStore } from '../../../app/providers/StoreProvider';
import { useUi } from '../../../app/providers/UiProvider';
import { request } from '../../../lib/http';
import { errorText } from '../../../lib/errors';
import { dateText } from '../../../lib/format';
import { Back } from '../../../shared/ui/Back';
import { Empty } from '../../../shared/ui/Empty';
import { ErrorBox } from '../../../shared/ui/ErrorBox';

const labels: Record<RecordType, string> = {
  customer: 'Khách hàng',
  product: 'Sản phẩm',
  order: 'Đơn hàng',
  payment: 'Khoản thu',
  note: 'Ghi chú',
};
export function TrashPage() {
  const { mutate } = useStore();
  const { notify } = useUi();
  const [rows, setRows] = useState<TrashRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await request<TrashRecord[]>('trash'));
      setError('');
    } catch (error) {
      setError(errorText(error));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function restore(row: TrashRecord) {
    if (busy) return;
    setBusy(row.id);
    setError('');
    try {
      await mutate(`trash/${row.type}/${row.id}/restore`, 'PATCH', undefined);
      notify('Đã khôi phục ' + labels[row.type].toLowerCase() + '.');
      await load();
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy('');
    }
  }
  const visible = rows.filter((row) => filter === 'all' || row.type === filter);
  return (
    <>
      <Back to="/settings" label="Cửa hàng" />
      <div className="page-heading">
        <div>
          <p className="eyebrow">DỮ LIỆU ĐÃ XOÁ MỀM</p>
          <h1>Thùng rác</h1>
        </div>
        <Trash2 size={24} />
      </div>
      <p className="muted">
        Dữ liệu được giữ lại cho đến khi bạn khôi phục. Khôi phục khách hàng sẽ hiện lại các đơn và
        ghi chú chưa bị xoá riêng. Khôi phục đơn sẽ hiện lại các khoản thu chưa bị xoá riêng.
      </p>
      <label className="trash-filter">
        Loại dữ liệu
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">Tất cả</option>
          {Object.entries(labels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <ErrorBox message={error} />
      {error && (
        <button className="text-button" onClick={() => void load()}>
          Thử tải lại
        </button>
      )}
      {loading ? (
        <p className="muted">
          <Loader2 size={16} className="spin" /> Đang tải Thùng rác…
        </p>
      ) : visible.length ? (
        <div className="trash-list">
          {visible.map((row) => (
            <article key={row.type + row.id} className="trash-card">
              <small>
                {labels[row.type]} · Xoá ngày {dateText(row.deleted_at)}
              </small>
              <h3>{row.label}</h3>
              <p>{row.detail}</p>
              {row.parent_deleted && (
                <p className="muted">Cần khôi phục khách hàng hoặc đơn hàng liên quan trước.</p>
              )}
              <button
                className="secondary"
                disabled={!!busy || row.parent_deleted}
                onClick={() => void restore(row)}
              >
                {busy === row.id ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <ArchiveRestore size={16} />
                )}
                Khôi phục
              </button>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          icon={<Trash2 />}
          title="Không có dữ liệu đã xoá"
          detail="Dữ liệu bạn xoá sẽ xuất hiện ở đây để khôi phục."
        />
      )}
    </>
  );
}
