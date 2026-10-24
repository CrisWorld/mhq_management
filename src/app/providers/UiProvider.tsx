import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Sheet } from '../overlays/sheet.types';
type UiContextValue = {
  sheet: Sheet | null;
  open: (sheet: Sheet) => void;
  closeSheet: () => void;
  toast: string;
  notify: (message: string) => void;
};
const UiContext = createContext<UiContextValue | null>(null);
export function UiProvider({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [toast, setToast] = useState('');
  const closeSheet = useCallback(() => setSheet(null), []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <UiContext.Provider value={{ sheet, open: setSheet, closeSheet, toast, notify: setToast }}>
      {children}
    </UiContext.Provider>
  );
}
export function useUi() {
  const value = useContext(UiContext);
  if (!value) throw new Error('useUi requires UiProvider');
  return value;
}
