import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const result = await login(email, password);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0A0A0A',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          backgroundColor: '#141414',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Typography variant="h4" sx={{ mb: 3, textAlign: 'center', color: '#F4B942' }}>
          Tropical Vitamin
        </Typography>
        <Typography variant="h6" sx={{ mb: 3, textAlign: 'center', color: '#A0A0A0' }}>
          Panel de Administración
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
            InputLabelProps={{ style: { color: '#A0A0A0' } }}
            InputProps={{ style: { color: '#FAFAFA' } }}
          />
          <TextField
            fullWidth
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 2 }}
            InputLabelProps={{ style: { color: '#A0A0A0' } }}
            InputProps={{ style: { color: '#FAFAFA' } }}
          />
          
          {error && (
            <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>
              {error}
            </Typography>
          )}
          
          <Button
            fullWidth
            type="submit"
            variant="contained"
            sx={{
              mt: 2,
              backgroundColor: '#F4B942',
              color: '#0A0A0A',
              '&:hover': { backgroundColor: '#FFD166' },
            }}
          >
            Iniciar Sesión
          </Button>
        </form>
      </Paper>
    </Box>
  );
}