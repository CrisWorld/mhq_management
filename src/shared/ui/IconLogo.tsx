import { Sofa } from 'lucide-react';

export function IconLogo({ small = false }: { small?: boolean }) {
  return (
    <span className={'logo ' + (small ? 'small' : '')}>
      <Sofa size={small ? 22 : 29} strokeWidth={1.7} />
    </span>
  );
}
