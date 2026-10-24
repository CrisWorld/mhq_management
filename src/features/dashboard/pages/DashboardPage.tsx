import { RevenueChart } from '../components/RevenueChart';
import { useUi } from '../../../app/providers/UiProvider';
import { useStore } from '../../../app/providers/StoreProvider';
import { todayVN, monthlyReport } from '../../../../shared/finance';
import { useState } from 'react';
import {
  ChevronLeft,
  Clock3,
  ChevronDown,
  ChevronRight,
  Wallet,
  ArrowDownLeft,
  ShoppingBag,
  ArrowUpRight,
  CheckCircle2,
  Plus,
  Users,
} from 'lucide-react';
import { dateText, money } from '../../../lib/format';
import { Link } from 'react-router-dom';
import { CustomerRow } from '../../customers/components/CustomerRow';

export function Dashboard() {
  const { open } = useUi();

  const { data } = useStore();
  const now = todayVN();
  const [month, setMonth] = useState(now.slice(0, 7));
  const report = monthlyReport(data.orders, month);
  const pending = data.customers.filter((c) => report.pendingIds.includes(c.id));
  function changeMonth(dir: number) {
    const d = new Date(month + '-15T12:00:00Z');
    d.setUTCMonth(d.getUTCMonth() + dir);
    const m = d.toISOString().slice(0, 7);
    if (m <= now.slice(0, 7)) setMonth(m);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="greeting">
            Xin chào, {data.store.name} <span>☀</span>
          </p>
          <h1>Tổng quan cửa hàng</h1>
        </div>
      </div>
      <div className="month-control">
        <button className="icon-button" aria-label="Tháng trước" onClick={() => changeMonth(-1)}>
          <ChevronLeft size={18} />
        </button>
        <label className="month-picker">
          <Clock3 size={16} />
          <span>
            Tháng {Number(month.slice(5))}, {month.slice(0, 4)}
          </span>
          <input
            aria-label="Tháng báo cáo"
            type="month"
            max={now.slice(0, 7)}
            value={month}
            onInput={(e) => {
              if (e.currentTarget.value && e.currentTarget.value <= now.slice(0, 7))
                setMonth(e.currentTarget.value);
            }}
            onChange={(e) => {
              if (e.target.value && e.target.value <= now.slice(0, 7)) setMonth(e.target.value);
            }}
          />
          <ChevronDown size={15} />
        </label>
        <button
          className="icon-button"
          aria-label="Tháng sau"
          disabled={month === now.slice(0, 7)}
          onClick={() => changeMonth(1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <section className="debt-card">
        <div className="card-orbit" />
        <div className="debt-top">
          <span>
            <Wallet size={17} /> Tổng công nợ
          </span>
          <span className="as-of">Đến {dateText(report.asOf).slice(0, 5)}</span>
        </div>
        <h2>{money(report.total)}</h2>
        <p>Số tiền khách hàng còn cần thanh toán</p>
        <div className="debt-split">
          <div>
            <span>Nợ gốc còn lại</span>
            <strong>{money(report.principal)}</strong>
          </div>
          <div>
            <span>Lãi tích lũy chưa trả</span>
            <strong>{money(report.interest)}</strong>
          </div>
        </div>
      </section>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon mint">
            <ArrowDownLeft size={19} />
          </div>
          <span>Tiền đã thu</span>
          <strong>{money(report.collected)}</strong>
          <small>Gồm trả trước & trả góp</small>
        </div>
        <div className="stat-card">
          <div className="stat-icon peach">
            <ShoppingBag size={19} />
          </div>
          <span>Doanh thu bán hàng</span>
          <strong>{money(report.revenue)}</strong>
          <small>{report.orderCount} đơn trong tháng</small>
        </div>
      </div>
      <section className="pending-section">
        <div className="section-title">
          <h2>
            Chưa trả góp tháng này <span className="count">{pending.length}</span>
          </h2>
          <Link to={'/customers?pending=' + month} aria-label="Xem khách chưa trả góp">
            <ArrowUpRight size={20} />
          </Link>
        </div>
        <p className="section-description">Khách còn đơn cũ chưa có lần trả góp trong tháng.</p>
        {pending.length ? (
          <div className="customer-list compact">
            {pending.slice(0, 3).map((c) => (
              <CustomerRow key={c.id} customer={c} asOf={report.asOf} pending />
            ))}
          </div>
        ) : (
          <div className="all-done">
            <CheckCircle2 size={23} />
            <div>
              <strong>
                {data.orders.length ? 'Không có khách cần nhắc' : 'Sẵn sàng cho đơn hàng đầu tiên'}
              </strong>
              <span>
                {data.orders.length
                  ? 'Các khoản thu tháng này đã được ghi nhận.'
                  : 'Thêm khách hàng để bắt đầu ghi sổ.'}
              </span>
            </div>
            {!data.customers.length && (
              <button
                className="icon-button"
                aria-label="Thêm khách hàng"
                onClick={() => open({ type: 'customer' })}
              >
                <Plus size={20} />
              </button>
            )}
          </div>
        )}
      </section>
      <RevenueChart orders={data.orders} month={month} onSelectMonth={setMonth} />
      <Link to="/customers" className="quick-link">
        <div className="stat-icon mint">
          <Users size={21} />
        </div>
        <div>
          <strong>Khách hàng của cửa hàng</strong>
          <span>{data.customers.length} khách hàng · Quản lý & tạo đơn mới</span>
        </div>
        <ChevronRight size={19} />
      </Link>
      <div className="page-footer">
        <span className="tiny-dot" /> Ghi sổ rõ ràng, kinh doanh an tâm.
      </div>
    </>
  );
}
