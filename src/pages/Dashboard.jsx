import { Box, Typography, Paper } from '@mui/material';

export default function Dashboard() {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4, color: '#FAFAFA' }}>
        Dashboard
      </Typography>
      
      <Paper sx={{ p: 3, backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="h6" sx={{ color: '#A0A0A0' }}>
          Bienvenido al Panel de Administración
        </Typography>
        <Typography sx={{ mt: 2, color: '#666' }}>
          Selecciona una opción del menú para comenzar.
        </Typography>
      </Paper>
    </Box>
  );
}