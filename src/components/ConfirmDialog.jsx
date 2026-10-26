import { useId } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

// Diálogo propio (sin window.confirm). El foco inicial va en la acción segura (cancelLabel).
// Con onConfirm: dos botones (segura + confirmar). Sin onConfirm: diálogo de bloqueo, solo el botón seguro.
export default function ConfirmDialog({
  open,
  title,
  children,
  cancelLabel = 'Cancelar',
  confirmLabel,
  onConfirm,
  onClose,
  destructive = false,
}) {
  const titleId = useId();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby={titleId}
      fullWidth
      maxWidth={false}
      slotProps={{ paper: { sx: { width: 440, maxWidth: 'calc(100vw - 32px)' } } }}
    >
      <DialogTitle id={titleId} component="h2" variant="h3">{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body1" component="div" color="text.secondary">{children}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant={onConfirm ? 'outlined' : 'contained'} onClick={onClose} autoFocus>
          {cancelLabel}
        </Button>
        {onConfirm && (
          <Button variant="contained" color={destructive ? 'error' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
