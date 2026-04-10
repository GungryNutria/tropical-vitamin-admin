import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Edit as EditIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function fetchLanguages() {
  const { data } = await axios.get(`${API_URL}/languages`);
  return data;
}

async function createLanguage(language) {
  const { data } = await axios.post(`${API_URL}/languages`, language);
  return data;
}

async function updateLanguage({ id, ...language }) {
  const { data } = await axios.patch(`${API_URL}/languages/${id}`, language);
  return data;
}

async function deleteLanguage(id) {
  await axios.delete(`${API_URL}/languages/${id}`);
}

export default function LanguageList() {
  const queryClient = useQueryClient();
  const { data: languages, isLoading, error } = useQuery({ queryKey: ['languages'], queryFn: fetchLanguages });
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState(null);
  const [formData, setFormData] = useState({ code: '', name: '', isActive: true });

  const createMutation = useMutation({
    mutationFn: createLanguage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateLanguage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLanguage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
    },
  });

  const handleOpenDialog = (language = null) => {
    if (language) {
      setEditingLanguage(language);
      setFormData({ code: language.code, name: language.name, isActive: language.isActive });
    } else {
      setEditingLanguage(null);
      setFormData({ code: '', name: '', isActive: true });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingLanguage(null);
    setFormData({ code: '', name: '', isActive: true });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingLanguage) {
      updateMutation.mutate({ id: editingLanguage.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de eliminar este idioma?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) return <Typography sx={{ color: '#A0A0A0' }}>Cargando idiomas...</Typography>;
  if (error) return <Typography color="error">Error al cargar idiomas</Typography>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: '#FAFAFA' }}>
          Idiomas
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{
            backgroundColor: '#F4B942',
            color: '#0A0A0A',
            '&:hover': { backgroundColor: '#FFD166' },
          }}
        >
          Nuevo Idioma
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.1)' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: '#A0A0A0' }}>Código</TableCell>
              <TableCell sx={{ color: '#A0A0A0' }}>Nombre</TableCell>
              <TableCell sx={{ color: '#A0A0A0' }}>Estado</TableCell>
              <TableCell sx={{ color: '#A0A0A0' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {languages?.map((language) => (
              <TableRow key={language.id} sx={{ '&:hover': { backgroundColor: 'rgba(244, 185, 66, 0.05)' } }}>
                <TableCell sx={{ color: '#F4B942', fontFamily: 'monospace' }}>
                  {language.code.toUpperCase()}
                </TableCell>
                <TableCell sx={{ color: '#FAFAFA' }}>
                  {language.name}
                </TableCell>
                <TableCell>
                  <Chip
                    label={language.isActive ? 'Activo' : 'Inactivo'}
                    size="small"
                    sx={{
                      backgroundColor: language.isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: language.isActive ? '#22c55e' : '#ef4444',
                    }}
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenDialog(language)}>
                    <EditIcon sx={{ color: '#888' }} />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(language.id)}>
                    <DeleteIcon sx={{ color: '#888' }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ backgroundColor: '#141414', color: '#FAFAFA' }}>
            {editingLanguage ? 'Editar Idioma' : 'Nuevo Idioma'}
          </DialogTitle>
          <DialogContent sx={{ backgroundColor: '#141414' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Código (ej. es, en, fr)"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                required
                inputProps={{ maxLength: 5 }}
                sx={{
                  '& .MuiOutlinedInput-root': { color: '#FAFAFA' },
                  '& .MuiInputLabel-root': { color: '#A0A0A0' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                }}
              />
              <TextField
                label="Nombre (ej. Español, English)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                sx={{
                  '& .MuiOutlinedInput-root': { color: '#FAFAFA' },
                  '& .MuiInputLabel-root': { color: '#A0A0A0' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#F4B942' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#F4B942' },
                    }}
                  />
                }
                label="Activo"
                sx={{ color: '#FAFAFA' }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ backgroundColor: '#141414', px: 3, pb: 2 }}>
            <Button onClick={handleCloseDialog} sx={{ color: '#A0A0A0' }}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                backgroundColor: '#F4B942',
                color: '#0A0A0A',
                '&:hover': { backgroundColor: '#FFD166' },
              }}
            >
              {editingLanguage ? 'Guardar' : 'Crear'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}