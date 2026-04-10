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
  Collapse,
  TablePagination,
} from '@mui/material';
import { Edit as EditIcon, Add as AddIcon, Delete as DeleteIcon, KeyboardArrowDown as KeyboardArrowDownIcon, KeyboardArrowUp as KeyboardArrowUpIcon } from '@mui/icons-material';
import { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function fetchCategories() {
  const { data } = await axios.get(`${API_URL}/categories`);
  return data;
}

async function fetchLanguages() {
  const { data } = await axios.get(`${API_URL}/languages`);
  return data;
}

async function createCategory(category) {
  const { data } = await axios.post(`${API_URL}/categories`, category);
  return data;
}

async function updateCategory({ id, ...category }) {
  const { data } = await axios.patch(`${API_URL}/categories/${id}`, category);
  return data;
}

async function deleteCategory(id) {
  await axios.delete(`${API_URL}/categories/${id}`);
}

async function updateCategoryTranslation({ categoryId, languageId, data }) {
  const { result } = await axios.patch(`${API_URL}/categories/${categoryId}/translations/${languageId}`, data);
  return result;
}

async function createCategoryTranslation({ categoryId, data }) {
  const { data: result } = await axios.post(`${API_URL}/categories/${categoryId}/translations`, data);
  return result;
}

export default function CategoryList() {
  const queryClient = useQueryClient();
  const { data: categories, isLoading, error, isFetching } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const { data: languages } = useQuery({ queryKey: ['languages'], queryFn: fetchLanguages });
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ adminName: '', description: '' });
  const [expandedRows, setExpandedRows] = useState({});
  const [translationEdits, setTranslationEdits] = useState({});

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      handleCloseDialog();
    },
    onError: (error) => {
      console.error('Error creating category:', error);
      alert('Error al crear categoría: ' + (error.response?.data?.message || error.message));
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      handleCloseDialog();
    },
    onError: (error) => {
      console.error('Error updating category:', error);
      alert('Error al actualizar categoría: ' + (error.response?.data?.message || error.message));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error) => {
      console.error('Error deleting category:', error);
      alert('Error al eliminar categoría: ' + (error.response?.data?.message || error.message));
    },
  });

  const handleOpenDialog = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ adminName: category.adminName, description: category.description });
    } else {
      setEditingCategory(null);
      setFormData({ adminName: '', description: '' });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCategory(null);
    setFormData({ adminName: '', description: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta categoría?')) {
      deleteMutation.mutate(id);
    }
  };

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Get translations for a category
  const getTranslations = (category) => {
    return category.translations || [];
  };

  // Get translation for a specific language
  const getTranslation = (category, languageId) => {
    return category.translations?.find(t => t.languageId === languageId);
  };

  // Handle translation field change
  const handleTranslationChange = (categoryId, languageId, field, value) => {
    setTranslationEdits(prev => ({
      ...prev,
      [`${categoryId}-${languageId}`]: {
        ...prev[`${categoryId}-${languageId}`],
        [field]: value,
      }
    }));
  };

  // Save translation
  const handleSaveTranslation = async (categoryId, languageId) => {
    const editKey = `${categoryId}-${languageId}`;
    const editData = translationEdits[editKey];
    if (!editData) return;

    try {
      // Check if translation exists
      const existingTranslation = translationEdits[editKey]?.id;
      
      if (existingTranslation) {
        await axios.patch(`${API_URL}/categories/${categoryId}/translations/${languageId}`, editData);
      } else {
        await axios.post(`${API_URL}/categories/${categoryId}/translations`, {
          languageId,
          ...editData
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setTranslationEdits(prev => {
        const newEdits = { ...prev };
        delete newEdits[editKey];
        return newEdits;
      });
    } catch (error) {
      console.error('Error saving translation:', error);
      alert('Error al guardar traducción: ' + (error.response?.data?.message || error.message));
    }
  };

  if (isLoading) return <Typography sx={{ color: '#A0A0A0' }}>Cargando categorías...</Typography>;
  if (error) return <Typography color="error">Error al cargar categorías</Typography>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: '#FAFAFA' }}>
          Categorías
          {isFetching && <Typography component="span" sx={{ ml: 2, color: '#A0A0A0', fontSize: '0.8rem' }}>Actualizando...</Typography>}
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
          Nueva Categoría
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.1)' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 40, color: '#A0A0A0' }} />
              <TableCell sx={{ color: '#A0A0A0' }}>Nombre Admin</TableCell>
              <TableCell sx={{ color: '#A0A0A0' }}>Descripción</TableCell>
              <TableCell sx={{ color: '#A0A0A0' }}>Tours</TableCell>
              <TableCell sx={{ color: '#A0A0A0' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories?.map((category) => (
              <>
                <TableRow 
                  key={category.id} 
                  sx={{ '&:hover': { backgroundColor: 'rgba(244, 185, 66, 0.05)' } }}
                >
                  <TableCell>
                    <IconButton size="small" onClick={() => toggleRow(category.id)}>
                      {expandedRows[category.id] ? (
                        <KeyboardArrowUpIcon sx={{ color: '#888' }} />
                      ) : (
                        <KeyboardArrowDownIcon sx={{ color: '#888' }} />
                      )}
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ color: '#F4B942', fontFamily: 'monospace' }}>
                    {category.adminName}
                  </TableCell>
                  <TableCell sx={{ color: '#FAFAFA' }}>
                    {category.description}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={category._count?.tours || 0}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(244, 185, 66, 0.2)',
                        color: '#F4B942',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpenDialog(category)}>
                      <EditIcon sx={{ color: '#888' }} />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(category.id)}>
                      <DeleteIcon sx={{ color: '#888' }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 0, backgroundColor: '#1a1a1a' }}>
                    <Collapse in={expandedRows[category.id]} timeout="auto">
                      <Box sx={{ py: 2, px: 4 }}>
                        <Typography variant="subtitle2" sx={{ color: '#A0A0A0', mb: 2 }}>
                          Traducciones
                        </Typography>
                        {languages?.map((language) => {
                          const translation = category.translations?.find(t => t.languageId === language.id);
                          const editKey = `${category.id}-${language.id}`;
                          const isEditing = translationEdits[editKey] !== undefined;
                          const name = isEditing ? translationEdits[editKey].name : translation?.name || '';
                          const desc = isEditing ? translationEdits[editKey].description : translation?.description || '';
                          const hasChanges = isEditing && (translationEdits[editKey].name !== (translation?.name || '') || translationEdits[editKey].description !== (translation?.description || ''));
                          
                          // Initialize edit state when row expands
                          const initEdit = () => {
                            if (!translationEdits[editKey]) {
                              setTranslationEdits(prev => ({
                                ...prev,
                                [editKey]: {
                                  name: translation?.name || '',
                                  description: translation?.description || '',
                                }
                              }));
                            }
                          };
                          
                          return (
                            <Box key={language.id} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                              <Chip
                                label={language.code.toUpperCase()}
                                size="small"
                                sx={{ minWidth: 50, backgroundColor: 'rgba(255,255,255,0.1)', color: '#FAFAFA' }}
                              />
                              <TextField
                                size="small"
                                placeholder="Nombre"
                                value={name}
                                onFocus={initEdit}
                                onChange={(e) => handleTranslationChange(category.id, language.id, 'name', e.target.value)}
                                sx={{
                                  flex: 1,
                                  '& .MuiOutlinedInput-root': { color: '#FAFAFA' },
                                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                                }}
                              />
                              <TextField
                                size="small"
                                placeholder="Descripción"
                                value={desc}
                                onFocus={initEdit}
                                onChange={(e) => handleTranslationChange(category.id, language.id, 'description', e.target.value)}
                                sx={{
                                  flex: 2,
                                  '& .MuiOutlinedInput-root': { color: '#FAFAFA' },
                                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                                }}
                              />
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleSaveTranslation(category.id, language.id)}
                                disabled={!hasChanges}
                                sx={{
                                  borderColor: hasChanges ? '#F4B942' : 'rgba(255,255,255,0.2)',
                                  color: hasChanges ? '#F4B942' : '#888',
                                  '&:hover': { borderColor: '#FFD166', backgroundColor: 'rgba(244, 185, 66, 0.1)' }
                                }}
                              >
                                Guardar
                              </Button>
                            </Box>
                          );
                        })}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ backgroundColor: '#141414', color: '#FAFAFA' }}>
            {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
          </DialogTitle>
          <DialogContent sx={{ backgroundColor: '#141414' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Nombre Admin (identificador)"
                value={formData.adminName}
                onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                required
                placeholder="ej: snorkel, fishing, adventure"
                sx={{
                  '& .MuiOutlinedInput-root': { color: '#FAFAFA' },
                  '& .MuiInputLabel-root': { color: '#A0A0A0' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                }}
              />
              <TextField
                label="Descripción"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                multiline
                rows={2}
                sx={{
                  '& .MuiOutlinedInput-root': { color: '#FAFAFA' },
                  '& .MuiInputLabel-root': { color: '#A0A0A0' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                }}
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
              {editingCategory ? 'Guardar' : 'Crear'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}