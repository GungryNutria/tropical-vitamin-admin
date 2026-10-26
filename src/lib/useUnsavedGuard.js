import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

// Cambios sin guardar (REQ-12): bloquea la navegación interna (el llamador muestra el
// diálogo con `blocker.state === 'blocked'` y decide `blocker.proceed()` / `blocker.reset()`)
// y avisa al cerrar o recargar la pestaña.
export default function useUnsavedGuard(dirty) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  return blocker;
}
