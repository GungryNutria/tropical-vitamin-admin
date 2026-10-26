import { useCallback, useMemo, useRef, useState } from 'react';
import { Box, ButtonBase, IconButton, Typography } from '@mui/material';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import Close from '@mui/icons-material/Close';
import { ToastsContext } from '../lib/useToasts';

const SUCCESS_MS = 5000;

const kinds = {
  success: { icon: CheckCircleOutline, color: 'success.main', bg: 'statusBg.success', role: 'status' },
  error: { icon: ErrorOutline, color: 'error.main', bg: 'statusBg.danger', role: 'alert' },
};

function Toast({ toast, onClose }) {
  const { icon: Icon, color, bg, role } = kinds[toast.kind];
  const { action } = toast;
  return (
    <Box
      role={role}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        minHeight: 56,
        px: 2,
        py: 1,
        width: action ? 540 : 440,
        maxWidth: 'calc(100vw - 32px)',
        bgcolor: bg,
        border: '1px solid',
        borderColor: color,
        borderRadius: '6px',
        pointerEvents: 'auto',
      }}
    >
      <Icon sx={{ color, fontSize: 20 }} aria-hidden />
      <Typography variant="body2" sx={{ flex: 1 }}>{toast.message}</Typography>
      {action && (
        <ButtonBase
          onClick={() => {
            action.onClick();
            onClose(toast.id);
          }}
          sx={{ color: 'primary.main', textDecoration: 'underline', fontSize: 14, fontWeight: 600, borderRadius: '4px', px: 0.5 }}
        >
          {action.label}
        </ButtonBase>
      )}
      <IconButton size="small" aria-label="Cerrar aviso" onClick={() => onClose(toast.id)} sx={{ width: 32, height: 32 }}>
        <Close fontSize="small" />
      </IconButton>
    </Box>
  );
}

// Pila abajo a la derecha. Éxito y Deshacer se cierran a los 5 s; el error se queda hasta cerrarlo o reintentar.
export default function ToastsProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

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
          right: 24,
          bottom: 24,
          zIndex: (t) => t.zIndex.snackbar,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 1,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={close} />
        ))}
      </Box>
    </ToastsContext.Provider>
  );
}
