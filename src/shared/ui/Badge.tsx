import type { ReactNode } from 'react';

export function Badge({ children, tone = 'green' }: { children: ReactNode; tone?: string }) {
  return <span className={'badge ' + tone}>{children}</span>;
}
