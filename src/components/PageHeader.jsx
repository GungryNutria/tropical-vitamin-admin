import { createPortal } from 'react-dom';
import { Link as RouterLink, useOutletContext } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { useIsMobile } from '../lib/useIsMobile';

// Encabezado de vista: título, subtítulo y el primario. A 390 el primario ("Nuevo") va en la barra superior
// (portal) y el título solo se anuncia (como en la lista de tours). action = { label, mobileLabel, to | onClick }.
export default function PageHeader({ title, subtitle, action }) {
  const mobile = useIsMobile();
  const { topbarSlot } = useOutletContext();
  const props = action && (action.to ? { component: RouterLink, to: action.to } : { onClick: action.onClick });
  const button = action && (mobile
    ? topbarSlot && createPortal(<Button variant="contained" {...props}>{action.mobileLabel}</Button>, topbarSlot)
    : <Button variant="contained" {...props}>{action.label}</Button>);
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: mobile ? 2 : 3 }}>
      <Box>
        <Typography variant="h1" component="h1" sx={mobile ? { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' } : undefined}>
          {title}
        </Typography>
        {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography>}
      </Box>
      {button}
    </Box>
  );
}
