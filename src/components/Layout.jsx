import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Attractions as AttractionsIcon,
  Category as CategoryIcon,
  Translate as TranslateIcon,
  Logout as LogoutIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 240;

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [toursExpanded, setToursExpanded] = useState(true);

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Idiomas', icon: <TranslateIcon />, path: '/languages' },
  ];

  const toursSubmenu = [
    { text: 'Tours', path: '/tours' },
    { text: 'Categorías', path: '/categories' },
  ];

  const isActive = (path) => location.pathname === path;
  const isToursActive = location.pathname.startsWith('/tours') || location.pathname.startsWith('/categories');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{ 
          width: `calc(100% - ${drawerWidth}px)`, 
          ml: `${drawerWidth}px`,
          backgroundColor: '#141414',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ color: '#F4B942' }}>
            Tropical Vitamin Admin
          </Typography>
          <Typography variant="body2" sx={{ ml: 'auto', color: '#A0A0A0' }}>
            {user?.email}
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: '#0A0A0A',
            borderRight: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={isActive(item.path)}
                  onClick={() => navigate(item.path)}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(244, 185, 66, 0.1)',
                      borderRight: '3px solid #F4B942',
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(244, 185, 66, 0.05)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: isActive(item.path) ? '#F4B942' : '#A0A0A0' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    sx={{ color: isActive(item.path) ? '#FAFAFA' : '#A0A0A0' }}
                  />
                </ListItemButton>
              </ListItem>
            ))}

            {/* Tours submenu */}
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => setToursExpanded(!toursExpanded)}
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(244, 185, 66, 0.05)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: isToursActive ? '#F4B942' : '#A0A0A0' }}>
                  <AttractionsIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Tours" 
                  sx={{ color: isToursActive ? '#FAFAFA' : '#A0A0A0' }}
                />
                {toursExpanded ? (
                  <ExpandLessIcon sx={{ color: '#A0A0A0' }} />
                ) : (
                  <ExpandMoreIcon sx={{ color: '#A0A0A0' }} />
                )}
              </ListItemButton>
            </ListItem>
            
            <Collapse in={toursExpanded} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {toursSubmenu.map((item) => (
                  <ListItemButton
                    key={item.text}
                    selected={isActive(item.path)}
                    onClick={() => navigate(item.path)}
                    sx={{
                      pl: 4,
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(244, 185, 66, 0.1)',
                        borderRight: '3px solid #F4B942',
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(244, 185, 66, 0.05)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: isActive(item.path) ? '#F4B942' : '#A0A0A0' }}>
                      <CategoryIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.text} 
                      sx={{ color: isActive(item.path) ? '#FAFAFA' : '#A0A0A0' }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          </List>
          <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={handleLogout}>
                <ListItemIcon sx={{ color: '#A0A0A0' }}>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Cerrar sesión" sx={{ color: '#A0A0A0' }} />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, backgroundColor: '#0A0A0A', minHeight: '100vh' }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}