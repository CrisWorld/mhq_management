import { useUi } from '../../../app/providers/UiProvider';
import { useStore } from '../../../app/providers/StoreProvider';
import { useState } from 'react';
import { normalize, money } from '../../../lib/format';
import { Plus, Search, Sofa, ChevronRight, Package, Info } from 'lucide-react';
import { Empty } from '../../../shared/ui/Empty';

export function Products() {
  const { open } = useUi();
  const { data } = useStore();
  const [search, setSearch] = useState('');
  const products = data.products
    .filter((p) => normalize(p.name).includes(normalize(search)))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">DANH MỤC CỬA HÀNG</p>
          <h1>
            Sản phẩm <span className="heading-count">{data.products.length}</span>
          </h1>
        </div>
        <button
          className="add-button"
          aria-label="Thêm sản phẩm"
          onClick={() => open({ type: 'product' })}
        >
          <Plus size={20} /> Thêm
        </button>
      </div>
      <div className="search-field">
        <Search size={19} />
        <input
          aria-label="Tìm sản phẩm"
          placeholder="Tìm tên sản phẩm…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="product-list">
        {products.length ? (
          products.map((p) => (
            <button
              key={p.id}
              className="product-card"
              onClick={() => open({ type: 'product', product: p })}
            >
              <span className="product-thumbnail">
                <Sofa size={35} strokeWidth={1.3} />
              </span>
              <span>
                <strong>{p.name}</strong>
                <small>{money(Number(p.price))}</small>
              </span>
              <ChevronRight size={17} />
            </button>
          ))
        ) : (
          <Empty
            icon={<Package />}
            title={search ? 'Không tìm thấy sản phẩm' : 'Danh mục còn trống'}
            detail="Thêm tên và giá để chọn nhanh khi tạo đơn."
            action={
              <button className="primary" onClick={() => open({ type: 'product' })}>
                <Plus size={17} />
                Thêm sản phẩm
              </button>
            }
          />
        )}
      </div>
      <div className="info-note">
        <Info size={17} />
        <span>
          Thay đổi giá sản phẩm chỉ áp dụng cho đơn mới. Giá trong các đơn đã tạo được giữ nguyên.
        </span>
      </div>
    </>
  );
}
