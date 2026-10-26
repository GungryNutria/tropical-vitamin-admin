import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, IconButton, InputAdornment, Typography } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../contexts/AuthContext';
import Banner from '../components/Banner';
import FormField from '../components/FormField';
import logo from '../assets/logo.png';

// Avisos del login (E1.3, E1.4). El motivo de sesión vencida (E1.5) llega en location.state.reason.
const MESSAGES = {
  credentials: { text: 'El correo o la contraseña no coinciden.' },
  network: { title: 'No pudimos conectar con el servidor.', text: 'Revisa tu conexión e intenta de nuevo.' },
  server: { title: 'El servidor tuvo un problema.', text: 'Intenta de nuevo en un momento.' },
};

export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const passwordRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(null); // 'credentials' | 'network' | 'server'

  const { from, reason } = location.state || {};
  // Tras entrar: de vuelta a la ruta que se perdió por la sesión vencida, o al inicio (REQ-2).
  const destination = reason === 'expired' && from?.pathname ? `${from.pathname}${from.search || ''}${from.hash || ''}` : '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setFailure(null);
    setBusy(true);
    const result = await login(email, password);
    if (result.success) {
      navigate(destination, { replace: true });
      return;
    }
    setBusy(false);
    setFailure(result.kind);
    if (result.kind === 'credentials') setPassword('');
  };

  // Con credenciales malas el foco vuelve a la contraseña (vacía), ya habilitada.
  useEffect(() => {
    if (failure === 'credentials') passwordRef.current?.focus();
  }, [failure]);

  // Con sesión (p. ej. al abrir /login ya dentro) no hay nada que hacer aquí.
  if (user && !busy) return <Navigate to={destination} replace />;

  const message = failure && MESSAGES[failure];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: { xs: 'flex-start', sm: 'center' },
        p: 2,
        pt: { xs: 6, sm: 2 },
      }}
    >
      <Box
        component="main"
        sx={{
          width: '100%',
          maxWidth: 400,
          p: { xs: 0, sm: '31px' }, // 32 con el borde de 1 px
          bgcolor: { xs: 'transparent', sm: 'background.paper' },
          border: { xs: 0, sm: '1px solid' },
          borderColor: 'border.subtle',
          borderRadius: '8px',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <img src={logo} alt="Tropical Vitamin" width={130} style={{ display: 'block', margin: '0 auto 16px' }} />
          <Typography variant="h1" component="h1" sx={{ fontWeight: 500 }}>Panel de administración</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Entra con tu correo y contraseña.</Typography>
        </Box>

        <Box component="form" noValidate onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {message ? (
            <Banner severity="error" title={message.title}>{message.text}</Banner>
          ) : (
            reason === 'expired' && <Banner severity="warning">Tu sesión terminó. Entra de nuevo para seguir.</Banner>
          )}

          <FormField
            id="login-email"
            label="Correo electrónico"
            required
            type="email"
            autoComplete="username"
            value={email}
            disabled={busy}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FormField
            id="login-password"
            label="Contraseña"
            required
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            disabled={busy}
            invalid={failure === 'credentials'}
            inputRef={passwordRef}
            onChange={(e) => setPassword(e.target.value)}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      disabled={busy}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((v) => !v)}
                      sx={{ color: 'text.secondary' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <Button type="submit" variant="contained" fullWidth disabled={busy} sx={{ minHeight: 44 }}>
            {busy ? (
              <>
                <CircularProgress size={18} thickness={5} color="inherit" sx={{ mr: 1 }} aria-hidden />
                Entrando…
              </>
            ) : (
              'Entrar'
            )}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
