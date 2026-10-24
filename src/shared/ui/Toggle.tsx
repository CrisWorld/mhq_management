export function Toggle({
  checked,
  onChange,
  title,
  detail,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  detail?: string;
}) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{title}</strong>
        {detail && <small>{detail}</small>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <i />
    </label>
  );
}
