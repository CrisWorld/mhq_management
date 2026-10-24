import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { IconLogo } from '../../../shared/ui/IconLogo';
import { SubmitForm } from '../../../shared/ui/SubmitForm';
import { Field } from '../../../shared/ui/Field';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        <div className="login-copy">
          <h1>Đăng nhập cửa hàng</h1>
          <p>Theo dõi khách hàng, đơn hàng và công nợ mỗi ngày.</p>
        </div>
        <div className="login-form">
          <SubmitForm busyLabel="Đang đăng nhập…" label="Đăng nhập" onSave={login}>
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
              <div className="password-field">
                <input
                  aria-label="Mật khẩu"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </Field>
          </SubmitForm>
        </div>
        <p className="secure-caption">
          <ShieldCheck size={14} /> Bạn không cần đăng nhập lại mỗi lần mở ứng dụng.
        </p>
      </div>
    </div>
  );
}
