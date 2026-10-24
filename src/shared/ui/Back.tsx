import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function Back({ to, label }: { to: string; label: string }) {
  return (
    <Link className="back-link" to={to}>
      <ArrowLeft size={17} />
      {label}
    </Link>
  );
}
