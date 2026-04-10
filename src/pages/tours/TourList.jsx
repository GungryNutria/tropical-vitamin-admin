import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
} from '@mui/material';
import { Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL || API_URL;

// Helper to get proper image URL (handles both absolute and relative URLs)
function getImageUrl(img) {
  if (!img) return null;
  // Already relative URL
  if (img.startsWith('/')) return `${UPLOADS_URL}${img}`;
  // Absolute URL - extract filename and proxy through API
  const filename = img.split('/').pop();
  return `${API_URL}/upload/${filename}`;
}

async function fetchTours() {
  const { data } = await axios.get(`${API_URL}/tours/all`);
  return data;
}

export default function TourList() {
  const navigate = useNavigate();
  const { data: tours, isLoading, error, isFetching } = useQuery({ queryKey: ['tours'], queryFn: fetchTours });

  if (isLoading) return <Typography sx={{ color: '#A0A0A0' }}>Cargando tours...</Typography>;
  if (error) return <Typography color="error">Error al cargar tours</Typography>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: '#FAFAFA' }}>
          Tours
          {isFetching && <Typography component="span" sx={{ ml: 2, color: '#A0A0A0', fontSize: '0.8rem' }}>Actualizando...</Typography>}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/tours/new')}
          sx={{
            backgroundColor: '#F4B942',
            color: '#0A0A0A',
            '&:hover': { backgroundColor: '#FFD166' },
          }}
        >
          Nuevo Tour
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.1)' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: '#A0A0A0' }}>Imagen</TableCell>
              <TableCell sx={{ color: '#A0A0A0' }}>Nombre Admin</TableCell>
              <TableCell sx={{ color: '#A0A0A0' }}>Categoría</TableCell>
              <TableCell sx={{ color: '#A0A0A0' }}>Ubicación</TableCell>
              <TableCell sx={{ color: '#A0A0A0' }}>Duración</TableCell>
              <TableCell sx={{ color: '#A0A0A0' }}>Precio</TableCell>
              <TableCell sx={{ color: '#A0A0A0' }}>Estado</TableCell>
              <TableCell sx={{ color: '#A0A0A0' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tours?.map((tour) => {
              return (
                <TableRow key={tour.id} sx={{ '&:hover': { backgroundColor: 'rgba(244, 185, 66, 0.05)' } }}>
                  <TableCell>
                    {tour.img ? (
                      <Box
                        component="img"
                        src={getImageUrl(tour.img)}
                        alt={tour.adminTitle}
                        sx={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 1 }}
                      />
                    ) : (
                      <Box sx={{ width: 60, height: 40, backgroundColor: '#1a1a1a', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#666' }}>Sin img</Typography>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell sx={{ color: '#F4B942', fontFamily: 'monospace' }}>
                    {tour.adminTitle}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={tour.category?.adminName || 'Sin categoría'}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(244, 185, 66, 0.2)',
                        color: '#F4B942',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: '#A0A0A0' }}>
                    {tour.location}
                  </TableCell>
                  <TableCell sx={{ color: '#A0A0A0' }}>
                    {tour.duration} min
                  </TableCell>
                  <TableCell sx={{ color: '#F4B942' }}>
                    ${Number(tour.price).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={tour.isActive ? 'Activo' : 'Inactivo'}
                      size="small"
                      sx={{
                        backgroundColor: tour.isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: tour.isActive ? '#22c55e' : '#ef4444',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => navigate(`/tours/${tour.id}`)}>
                      <EditIcon sx={{ color: '#888' }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}