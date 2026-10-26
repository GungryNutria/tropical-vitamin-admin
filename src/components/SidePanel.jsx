import { useId } from 'react';
import { Box, Button, Drawer, IconButton, Typography } from '@mui/material';
import Close from '@mui/icons-material/Close';

// Panel lateral de 480 px (pantalla completa a 390) con un solo Guardar.
// El llamador decide qué hacer en onClose (p. ej. preguntar si hay cambios sin guardar).
export default function SidePanel({ open, title, onClose, onSave, saving = false, saveLabel = 'Guardar', children }) {
  const titleId = useId();
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
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
        <IconButton aria-label="Cerrar panel" onClick={onClose}><Close /></IconButton>
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>{children}</Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, px: 3, py: 2, borderTop: '1px solid', borderColor: 'border.subtle' }}>
        <Button variant="outlined" onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={onSave} disabled={saving}>{saving ? 'Guardando…' : saveLabel}</Button>
      </Box>
    </Drawer>
  );
}
