import { Box, Button, Typography } from '@mui/material';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import WarningAmber from '@mui/icons-material/WarningAmber';

const kinds = {
  error: { icon: ErrorOutline, color: 'error.main', bg: 'statusBg.danger', role: 'alert' },
  warning: { icon: WarningAmber, color: 'warning.main', bg: 'statusBg.warning', role: 'status' },
};

// Aviso dentro de la vista. children = detalle o lista de enlaces; action = { label, onClick }.
// Sin title, children es el mensaje único (E1.3, E1.5). El texto ocupa todo el ancho disponible.
export default function Banner({ severity = 'error', title, children, action, sx }) {
  const { icon: Icon, color, bg, role } = kinds[severity];
  return (
    <Box
      role={role}
      sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 2, bgcolor: bg, border: '1px solid', borderColor: color, borderRadius: '6px', ...sx }}
    >
      <Icon sx={{ color, fontSize: 20, mt: '2px' }} aria-hidden />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {title && <Typography variant="h2" component="p" sx={{ fontSize: 15 }}>{title}</Typography>}
        {children && <Typography variant={title ? 'body2' : 'body1'} component="div">{children}</Typography>}
      </Box>
      {action && (
        <Button variant="outlined" onClick={action.onClick} sx={{ flexShrink: 0 }}>
          {action.label}
        </Button>
      )}
    </Box>
  );
}
