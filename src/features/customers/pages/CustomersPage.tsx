import { useUi } from '../../../app/providers/UiProvider';
import { useStore } from '../../../app/providers/StoreProvider';
import { useLocation } from 'react-router-dom';
import { useState } from 'react';
import { todayVN, monthlyReport, customerDebt } from '../../../../shared/finance';
import { normalize } from '../../../lib/format';
import { Plus, Search, X } from 'lucide-react';
import { CustomerRow } from '../components/CustomerRow';
import { Empty } from '../../../shared/ui/Empty';

export function Customers() {
  const { open } = useUi();

  const { data } = useStore();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(
    new URLSearchParams(location.search).get('pending') ? 'pending' : 'all',
  );
  const month = new URLSearchParams(location.search).get('pending') || todayVN().slice(0, 7);
  const report = monthlyReport(data.orders, month);
  const list = data.customers
    .filter(
      (c) =>
        normalize(c.name + ' ' + c.phone + ' ' + c.address).includes(normalize(search)) &&
        (filter === 'all' ||
          (filter === 'debt' && customerDebt(data.orders, c.id).total > 0) ||
          (filter === 'pending' && report.pendingIds.includes(c.id))),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">GẮN KẾT MỖI NGÀY</p>
          <h1>
            Khách hàng <span className="heading-count">{data.customers.length}</span>
          </h1>
        </div>
        <button
          className="add-button"
          aria-label="Thêm khách hàng"
          onClick={() => open({ type: 'customer' })}
        >
          <Plus size={23} />
        </button>
      </div>
      <div className="search-field">
        <Search size={19} />
        <input
          aria-label="Tìm khách hàng"
          placeholder="Tìm tên, số điện thoại, địa chỉ…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="icon-button" aria-label="Xóa tìm kiếm" onClick={() => setSearch('')}>
            <X size={16} />
          </button>
        )}
      </div>
      <div className="filter-tabs">
        {[
          ['all', 'Tất cả'],
          ['debt', 'Còn nợ'],
          ['pending', 'Chưa thu tháng ' + Number(month.slice(5))],
        ].map(([v, label]) => (
          <button key={v} className={filter === v ? 'selected' : ''} onClick={() => setFilter(v)}>
            {label}
          </button>
        ))}
      </div>
      <div className="list-caption">
        {list.length} KHÁCH HÀNG <span>Sắp xếp theo tên</span>
      </div>
      <div className="customer-list">
        {list.length ? (
          list.map((c) => (
            <CustomerRow
              key={c.id}
              customer={c}
              pending={filter === 'pending'}
              asOf={filter === 'pending' ? report.asOf : todayVN()}
            />
          ))
        ) : (
          <Empty
            title={search ? 'Không tìm thấy khách hàng' : 'Chưa có khách hàng'}
            detail={
              search
                ? 'Thử tìm bằng tên hoặc số điện thoại khác.'
                : 'Lưu thông tin khách để tạo đơn và theo dõi công nợ.'
            }
            action={
              !search && (
                <button className="primary" onClick={() => open({ type: 'customer' })}>
                  <Plus size={17} /> Thêm khách hàng
                </button>
              )
            }
          />
        )}
      </div>
    </>
  );
}
