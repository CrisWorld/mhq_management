import { useUi } from '../../../app/providers/UiProvider';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { errorText } from '../../../lib/errors';
import { useStore } from '../../../app/providers/StoreProvider';
import { useState } from 'react';
import { todayVN } from '../../../../shared/finance';
import { Settings2, ShieldCheck, FileText, ChevronRight, LogOut, Trash2 } from 'lucide-react';
import { SubmitForm } from '../../../shared/ui/SubmitForm';
import { Field } from '../../../shared/ui/Field';
import { MoneyInput } from '../../../shared/ui/MoneyInput';
import { money } from '../../../lib/format';

export function Settings() {
  const { notify } = useUi();

  const { signOut } = useAuth();
  const navigate = useNavigate();
  async function onLogout() {
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      notify(errorText(error));
    }
  }
  const { data, mutate } = useStore();
  const [name, setName] = useState(data.store.name);
  const [rate, setRate] = useState(String(data.store.interest_per_million));
  function exportData() {
    const blob = new Blob(
      [JSON.stringify({ ...data, exported_at: new Date().toISOString() }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mhq-sao-luu-' + todayVN() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    notify('Đã tải bản sao dữ liệu.');
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">THIẾT LẬP THEO CÁCH CỦA BẠN</p>
          <h1>Cửa hàng</h1>
        </div>
        <span className="stat-icon mint">
          <Settings2 size={23} />
        </span>
      </div>
      <section className="content-card settings-card">
        <h2>Thông tin & chính sách lãi</h2>
        <SubmitForm
          onSave={async () => {
            if (!name.trim()) throw new Error('Vui lòng nhập tên cửa hàng.');
            await mutate('settings', 'PATCH', {
              name: name.trim(),
              interest_per_million: Number(rate),
            });
            notify('Đã lưu cài đặt cửa hàng.');
          }}
          label="Lưu cài đặt"
        >
          <Field label="Tên cửa hàng">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
            />
          </Field>
          <Field
            label="Lãi mỗi 1.000.000 ₫ / tháng"
            hint="Mặc định 20.000 ₫, tương đương 2% mỗi tháng."
          >
            <MoneyInput value={rate} onChange={setRate} required />
          </Field>
          <div className="rate-example">
            <span>Ví dụ với chính sách hiện tại</span>
            <div>
              <span>Nợ gốc 500.000 ₫</span>
              <strong>{money(Math.round((500000 * Number(rate)) / 1000000))} / tháng</strong>
            </div>
            <div>
              <span>Nợ gốc 1.000.000 ₫</span>
              <strong>{money(Number(rate))} / tháng</strong>
            </div>
          </div>
        </SubmitForm>
      </section>
      <section className="content-card policy-card">
        <div className="section-title">
          <h2>Cách tính công nợ</h2>
          <ShieldCheck size={19} />
        </div>
        <ul>
          <li>Miễn lãi trong tháng mua, bắt đầu từ ngày 1 tháng sau.</li>
          <li>
            Lãi tính trên nợ gốc còn lại đầu tháng, làm tròn đến 1 đồng. Lãi chưa trả được cộng dồn,
            không sinh thêm lãi.
          </li>
          <li>Tiền thu thanh toán lãi trước, phần còn lại trừ gốc.</li>
          <li>Mặc định khách mới có tính lãi. Bạn có thể tắt theo khách hoặc theo từng đơn.</li>
          <li>
            Đơn hàng lưu riêng mức lãi và lựa chọn tính lãi lúc tạo. Đổi cài đặt không ảnh hưởng đơn
            cũ.
          </li>
          <li>
            Khách chưa trả góp: còn ít nhất một đơn từ tháng trước, còn nợ và chưa có lần trả góp
            trên đơn đó trong tháng được chọn.
          </li>
        </ul>
      </section>
      <button className="settings-action" onClick={() => navigate('/settings/trash')}>
        <Trash2 size={19} />
        <span>
          <strong>Thùng rác</strong>
          <small>Khôi phục khách hàng, sản phẩm và giao dịch đã xoá</small>
        </span>
        <ChevronRight size={17} />
      </button>
      <button className="settings-action" onClick={exportData}>
        <FileText size={19} />
        <span>
          <strong>Tải bản sao dữ liệu</strong>
          <small>Khách hàng, đơn hàng, lịch sử thu tiền (JSON)</small>
        </span>
        <ChevronRight size={17} />
      </button>
      <button className="settings-action logout-action" onClick={onLogout}>
        <LogOut size={19} />
        <span>
          <strong>Đăng xuất</strong>
          <small>Kết thúc phiên trên thiết bị này</small>
        </span>
        <ChevronRight size={17} />
      </button>
      <div className="page-footer">
        MHQ · Sổ cửa hàng nội thất <span>Phiên bản 1.0</span>
      </div>
    </>
  );
}
