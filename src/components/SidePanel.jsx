import { useId, useState } from 'react';
import { Box, Button, Drawer, IconButton, Typography } from '@mui/material';
import Close from '@mui/icons-material/Close';
import ConfirmDialog from './ConfirmDialog';

// Panel lateral de 480 px (pantalla completa a 390) con un solo Guardar.
// Encabezado y pie fijos; solo el cuerpo hace scroll. Con `dirty`, cerrar (X, Cancelar, Esc, fondo)
// pregunta "¿Salir sin guardar?" (E6.11); `name` es lo que se nombra en el aviso.
export default function SidePanel({ open, title, onClose, onSave, saving = false, saveLabel = 'Guardar', dirty = false, name = '', children }) {
  const titleId = useId();
  const [asking, setAsking] = useState(false);
  const requestClose = () => (dirty ? setAsking(true) : onClose());
  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={requestClose}
        slotProps={{
          paper: {
            role: 'dialog',
            'aria-modal': true,
            'aria-labelledby': titleId,
            sx: { width: { xs: '100%', sm: 480 }, maxWidth: '100%' },
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: '1px solid', borderColor: 'border.subtle' }}>
          <Typography id={titleId} variant="h3" component="h2">{title}</Typography>
          <IconButton aria-label="Cerrar panel" onClick={requestClose}><Close /></IconButton>
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto', p: 3, '& input, & textarea': { scrollMarginBottom: '96px' } }}>{children}</Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 2, borderTop: '1px solid', borderColor: 'border.subtle' }}>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }} role="status">
            {dirty && (
              <>
                <Box aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main', flexShrink: 0 }} />
                <Typography variant="body2">Cambios sin guardar</Typography>
              </>
            )}
          </Box>
          <Button variant="outlined" onClick={requestClose}>Cancelar</Button>
          <Button variant="contained" onClick={onSave} disabled={saving}>{saving ? 'Guardando…' : saveLabel}</Button>
        </Box>
      </Drawer>
      <ConfirmDialog
        open={asking}
        title="¿Salir sin guardar?"
        cancelLabel="Seguir editando"
        confirmLabel="Salir y descartar"
        destructive
        safePrimary
        onConfirm={() => {
          setAsking(false);
          onClose();
        }}
        onClose={() => setAsking(false)}
      >
        <span style={{ display: 'block' }}>Tienes cambios sin guardar{name ? ` en «${name}»` : ''}.</span>
        <span style={{ display: 'block' }}>Si cierras ahora, se pierden.</span>
      </ConfirmDialog>
    </>
  );
}
