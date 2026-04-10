import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  MenuItem,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
} from '@mui/material';
import { Save as SaveIcon, ArrowBack as ArrowBackIcon, Upload as UploadIcon } from '@mui/icons-material';
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

async function fetchTour(id) {
  const { data } = await axios.get(`${API_URL}/tours/${id}`);
  return data;
}

async function fetchCategories() {
  const { data } = await axios.get(`${API_URL}/categories`);
  return data;
}

async function fetchLanguages() {
  const { data } = await axios.get(`${API_URL}/languages`);
  return data;
}

async function createTour(data) {
  const { data: result } = await axios.post(`${API_URL}/tours`, data);
  return result;
}

async function updateTour({ id, data }) {
  const { data: result } = await axios.patch(`${API_URL}/tours/${id}`, data);
  return result;
}

async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await axios.post(`${API_URL}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export default function TourEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === 'new';
  const [activeLang, setActiveLang] = useState('es');

  const [form, setForm] = useState({
    adminTitle: '',
    price: '',
    location: '',
    duration: '',
    img: '',
    isActive: true,
    categoryId: '',
    translations: [],
  });

  const { data: tour, isLoading } = useQuery({
    queryKey: ['tour', id],
    queryFn: () => fetchTour(id),
    enabled: !isNew
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories
  });

  const { data: languages } = useQuery({
    queryKey: ['languages'],
    queryFn: fetchLanguages
  });

  useEffect(() => {
    if (tour) {
      setForm({
        adminTitle: tour.adminTitle || '',
        price: tour.price?.toString() || '',
        location: tour.location || '',
        duration: tour.duration?.toString() || '60',
        img: tour.img || '',
        isActive: tour.isActive ?? true,
        categoryId: tour.categoryId?.toString() || '',
        translations: tour.translations || [],
      });
    }
  }, [tour]);

  useEffect(() => {
    // Initialize translations for all languages if new tour
    if (isNew && languages?.length > 0 && form.translations.length === 0) {
      setForm(prev => ({
        ...prev,
        translations: languages.map(lang => ({
          languageId: lang.id,
          title: '',
          description: '',
        })),
      }));
    }
  }, [isNew, languages, form.translations.length]);

  const mutation = useMutation({
    mutationFn: isNew ? createTour : (data) => updateTour({ id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      navigate('/tours');
    },
    onError: (error) => {
      console.error('Error saving tour:', error);
      alert('Error al guardar: ' + (error.response?.data?.message || error.message));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      adminTitle: form.adminTitle,
      price: parseFloat(form.price) || 0,
      location: form.location,
      duration: parseInt(form.duration) || 60,
      img: form.img || null,
      isActive: form.isActive,
      categoryId: parseInt(form.categoryId) || null,
      translations: form.translations.map(t => ({
        languageId: t.languageId,
        title: t.title,
        description: t.description,
      })),
    };
    mutation.mutate(payload);
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleTranslationChange = (languageId, field, value) => {
    setForm(prev => ({
      ...prev,
      translations: prev.translations.map(t =>
        t.languageId === languageId ? { ...t, [field]: value } : t
      ),
    }));
  };

  if (!isNew && isLoading) return <Typography sx={{ color: '#A0A0A0' }}>Cargando...</Typography>;

  return (
    <Box>
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/tours')}
              sx={{ color: '#A0A0A0' }}
            >
              Volver
            </Button>
            <Typography variant="h4" sx={{ color: '#FAFAFA' }}>
              {isNew ? 'Nuevo Tour' : 'Editar Tour'}
            </Typography>
          </Box>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={mutation.isPending}
            sx={{
              backgroundColor: '#F4B942',
              color: '#0A0A0A',
              '&:hover': { backgroundColor: '#FFD166' },
            }}
          >
            {mutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </Box>
        {/* Imagen */}
        <Paper sx={{ p: 3, mb: 3, backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Typography variant="h6" sx={{ mb: 3, color: '#F4B942' }}>
            Imagen
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              sx={{ borderColor: '#F4B942', color: '#F4B942' }}
            >
              Subir Imagen
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      const result = await uploadImage(file);
                      handleChange('img', result.url);
                    } catch (err) {
                      console.error('Error uploading image:', err);
                    }
                  }
                }}
              />
            </Button>
            <Box sx={{ width: '100%', maxWidth: 400 }}>
              {form.img ? (
                <img
                  src={getImageUrl(form.img)}
                  alt="Preview"
                  style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}
                />
              ) : (
                <Box sx={{ width: '100%', height: 200, backgroundColor: '#1a1a1a', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ color: '#666' }}>Sin imagen</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Paper>

        {/* Datos Generales */}
        <Paper sx={{ p: 3, mb: 3, backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Typography variant="h6" sx={{ mb: 3, color: '#F4B942' }}>
            Datos Generales
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre Admin (identificador)"
                value={form.adminTitle}
                onChange={(e) => handleChange('adminTitle', e.target.value)}
                required
                placeholder="ej: Snorkel & Buceo"
                sx={{
                  '& .MuiOutlinedInput-root': { color: '#FAFAFA' },
                  '& .MuiInputLabel-root': { color: '#A0A0A0' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Categoría"
                value={form.categoryId}
                onChange={(e) => handleChange('categoryId', e.target.value)}
                required
                sx={{
                  '& .MuiOutlinedInput-root': { color: '#FAFAFA' },
                  '& .MuiInputLabel-root': { color: '#A0A0A0' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                }}
              >
                {categories?.map(cat => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.adminName}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ubicación"
                value={form.location}
                onChange={(e) => handleChange('location', e.target.value)}
                required
                placeholder="ej: Cancún, México"
                sx={{
                  '& .MuiOutlinedInput-root': { color: '#FAFAFA' },
                  '& .MuiInputLabel-root': { color: '#A0A0A0' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Duración (minutos)"
                type="number"
                value={form.duration}
                onChange={(e) => handleChange('duration', e.target.value)}
                required
                sx={{
                  '& .MuiOutlinedInput-root': { color: '#FAFAFA' },
                  '& .MuiInputLabel-root': { color: '#A0A0A0' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Precio (MXN)"
                type="number"
                value={form.price}
                onChange={(e) => handleChange('price', e.target.value)}
                required
                sx={{
                  '& .MuiOutlinedInput-root': { color: '#FAFAFA' },
                  '& .MuiInputLabel-root': { color: '#A0A0A0' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isActive}
                    onChange={(e) => handleChange('isActive', e.target.checked)}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#F4B942' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#F4B942' } }}
                  />
                }
                label={<Typography sx={{ color: '#A0A0A0' }}>Tour Activo</Typography>}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Traducciones */}
        <Paper sx={{ mb: 3, backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Tabs
            value={activeLang}
            onChange={(_, v) => setActiveLang(v)}
            sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
          >
            {languages?.map(lang => (
              <Tab
                key={lang.id}
                label={lang.name}
                value={lang.code}
                sx={{ color: activeLang === lang.code ? '#F4B942' : '#A0A0A0' }}
              />
            ))}
          </Tabs>
          <Box sx={{ p: 3 }}>
            {languages?.map(language => {
              const translation = form.translations.find(t => t.languageId === language.id);
              return (
                <Box key={language.id} sx={{ display: activeLang === language.code ? 'block' : 'none' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Título"
                        value={translation?.title || ''}
                        onChange={(e) => handleTranslationChange(language.id, 'title', e.target.value)}
                        required
                        sx={{
                          '& .MuiOutlinedInput-root': { color: '#FAFAFA' },
                          '& .MuiInputLabel-root': { color: '#A0A0A0' },
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Descripción"
                        value={translation?.description || ''}
                        onChange={(e) => handleTranslationChange(language.id, 'description', e.target.value)}
                        required
                        sx={{
                          '& .MuiOutlinedInput-root': { color: '#FAFAFA' },
                          '& .MuiInputLabel-root': { color: '#A0A0A0' },
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                        }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              );
            })}
          </Box>
        </Paper>
      </form>
    </Box>
  );
}