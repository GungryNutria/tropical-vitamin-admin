import { Box, InputAdornment, TextField, Typography } from '@mui/material';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import { numeric } from '../theme';

// Campo con la etiqueta encima (13/500, " *" si es obligatorio), ayuda o error debajo y,
// opcional, un contador arriba a la derecha (handoff R1 sección 4, "Campo").
// `invalid` marca el campo sin mensaje propio (el aviso va en otro lado, p. ej. el login). Los errores llevan icono y texto: nunca solo color. `prefix`/`suffix` son los "$", "min" y "MXN".
export default function FormField({ id, label, required, help, error, invalid, counter, prefix, suffix, slotProps, sx, children, ...props }) {
  const adornment = (text, position) => (
    <InputAdornment
      position={position}
      sx={{
        m: 0,
        alignSelf: 'stretch',
        height: 'auto',
        maxHeight: 'none',
        px: 1.5,
        bgcolor: 'bg.raised',
        color: 'text.secondary',
        [position === 'start' ? 'borderRight' : 'borderLeft']: '1px solid',
        borderColor: 'border.control',
        '& p': { fontSize: 13, ...numeric },
      }}
    >
      <Typography component="span">{text}</Typography>
    </InputAdornment>
  );

  const helperId = `${id}-help`;
  return (
    <Box sx={sx}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.75 }}>
        <Typography variant="subtitle2" component="label" id={`${id}-label`} htmlFor={id} sx={{ color: 'text.primary' }}>
          {label}
          {required && <span aria-hidden> *</span>}
        </Typography>
        {counter != null && (
          <Typography variant="caption" color="text.secondary" sx={numeric}>
            {counter}
          </Typography>
        )}
      </Box>
      <TextField
        id={id}
        fullWidth
        error={!!error || !!invalid}
        {...props}
        slotProps={{
          ...slotProps,
          // Un select es un div: se nombra con la etiqueta (aria-labelledby), no con htmlFor.
          ...(props.select && { select: { labelId: `${id}-label`, ...slotProps?.select } }),
          input: {
            ...slotProps?.input,
            ...(prefix && { startAdornment: adornment(prefix, 'start') }),
            ...(suffix && { endAdornment: adornment(suffix, 'end') }),
            sx: { ...(prefix || suffix ? { overflow: 'hidden', ...(prefix && { pl: 0 }), ...(suffix && { pr: 0 }) } : {}) },
          },
          htmlInput: {
            ...slotProps?.htmlInput,
            'aria-required': required || undefined,
            ...(invalid && { 'aria-invalid': true }),
            'aria-describedby': error || help ? helperId : undefined,
          },
        }}
      >
        {children}
      </TextField>
      {(error || help) && (
        <Box
          id={helperId}
          sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mt: 0.75, color: error ? 'error.main' : 'tertiary' }}
        >
          {error && <ErrorOutline sx={{ fontSize: 16, mt: '1px', flexShrink: 0 }} aria-hidden />}
          <Typography variant="caption" sx={{ color: 'inherit' }}>
            {error || help}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
