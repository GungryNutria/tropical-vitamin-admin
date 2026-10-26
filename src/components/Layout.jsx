import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Box, Button, Drawer, IconButton, Typography } from '@mui/material';
import Close from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../lib/useIsMobile';
import logo from '../assets/logo.png';

const SIDEBAR_WIDTH = 232;
const TOPBAR_HEIGHT = 56;

const menuItems = [
  { text: 'Inicio', path: '/' },
  { text: 'Tours', path: '/tours' },
  { text: 'Categorías', path: '/categories' },
  { text: 'Idiomas', path: '/languages' },
];

// /tours y /tours/:id marcan "Tours".
const isActive = (pathname, path) => (path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`));

function MenuList({ pathname, tall, onNavigate }) {
  return (
    <Box component="ul" sx={{ listStyle: 'none', px: 1.5, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {menuItems.map((item) => {
        const active = isActive(pathname, item.path);
        return (
          <li key={item.path}>
            <Box
              component={Link}
              to={item.path}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              sx={{
                display: 'flex',
                alignItems: 'center',
                minHeight: tall ? 52 : 40,
                px: tall ? 2 : 1.5,
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: tall ? 17 : 15,
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
  );
}

function AccountFooter({ user, onLogout, tall }) {
  return (
    <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'border.subtle' }}>
      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', px: tall ? 2 : 1.5, py: 1 }}>
        {user?.email}
      </Typography>
      <Button
        variant="text"
        onClick={onLogout}
        sx={{ width: '100%', justifyContent: 'flex-start', px: tall ? 2 : 1.5, height: tall ? 52 : undefined, fontSize: tall ? 15 : undefined, color: 'text.secondary' }}
      >
        Cerrar sesión
      </Button>
    </Box>
  );
}

// 1440: menú plano de 232 px con correo y "Cerrar sesión" al pie (handoff R1 sección 3).
// Menos de 900 px: barra superior de 56 px con el botón de menú (44x44), el título de la vista y,
// si la vista la pide, su acción principal (portal en `topbarSlot`); el menú abre en un cajón de pantalla completa.
export default function Layout() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const mobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [topbarSlot, setTopbarSlot] = useState(null);

  // Si la ventana crece con el cajón abierto, se cierra.
  if (!mobile && drawerOpen) setDrawerOpen(false);

  // PrivateRoute manda al login al quedar sin sesión.
  const handleLogout = () => logout();

  if (mobile) {
    const title = menuItems.find((item) => isActive(pathname, item.path))?.text ?? 'Tropical Vitamin';
    return (
      <Box sx={{ minHeight: '100vh' }}>
        <Box
          component="header"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: (t) => t.zIndex.appBar,
            height: TOPBAR_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            pl: 1,
            pr: 2,
            bgcolor: 'bg.surface',
            borderBottom: '1px solid',
            borderColor: 'border.subtle',
          }}
        >
          <IconButton aria-label="Abrir menú" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}>
            <MenuIcon />
          </IconButton>
          <Typography component="p" sx={{ flex: 1, minWidth: 0, fontSize: 16, lineHeight: '24px', fontWeight: 600 }} noWrap>
            {title}
          </Typography>
          <Box ref={setTopbarSlot} sx={{ display: 'flex' }} />
        </Box>
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          slotProps={{ paper: { sx: { width: '100%', bgcolor: 'bg.surface', backgroundImage: 'none' }, 'aria-label': 'Menú' } }}
        >
          <Box component="nav" aria-label="Principal" sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ height: TOPBAR_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pl: 2.5, pr: 1 }}>
              <img src={logo} alt="Tropical Vitamin" width={90} style={{ display: 'block' }} />
              <IconButton aria-label="Cerrar menú" onClick={() => setDrawerOpen(false)}>
                <Close />
              </IconButton>
            </Box>
            <MenuList pathname={pathname} tall onNavigate={() => setDrawerOpen(false)} />
            <AccountFooter user={user} onLogout={handleLogout} tall />
          </Box>
        </Drawer>
        <Box component="main" sx={{ minWidth: 0, p: 2 }}>
          <Outlet context={{ mobile, topbarSlot }} />
        </Box>
      </Box>
    );
  }

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
        <MenuList pathname={pathname} />
        <AccountFooter user={user} onLogout={handleLogout} />
      </Box>
      <Box component="main" sx={{ flexGrow: 1, ml: `${SIDEBAR_WIDTH}px`, minWidth: 0, p: 4 }}>
        <Box sx={{ maxWidth: 1200 }}>
          <Outlet context={{ mobile, topbarSlot: null }} />
        </Box>
      </Box>
    </Box>
  );
}
