import { useEffect } from 'react';

export function useSheetFocus(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controls = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          '.sheet button:not(:disabled),.sheet input:not(:disabled),.sheet textarea:not(:disabled),.sheet select:not(:disabled)',
        ),
      ).filter((control) => control.getClientRects().length);
    if (!document.activeElement?.closest('.sheet')) controls()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const elements = controls();
      const first = elements[0];
      const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener('keydown', keydown);
      previous?.focus();
    };
  }, [open, onClose]);
}
