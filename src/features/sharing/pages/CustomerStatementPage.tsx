import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Link2Off, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { isShareToken, type CustomerStatement } from '../../../../shared/sharing';
import { IconLogo } from '../../../shared/ui/IconLogo';
import { StatementOrderCard } from '../components/StatementOrderCard';
import { dateText, money } from '../../../lib/format';

type View =
  | { status: 'loading' }
  | { status: 'invalid' }
  | { status: 'error' }
  | { status: 'ready'; statement: CustomerStatement };
export function CustomerStatementPage() {
  const { hash } = useLocation();
  const token = hash.slice(1);
  const [view, setView] = useState<View>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const previous = document.title;
    document.title = 'Thông tin đơn hàng và công nợ · MHQ';
    return () => {
      document.title = previous;
    };
  }, []);
  useEffect(() => {
    if (!isShareToken(token)) {
      setView({ status: 'invalid' });
      return;
    }
    const controller = new AbortController();
    setView({ status: 'loading' });
    void (async () => {
      try {
        const response = await fetch('/api/public/statement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
          credentials: 'omit',
          cache: 'no-store',
          referrerPolicy: 'no-referrer',
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (response.status === 404 || response.status === 400) {
          setView({ status: 'invalid' });
          return;
        }
        if (!response.ok) throw new Error('Unavailable');
        const statement = (await response.json()) as CustomerStatement;
        if (!controller.signal.aborted) setView({ status: 'ready', statement });
      } catch {
        if (!controller.signal.aborted) setView({ status: 'error' });
      }
    })();
    return () => controller.abort();
  }, [token, attempt]);
  return (
    <div className="app-shell statement-page">
      <header className="statement-header">
        <div className="brand">
          <IconLogo small />
          <span>
            MHQ<span>SỔ CỬA HÀNG</span>
          </span>
        </div>
        <span className="badge green">
          <ShieldCheck size={14} /> Chỉ xem
        </span>
      </header>
      <main>
        {view.status === 'loading' ? (
          <div className="statement-loading" role="status">
            <Loader2 className="spin" size={28} />
            <p>Đang tải thông tin công nợ…</p>
          </div>
        ) : view.status === 'invalid' ? (
          <div className="empty">
            <span className="empty-icon">
              <Link2Off size={28} />
            </span>
            <h1>Link không còn hiệu lực</h1>
            <p>
              Đường dẫn không đúng hoặc đã được cửa hàng thu hồi. Vui lòng liên hệ cửa hàng để nhận
              link mới.
            </p>
          </div>
        ) : view.status === 'error' ? (
          <div className="empty" role="alert">
            <h1>Chưa tải được công nợ</h1>
            <p>Kiểm tra kết nối mạng rồi thử lại.</p>
            <button className="primary" onClick={() => setAttempt((value) => value + 1)}>
              <RefreshCw size={18} /> Thử lại
            </button>
          </div>
        ) : (
          <>
            <div className="statement-intro">
              <p className="eyebrow">{view.statement.store_name}</p>
              <h1>{view.statement.customer_name}</h1>
              <p>Thông tin đơn hàng và công nợ của bạn</p>
            </div>
            <section className="balance-summary statement-balance">
              <span>Tổng số tiền còn phải trả</span>
              <h2>{money(view.statement.balance.total)}</h2>
              <div className="summary-line">
                <span>Nợ gốc còn lại</span>
                <strong>{money(view.statement.balance.principal)}</strong>
              </div>
              <div className="summary-line">
                <span>Lãi tích lũy chưa trả</span>
                <strong>{money(view.statement.balance.interest)}</strong>
              </div>
              <div className="summary-divider" />
              <div className="summary-line">
                <span>Đã thanh toán (gốc + lãi)</span>
                <strong className="settled-text">{money(view.statement.balance.paid)}</strong>
              </div>
            </section>
            <div className="statement-updated">
              <span>
                Tính đến {dateText(view.statement.as_of)}
                <small>
                  Cập nhật lúc{' '}
                  {new Date(view.statement.generated_at).toLocaleTimeString('vi-VN', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </small>
              </span>
              <button className="text-button" onClick={() => setAttempt((value) => value + 1)}>
                <RefreshCw size={17} /> Làm mới
              </button>
            </div>
            <section className="statement-orders">
              <h2>
                Đơn hàng của bạn{' '}
                <span className="heading-count">{view.statement.orders.length}</span>
              </h2>
              <p className="section-description">
                Mở từng đơn để xem sản phẩm, các lần trả tiền và cách tính lãi.
              </p>
              {view.statement.orders.length ? (
                view.statement.orders.map((order, index) => (
                  <StatementOrderCard key={order.code + '-' + index} order={order} />
                ))
              ) : (
                <p className="statement-no-orders">Cửa hàng chưa ghi nhận đơn hàng nào cho bạn.</p>
              )}
            </section>
            <p className="statement-footer">
              Số liệu được cập nhật theo ghi nhận của cửa hàng. Nếu có thông tin chưa khớp, bạn vui
              lòng liên hệ {view.statement.store_name} để đối chiếu.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
