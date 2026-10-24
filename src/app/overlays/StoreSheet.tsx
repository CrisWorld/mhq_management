import { X } from 'lucide-react';
import { useUi } from '../providers/UiProvider';
import { CustomerForm } from '../../features/customers/components/CustomerForm';
import { NoteForm } from '../../features/customers/components/NoteForm';
import { ProductForm } from '../../features/products/components/ProductForm';
import { PaymentForm } from '../../features/orders/components/PaymentForm';
import { OrderForm } from '../../features/orders/components/OrderForm';
import { useSheetFocus } from './useSheetFocus';
import type { Sheet } from './sheet.types';
function title(sheet: Sheet) {
  switch (sheet.type) {
    case 'customer':
      return sheet.customer ? 'Sửa khách hàng' : 'Thêm khách hàng';
    case 'product':
      return sheet.product ? 'Sửa sản phẩm' : 'Thêm sản phẩm';
    case 'note':
      return 'Thêm ghi chú';
    case 'payment':
      return 'Ghi nhận trả góp';
    case 'order':
      return 'Tạo đơn hàng';
  }
}
function SheetContent({ sheet, close }: { sheet: Sheet; close: () => void }) {
  switch (sheet.type) {
    case 'customer':
      return <CustomerForm customer={sheet.customer} close={close} />;
    case 'product':
      return <ProductForm product={sheet.product} onSaved={close} />;
    case 'note':
      return <NoteForm customer={sheet.customer} close={close} />;
    case 'payment':
      return <PaymentForm order={sheet.order} close={close} />;
    case 'order':
      return <OrderForm customer={sheet.customer} close={close} />;
  }
}
export function StoreSheet() {
  const { sheet, closeSheet } = useUi();
  useSheetFocus(!!sheet, closeSheet);
  if (!sheet) return null;
  return (
    <div
      className="sheet-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeSheet();
      }}
    >
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <div>
            <span className="eyebrow">SỔ CỬA HÀNG</span>
            <h2 id="sheet-title">{title(sheet)}</h2>
          </div>
          <button className="icon-button" aria-label="Đóng" onClick={closeSheet}>
            <X />
          </button>
        </div>
        <div className="sheet-body">
          <SheetContent sheet={sheet} close={closeSheet} />
        </div>
      </section>
    </div>
  );
}
