import { useCallback, useMemo, useRef, useState } from 'react';
import { Box, ButtonBase, IconButton, Typography } from '@mui/material';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import Close from '@mui/icons-material/Close';
import { ToastsContext } from '../lib/useToasts';
import { useIsMobile } from '../lib/useIsMobile';

const SUCCESS_MS = 5000;

const kinds = {
  success: { icon: CheckCircleOutline, color: 'success.main', bg: 'statusBg.success', role: 'status' },
  error: { icon: ErrorOutline, color: 'error.main', bg: 'statusBg.danger', role: 'alert' },
};

const actionLink = { color: 'primary.main', textDecoration: 'underline', fontSize: 14, fontWeight: 600, borderRadius: '4px', px: 0.5 };

function Toast({ toast, onClose, mobile }) {
  const { icon: Icon, color, bg, role } = kinds[toast.kind];
  const { action } = toast;
  const runAction = () => {
    action.onClick();
    onClose(toast.id);
  };
  const closeButton = (
    <IconButton size="small" aria-label="Cerrar aviso" onClick={() => onClose(toast.id)} sx={{ width: mobile ? 44 : 32, height: mobile ? 44 : 32 }}>
      <Close fontSize="small" />
    </IconButton>
  );
  const frame = {
    bgcolor: bg,
    border: '1px solid',
    borderColor: color,
    borderRadius: '6px',
    pointerEvents: 'auto',
  };

  if (mobile) {
    // 358 px (todo el ancho menos 16 a cada lado): el texto usa todo el ancho; con acción, la X pasa a la fila de abajo
    // (E4.7, E5.8); sin acción se queda junto al texto (E5.7).
    return (
      <Box role={role} sx={{ ...frame, width: '100%', pl: 2, pr: 0.5, py: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 44 }}>
          <Icon sx={{ color, fontSize: 20, flexShrink: 0 }} aria-hidden />
          <Typography variant="body2" sx={{ flex: 1 }}>{toast.message}</Typography>
          {!action && closeButton}
        </Box>
        {action && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <ButtonBase onClick={runAction} sx={{ ...actionLink, minHeight: 44, minWidth: 44 }}>{action.label}</ButtonBase>
            {closeButton}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box
      role={role}
      sx={{ ...frame, display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 56, px: 2, py: 1, width: action ? 540 : 440, maxWidth: 'calc(100vw - 32px)' }}
    >
      <Icon sx={{ color, fontSize: 20 }} aria-hidden />
      <Typography variant="body2" sx={{ flex: 1 }}>{toast.message}</Typography>
      {action && <ButtonBase onClick={runAction} sx={actionLink}>{action.label}</ButtonBase>}
      {closeButton}
    </Box>
  );
}

// Pila abajo a la derecha (menos de 900 px: ancho completo, encima de la barra inferior si la vista tiene una, variable
// --toast-bottom). Éxito y Deshacer se cierran a los 5 s; el error se queda hasta cerrarlo o reintentar.
export default function ToastsProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);
  const mobile = useIsMobile();

  const close = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (kind, message, { action } = {}) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, kind, message, action }]);
      if (kind === 'success') setTimeout(() => close(id), SUCCESS_MS);
      return id;
    },
    [close],
  );

  const api = useMemo(
    () => ({
      success: (message, opts) => push('success', message, opts),
      error: (message, opts) => push('error', message, opts),
      close,
    }),
    [push, close],
  );

  return (
    <ToastsContext.Provider value={api}>
      {children}
      <Box
        data-testid="toasts"
        sx={{
          position: 'fixed',
          ...(mobile
            ? { left: 16, right: 16, bottom: 'var(--toast-bottom, 16px)' }
            : { right: 24, bottom: 24 }),
          zIndex: (t) => t.zIndex.snackbar,
          display: 'flex',
          flexDirection: 'column',
          alignItems: mobile ? 'stretch' : 'flex-end',
          gap: 1,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={close} mobile={mobile} />
        ))}
      </Box>
    </ToastsContext.Provider>
  );
}
