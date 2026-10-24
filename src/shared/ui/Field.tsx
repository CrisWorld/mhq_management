import type { ReactNode } from 'react';

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="field">
      <label>
        {label}
        {children}
      </label>
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}
