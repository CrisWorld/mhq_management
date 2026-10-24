import { useState } from 'react';
import { X, Plus, Search, Sofa } from 'lucide-react';
import type { Product } from '../../../../shared/types';
import { normalize, money } from '../../../lib/format';
import { ProductForm } from '../../products/components/ProductForm';
type Props = {
  products: Product[];
  quick: boolean;
  onQuickChange: (value: boolean) => void;
  onSelect: (product: Product) => void;
};
export function OrderProductPicker({ products: catalog, quick, onQuickChange, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const products = catalog.filter((product) => normalize(product.name).includes(normalize(search)));
  return (
    <div className="order-picker">
      <div className="section-title">
        <h3>Chọn sản phẩm</h3>
        <button type="button" className="text-button" onClick={() => onQuickChange(!quick)}>
          {quick ? <X size={15} /> : <Plus size={15} />}Thêm nhanh
        </button>
      </div>
      {quick ? (
        <div className="quick-product">
          <ProductForm
            inline
            onSaved={(p) => {
              if (p) onSelect(p);
              onQuickChange(false);
              setSearch('');
            }}
          />
        </div>
      ) : (
        <>
          <div className="search-field small-search">
            <Search size={17} />
            <input
              aria-label="Tìm sản phẩm trong đơn"
              placeholder="Tìm trong danh mục…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="picker-list">
            {products.length ? (
              products.map((p) => (
                <button type="button" key={p.id} onClick={() => onSelect(p)}>
                  <span className="product-icon">
                    <Sofa size={20} />
                  </span>
                  <span>
                    <strong>{p.name}</strong>
                    <small>{money(Number(p.price))}</small>
                  </span>
                  <Plus size={18} />
                </button>
              ))
            ) : (
              <p className="picker-empty">Chưa có sản phẩm phù hợp. Nhấn “Thêm nhanh” để tạo.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
