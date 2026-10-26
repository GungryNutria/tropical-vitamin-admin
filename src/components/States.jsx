import { Box, Button, Skeleton, Typography } from '@mui/material';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import ErrorOutline from '@mui/icons-material/ErrorOutline';

// Esqueleto sin brillo animado (movimiento reducido): bloques raised con la forma del contenido.
export function SkeletonRows({ count = 6, height = 52 }) {
  return (
    <Box aria-busy="true" aria-label="Cargando">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} variant="rounded" height={height} sx={{ mb: 0.5 }} />
      ))}
    </Box>
  );
}

function CenteredState({ icon, title, description, children, role }) {
  return (
    <Box
      role={role}
      sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 1, py: 8, px: 3, border: '1px solid', borderColor: 'border.subtle', borderRadius: '8px' }}
    >
      {icon}
      <Typography variant="h2" component="h2">{title}</Typography>
      {description && <Typography variant="body2" color="text.secondary">{description}</Typography>}
      {children && <Box sx={{ mt: 1.5 }}>{children}</Box>}
    </Box>
  );
}

// action = { label, onClick } (botón primario; uno solo por vista).
export function EmptyState({ title, description, action, icon }) {
  return (
    <CenteredState
      icon={icon || <ImageOutlined sx={{ color: 'tertiary', fontSize: 32 }} aria-hidden />}
      title={title}
      description={description}
    >
      {action && <Button variant="contained" onClick={action.onClick}>{action.label}</Button>}
    </CenteredState>
  );
}

export function ErrorState({ title = 'No pudimos cargar los datos.', description = 'Revisa tu conexión e intenta de nuevo.', onRetry }) {
  return (
    <CenteredState
      role="alert"
      icon={<ErrorOutline sx={{ color: 'error.main', fontSize: 32 }} aria-hidden />}
      title={title}
      description={description}
    >
      {onRetry && <Button variant="outlined" onClick={onRetry}>Reintentar</Button>}
    </CenteredState>
  );
}

// Para "Esta página no existe." y "Este tour no existe o se eliminó."; action = { label, onClick }.
export function NotFound({ title, description, action }) {
  return (
    <CenteredState title={title} description={description}>
      {action && <Button variant="contained" onClick={action.onClick}>{action.label}</Button>}
    </CenteredState>
  );
}
