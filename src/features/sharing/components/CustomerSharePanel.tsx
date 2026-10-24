import { useEffect, useRef, useState } from 'react';
import { Copy, Link2, Loader2, Share2, ShieldCheck, Unlink } from 'lucide-react';
import type { Customer } from '../../../../shared/types';
import { customerShareUrl, type CustomerShareLink } from '../../../../shared/sharing';
import { request } from '../../../lib/http';
import { errorText } from '../../../lib/errors';
import { dateText } from '../../../lib/format';
import { ErrorBox } from '../../../shared/ui/ErrorBox';
import { useUi } from '../../../app/providers/UiProvider';

export function CustomerSharePanel({ customer }: { customer: Customer }) {
  const { notify } = useUi();
  const [link, setLink] = useState<CustomerShareLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [retry, setRetry] = useState(0);
  const mounted = useRef(false);
  const lock = useRef(false);
  const path = 'customers/' + customer.id + '/share';
  useEffect(() => {
    mounted.current = true;
    let active = true;
    setLoading(true);
    setError('');
    request<{ link: CustomerShareLink | null }>(path)
      .then((value) => {
        if (active) setLink(value.link);
      })
      .catch((error) => {
        if (active) setError(errorText(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [path, retry]);
  const url = link ? customerShareUrl(window.location.origin, link.token) : '';
  async function changeLink(revoke: boolean) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      if (revoke) {
        await request(path, 'DELETE');
        if (mounted.current) {
          setLink(null);
          setConfirmRevoke(false);
          notify('Đã thu hồi. Link cũ không còn xem được công nợ.');
        }
      } else {
        const result = await request<CustomerShareLink>(path, 'POST', {});
        if (mounted.current) setLink(result);
      }
    } catch (error) {
      if (mounted.current) setError(errorText(error));
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function copy() {
    setError('');
    try {
      await navigator.clipboard.writeText(url);
      notify('Đã sao chép link. Dán vào Zalo hoặc Messenger để gửi cho khách.');
    } catch {
      setError('Chưa sao chép được. Bạn có thể chọn và sao chép đường dẫn bên dưới.');
    }
  }
  async function share() {
    setError('');
    try {
      await navigator.share({
        title: 'Thông tin đơn hàng và công nợ',
        text: 'Bạn xem lịch sử đơn hàng, các khoản đã trả và công nợ tại đây.',
        url,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setError('Chưa mở được bảng chia sẻ. Hãy sao chép link rồi gửi qua Zalo hoặc Messenger.');
    }
  }
  return (
    <div className="share-panel">
      <div className="share-recipient">
        <span className="stat-icon mint">
          <Link2 size={22} />
        </span>
        <div>
          <strong>{customer.name}</strong>
          <p>Chia sẻ đơn hàng và công nợ</p>
        </div>
      </div>
      <p className="share-explanation">
        Khách mở link để xem số nợ mới nhất, lịch sử đơn hàng và cách tính lãi. Không cần đăng nhập.
      </p>
      <div className="info-note">
        <ShieldCheck size={18} />
        <span>
          Ai có link đều xem được công nợ của khách này. Link chỉ cho phép xem và không có ghi chú
          nội bộ.
        </span>
      </div>
      {loading ? (
        <p className="share-loading" role="status">
          <Loader2 className="spin" size={20} /> Đang tải link chia sẻ…
        </p>
      ) : error && !link ? (
        <>
          <ErrorBox message={error} />
          <button className="secondary full" onClick={() => setRetry((value) => value + 1)}>
            Thử lại
          </button>
        </>
      ) : !link ? (
        <>
          <p className="muted share-status">
            Chưa có link đang hoạt động. Tạo link để gửi cho khách qua Zalo hoặc Messenger.
          </p>
          <button className="primary full" disabled={busy} onClick={() => void changeLink(false)}>
            {busy ? <Loader2 size={18} className="spin" /> : <Link2 size={18} />} Tạo link chia sẻ
          </button>
        </>
      ) : (
        <>
          <p className="share-status">
            <span className="status-dot" /> Link đang hoạt động · Tạo {dateText(link.created_at)}
          </p>
          <div className="share-buttons">
            {typeof navigator.share === 'function' && (
              <button className="primary full" onClick={() => void share()} disabled={busy}>
                <Share2 size={19} /> Chia sẻ qua Zalo, Messenger…
              </button>
            )}
            <button
              className={typeof navigator.share === 'function' ? 'secondary full' : 'primary full'}
              disabled={busy}
              onClick={() => void copy()}
            >
              <Copy size={18} /> Sao chép link
            </button>
          </div>
          <label className="share-url">
            Đường dẫn của khách
            <input
              aria-label="Link chia sẻ của khách"
              readOnly
              value={url}
              onFocus={(event) => event.target.select()}
            />
          </label>
          <p className="muted">
            Dán link vào cuộc trò chuyện với khách trên Zalo hoặc Messenger. Link tự cập nhật khi
            bạn ghi nhận đơn hàng và khoản thu.
          </p>
          {confirmRevoke ? (
            <div className="delete-confirm share-revoke">
              <strong>Thu hồi link này?</strong>
              <p>Khách sẽ không mở được link cũ. Bạn có thể tạo một link mới sau đó.</p>
              <div className="record-actions">
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => setConfirmRevoke(false)}
                >
                  Giữ link
                </button>
                <button
                  className="danger-button"
                  disabled={busy}
                  onClick={() => void changeLink(true)}
                >
                  {busy && <Loader2 className="spin" size={16} />} Thu hồi link
                </button>
              </div>
            </div>
          ) : (
            <button
              className="danger-link share-revoke"
              disabled={busy}
              onClick={() => setConfirmRevoke(true)}
            >
              <Unlink size={17} /> Thu hồi link chia sẻ
            </button>
          )}
          <ErrorBox message={error} />
        </>
      )}
    </div>
  );
}
