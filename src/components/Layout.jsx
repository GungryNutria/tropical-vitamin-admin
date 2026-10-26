import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.png';

const SIDEBAR_WIDTH = 232;

const menuItems = [
  { text: 'Inicio', path: '/' },
  { text: 'Tours', path: '/tours' },
  { text: 'Categorías', path: '/categories' },
  { text: 'Idiomas', path: '/languages' },
];

// Menú plano de 232 px: cuatro destinos sin iconos, correo y "Cerrar sesión" al pie (handoff R1 sección 3).
// La barra superior y el cajón a 390 llegan en T-9.
export default function Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  // /tours y /tours/:id marcan "Tours".
  const isActive = (path) => (path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Box
        component="nav"
        aria-label="Principal"
        sx={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          width: SIDEBAR_WIDTH,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'bg.surface',
          borderRight: '1px solid',
          borderColor: 'border.subtle',
        }}
      >
        <Box sx={{ p: 3 }}>
          <img src={logo} alt="Tropical Vitamin" width={104} style={{ display: 'block' }} />
        </Box>
        <Box component="ul" sx={{ listStyle: 'none', px: 1.5, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {menuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <li key={item.path}>
                <Box
                  component={Link}
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    minHeight: 40,
                    px: 1.5,
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: 15,
                    fontWeight: active ? 600 : 400,
                    color: active ? 'primary.main' : 'text.secondary',
                    bgcolor: active ? 'bg.selected' : 'transparent',
                    '&:hover': active ? undefined : { bgcolor: 'bg.raised', color: 'text.primary' },
                  }}
                >
                  {item.text}
                </Box>
              </li>
            );
          })}
        </Box>
        <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'border.subtle' }}>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', px: 1.5, py: 1 }}>
            {user?.email}
          </Typography>
          <Button variant="text" onClick={handleLogout} sx={{ width: '100%', justifyContent: 'flex-start', px: 1.5, color: 'text.secondary' }}>
            Cerrar sesión
          </Button>
        </Box>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, ml: `${SIDEBAR_WIDTH}px`, minWidth: 0, p: 4 }}>
        <Box sx={{ maxWidth: 1200 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
