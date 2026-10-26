import { Box, Chip } from '@mui/material';
import Check from '@mui/icons-material/Check';

// Un chip por idioma activo. status = [{ language, complete }] (ver catalog.js).
// Completo: neutro con palomita. Pendiente: "EN falta" en warning. Siempre texto además del color.
export default function LangChips({ status, highlighted = false }) {
  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
      {status.map(({ language, complete }) => {
        const code = language.code.toUpperCase();
        return complete ? (
          <Chip key={language.id} size="small" icon={<Check />} label={code} sx={{ bgcolor: highlighted ? 'neutral.chipOnSelected' : 'neutral.chip' }} />
        ) : (
          <Chip key={language.id} size="small" label={`${code} falta`} sx={{ bgcolor: 'statusBg.warning', color: 'warning.main' }} />
        );
      })}
    </Box>
  );
}
