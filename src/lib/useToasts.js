import { createContext, useContext } from 'react';

export const ToastsContext = createContext(null);

// const toasts = useToasts(); toasts.success('Cambios guardados');
// toasts.error('No pudimos...', { action: { label: 'Reintentar', onClick } })
export function useToasts() {
  const ctx = useContext(ToastsContext);
  if (!ctx) throw new Error('useToasts must be used within ToastsProvider');
  return ctx;
}
