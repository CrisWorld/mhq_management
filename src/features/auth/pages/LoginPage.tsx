import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, Sofa } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { IconLogo } from '../../../shared/ui/IconLogo';
import { SubmitForm } from '../../../shared/ui/SubmitForm';
import { Field } from '../../../shared/ui/Field';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  async function login() {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error)
      throw new Error(
        error.message === 'Invalid login credentials'
          ? 'Email hoặc mật khẩu chưa đúng.'
          : error.message,
      );
    navigate('/', { replace: true });
  }
  return (
    <div className="app-shell">
      <div className="login-page">
        <div className="login-brand">
          <IconLogo />
          <span>
            MHQ<span className="brand-caption">SỔ CỬA HÀNG</span>
          </span>
        </div>
        <div className="login-art">
          <div className="art-circle" />
          <Sofa size={130} strokeWidth={1} />
          <span className="art-badge">
            <CheckCircle2 size={16} /> Mọi khoản nợ, đều rõ ràng.
          </span>
        </div>
        <div className="login-copy">
          <span className="eyebrow">MỘT NGÀY BÁN HÀNG THẬT NHẸ NHÀNG</span>
          <h1>
            Cửa hàng trong
            <br />
            lòng bàn tay.
          </h1>
          <p>
            Khách hàng, đơn hàng và công nợ.
            <br />
            Gọn gàng một chỗ, an tâm mỗi ngày.
          </p>
        </div>
        <div className="login-form">
          <h2>Chào mừng trở lại</h2>
          <p>Đăng nhập để tiếp tục quản lý cửa hàng.</p>
          <SubmitForm label="Đăng nhập" onSave={login}>
            <Field label="Email">
              <input
                type="email"
                autoComplete="username"
                placeholder="Email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Mật khẩu">
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
          </SubmitForm>
        </div>
        <p className="secure-caption">
          <ShieldCheck size={14} /> Dữ liệu cửa hàng được bảo vệ bằng tài khoản của bạn.
        </p>
      </div>
    </div>
  );
}
