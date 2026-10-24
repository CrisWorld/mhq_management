import { useEffect, useRef } from 'react';
import type { Order } from '../../../../shared/types';
import { todayVN, monthlyReport } from '../../../../shared/finance';
import { money, shortMoney } from '../../../lib/format';
type Props = { orders: Order[]; month: string; onSelectMonth: (month: string) => void };
export function RevenueChart({ orders, month, onSelectMonth }: Props) {
  const now = todayVN();
  const year = month.slice(0, 4);
  const bars = Array.from({ length: 12 }, (_, i) => {
    const key = year + '-' + String(i + 1).padStart(2, '0');
    return { key, ...monthlyReport(orders, key) };
  });
  const max = Math.max(...bars.map((b) => Math.max(b.revenue, b.collected)), 1);
  const yearRevenue = bars.reduce((s, b) => s + b.revenue, 0);
  const selected = bars.find((bar) => bar.key === month)!;
  const barsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = barsRef.current;
    const active = container?.querySelector<HTMLElement>('.selected');
    if (!container || !active) return;
    container.scrollLeft +=
      active.getBoundingClientRect().left -
      container.getBoundingClientRect().left -
      (container.clientWidth - active.clientWidth) / 2;
  }, [month]);

  return (
    <section className="chart-card">
      <div className="section-title">
        <div>
          <h2>Doanh thu theo tháng</h2>
          <p className="chart-total">
            {money(yearRevenue)} <span>/ năm</span>
          </p>
        </div>
        <select
          aria-label="Năm doanh thu"
          value={year}
          onChange={(e) =>
            onSelectMonth(
              e.target.value +
                '-' +
                (e.target.value === now.slice(0, 4) ? now.slice(5, 7) : month.slice(5, 7)),
            )
          }
        >
          {Array.from(
            {
              length:
                Math.max(
                  3,
                  Number(now.slice(0, 4)) -
                    Math.min(
                      Number(now.slice(0, 4)),
                      ...orders.map((o) => Number(o.ordered_on.slice(0, 4))),
                    ),
                ) + 1,
            },
            (_, i) => String(Number(now.slice(0, 4)) - i),
          ).map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      </div>
      <div className="chart-legend">
        <span>
          <i />
          Bán hàng
        </span>
        <span>
          <i />
          Thực thu
        </span>
      </div>
      <div
        className="bar-chart"
        role="group"
        aria-label={'Biểu đồ doanh thu và tiền thu năm ' + year}
      >
        <div className="chart-grid">
          <span>{shortMoney(max)}</span>
          <span>{shortMoney(max / 2)}</span>
          <span>0</span>
        </div>
        <div className="bars" ref={barsRef}>
          {bars.map((b, i) => (
            <button
              key={b.key}
              className={'bar-group ' + (b.key === month ? 'selected' : '')}
              aria-pressed={b.key === month}
              onClick={() => {
                if (b.key <= now.slice(0, 7)) onSelectMonth(b.key);
              }}
              disabled={b.key > now.slice(0, 7)}
              aria-label={`Tháng ${i + 1}: doanh thu ${money(b.revenue)}, thực thu ${money(b.collected)}`}
              title={`T${i + 1}: ${money(b.revenue)} / ${money(b.collected)}`}
            >
              <span className="bar-pair">
                <i style={{ height: (b.revenue / max) * 100 + '%' }} />
                <i style={{ height: (b.collected / max) * 100 + '%' }} />
              </span>
              <span>{i + 1}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="chart-selection">
        Tháng {Number(month.slice(5))}: bán hàng {money(selected.revenue)} · thực thu{' '}
        {money(selected.collected)}
      </p>
      <p className="chart-footnote">Bán hàng theo ngày mua · Thực thu theo ngày nhận tiền</p>
    </section>
  );
}
