import { useId, useRef } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

// Diálogo propio (sin window.confirm). El foco inicial va en la acción segura (cancelLabel).
// Con onConfirm: dos botones (segura + confirmar). Sin onConfirm: diálogo de bloqueo, solo el botón seguro.
// safePrimary: la acción segura va a la derecha y en primario (E5.13 "Seguir editando"); la destructiva a la izquierda.
export default function ConfirmDialog({
  open,
  title,
  children,
  cancelLabel = 'Cancelar',
  confirmLabel,
  onConfirm,
  onClose,
  destructive = false,
  safePrimary = false,
}) {
  const titleId = useId();
  const safeRef = useRef(null);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby={titleId}
      fullWidth
      maxWidth={false}
      slotProps={{
        paper: { sx: { width: 440, maxWidth: 'calc(100vw - 32px)' } },
        // El atrapa-foco de MUI deja el foco en el contenedor mientras dura la transición:
        // al terminar, lo llevamos a la acción segura.
        transition: { onEntered: () => safeRef.current?.focus() },
      }}
    >
      <DialogTitle id={titleId} component="h2" variant="h3">{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body1" component="div" color="text.secondary">{children}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        {safePrimary && onConfirm && (
          <Button variant="contained" color={destructive ? 'error' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        )}
        <Button variant={onConfirm && !safePrimary ? 'outlined' : 'contained'} onClick={onClose} ref={safeRef} autoFocus>
          {cancelLabel}
        </Button>
        {!safePrimary && onConfirm && (
          <Button variant="contained" color={destructive ? 'error' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
