import { Info } from 'lucide-react';

export function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div className="error" role="alert">
      <Info size={17} />
      <span>{message}</span>
    </div>
  ) : null;
}
