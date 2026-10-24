export function MoneyInput({
  value,
  onChange,
  ...props
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  required?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="money-input">
      <input
        {...props}
        inputMode="numeric"
        value={value ? Number(value).toLocaleString('vi-VN') : ''}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 13))}
      />
      <span>₫</span>
    </div>
  );
}
